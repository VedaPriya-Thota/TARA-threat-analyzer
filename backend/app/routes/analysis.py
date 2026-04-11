import json
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import AnalysisResult
from app.llm.llm_client import analyze_with_llm

router = APIRouter(prefix="/analysis", tags=["Threat Analysis"])


# =========================
# 🔍 Analyze System (POST)
# =========================
@router.post("/")
def analyze_system(data: dict, db: Session = Depends(get_db)):

    system_description = data.get("system_description")

    if not system_description:
        return {"error": "system_description is required"}

    threats = analyze_with_llm(system_description)

    results = []

    for threat in threats:
        stride     = threat.get("stride", "Tampering")
        likelihood = threat.get("likelihood", "Medium")
        impact     = threat.get("impact", "Medium")
        confidence = threat.get("confidence", None)

        # Dynamic risk scoring
        likelihood_map = {"High": 5, "Medium": 3, "Low": 1}
        impact_map     = {"High": 5, "Medium": 3, "Low": 1}

        l_score = likelihood_map.get(likelihood, 3)
        i_score = impact_map.get(impact, 3)
        score   = l_score * i_score

        if score >= 20:
            risk_level = "Critical"
        elif score >= 10:
            risk_level = "High"
        elif score >= 5:
            risk_level = "Medium"
        else:
            risk_level = "Low"

        mitigation = threat.get("mitigation", "Apply security best practices")

        # ── New enrichment fields ──
        why_flagged      = threat.get("why_flagged") or None
        attack_impact    = threat.get("attack_impact") or []
        mitigation_steps = threat.get("mitigation_steps") or []

        # Serialise lists to JSON strings for MySQL TEXT columns
        attack_impact_json    = json.dumps(attack_impact)    if attack_impact    else None
        mitigation_steps_json = json.dumps(mitigation_steps) if mitigation_steps else None

        db_record = AnalysisResult(
            system_description = system_description,
            threat             = threat.get("threat"),
            category           = threat.get("category"),
            stride             = stride,
            risk_level         = risk_level,
            likelihood         = likelihood,
            impact             = impact,
            risk_score         = score,
            confidence         = confidence,
            mitigation         = mitigation,
            why_flagged        = why_flagged,
            attack_impact      = attack_impact_json,
            mitigation_steps   = mitigation_steps_json,
        )
        db.add(db_record)

        results.append({
            "threat":            threat.get("threat"),
            "category":          threat.get("category"),
            "stride":            stride,
            "risk_level":        risk_level,
            "likelihood":        likelihood,
            "impact":            impact,
            "risk_score":        score,
            "confidence":        confidence,
            "mitigation":        mitigation,
            "why_flagged":       why_flagged,
            "attack_impact":     attack_impact,
            "mitigation_steps":  mitigation_steps,
        })

    db.commit()

    return {
        "system_description": system_description,
        "analysis": results,
    }


# =========================
# 📜 Get History (GET)
# =========================
def _parse_json_field(value):
    """Safely deserialise a JSON TEXT column; return [] on failure."""
    if not value:
        return []
    if isinstance(value, list):
        return value
    try:
        return json.loads(value)
    except Exception:
        return []


@router.get("/history")
def get_analysis_history(db: Session = Depends(get_db)):

    records = db.query(AnalysisResult).all()

    results = []
    for r in records:
        results.append({
            "system_description": r.system_description,
            "threat":             r.threat,
            "category":           r.category,
            "stride":             r.stride,
            "risk_level":         r.risk_level,
            "risk_score":         r.risk_score,
            "likelihood":         r.likelihood,
            "impact":             r.impact,
            "confidence":         r.confidence,
            "mitigation":         r.mitigation,
            "why_flagged":        r.why_flagged or None,
            "attack_impact":      _parse_json_field(r.attack_impact),
            "mitigation_steps":   _parse_json_field(r.mitigation_steps),
        })

    return results


# =========================
# 🗑️ Clear History (DELETE)
# =========================
@router.delete("/history")
def clear_analysis_history(db: Session = Depends(get_db)):
    try:
        db.query(AnalysisResult).delete()
        db.commit()
        return {"message": "History cleared successfully"}
    except Exception as e:
        db.rollback()
        return {"error": str(e)}
