# ─────────────────────────────────────────────────────────────────────────────
# routes/analysis.py — API routes for all threat analysis operations
#
# Base path: /analysis
#
# Endpoints:
#   POST   /analysis/         — Text-based analysis: accepts a system description
#                               string, calls the LLM pipeline, persists results
#   POST   /analysis/upload   — File-based analysis: accepts an uploaded file
#                               (YAML / JSON / TXT / LOG), extracts hints, calls LLM
#   POST   /analysis/url      — URL surface analysis: fetches metadata from a URL
#                               or GitHub repo and runs LLM-based threat analysis
#   GET    /analysis/history  — Returns all stored threat records from the DB
#   DELETE /analysis/history  — Clears all threat history from the DB
#
# Shared helper functions (_parse_json_field, _score_to_risk, _score_to_priority,
# _build_result_dict, _persist_threat) are used across all three analysis routes
# to avoid duplication in scoring, DB persistence, and response building.
# ─────────────────────────────────────────────────────────────────────────────

import json
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import AnalysisResult
from app.llm.llm_client import analyze_with_llm
from app.llm.file_analyzer import (
    analyze_file_content,
    detect_file_type,
    SUPPORTED_EXTENSIONS,
    MAX_FILE_BYTES,
)
from app.llm.url_analyzer import analyze_url

router = APIRouter(prefix="/analysis", tags=["Threat Analysis"])


# ─────────────────────────────────────────────
# SHARED HELPERS
# ─────────────────────────────────────────────

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


def _score_to_risk(score: int) -> str:
    if score >= 20:  return "Critical"
    if score >= 10:  return "High"
    if score >= 5:   return "Medium"
    return "Low"


def _score_to_priority(score: int) -> str:
    if score >= 20:  return "Immediate"
    if score >= 14:  return "High"
    if score >= 8:   return "Moderate"
    return "Low"


def _build_result_dict(threat: dict, risk_level: str, score: int,
                        source_filename: str | None = None,
                        source_url: str | None = None) -> dict:
    """Build the API response dict for one threat."""
    return {
        "threat":               threat.get("threat"),
        "category":             threat.get("category"),
        "stride":               threat.get("stride", "Tampering"),
        "risk_level":           risk_level,
        "likelihood":           threat.get("likelihood", "Medium"),
        "impact":               threat.get("impact", "Medium"),
        "risk_score":           score,
        "confidence":           threat.get("confidence"),
        "mitigation":           threat.get("mitigation", "Apply security best practices"),
        "why_flagged":          threat.get("why_flagged") or None,
        "attack_impact":        threat.get("attack_impact") or [],
        "mitigation_steps":     threat.get("mitigation_steps") or [],
        "evidence":             threat.get("evidence") or None,
        "mitigation_priority":  threat.get("mitigation_priority") or _score_to_priority(score),
        "source_filename":      source_filename,
        "source_url":           source_url,
    }


def _persist_threat(db: Session, system_description: str,
                     threat_dict: dict, score: int, risk_level: str,
                     source_filename: str | None = None,
                     source_url: str | None = None):
    """Write one threat row to analysis_results."""
    record = AnalysisResult(
        system_description  = system_description,
        threat              = threat_dict.get("threat"),
        category            = threat_dict.get("category"),
        stride              = threat_dict.get("stride", "Tampering"),
        risk_level          = risk_level,
        likelihood          = threat_dict.get("likelihood", "Medium"),
        impact              = threat_dict.get("impact", "Medium"),
        risk_score          = score,
        confidence          = threat_dict.get("confidence"),
        mitigation          = threat_dict.get("mitigation", "Apply security best practices"),
        why_flagged         = threat_dict.get("why_flagged") or None,
        attack_impact       = json.dumps(threat_dict.get("attack_impact") or []),
        mitigation_steps    = json.dumps(threat_dict.get("mitigation_steps") or []),
        evidence            = threat_dict.get("evidence") or None,
        source_filename     = source_filename,
        source_url          = source_url,
        mitigation_priority = threat_dict.get("mitigation_priority") or _score_to_priority(score),
    )
    db.add(record)


# ─────────────────────────────────────────────
# POST /analysis/   — text-based analysis
# ─────────────────────────────────────────────

@router.post("/")
def analyze_system(data: dict, db: Session = Depends(get_db)):

    system_description = data.get("system_description")
    if not system_description:
        return {"error": "system_description is required"}

    threats = analyze_with_llm(system_description)
    results = []

    for threat in threats:
        likelihood = threat.get("likelihood", "Medium")
        impact     = threat.get("impact", "Medium")
        l_score    = {"High": 5, "Medium": 3, "Low": 1}.get(likelihood, 3)
        i_score    = {"High": 5, "Medium": 3, "Low": 1}.get(impact, 3)
        score      = l_score * i_score
        risk_level = _score_to_risk(score)

        _persist_threat(db, system_description, threat, score, risk_level)
        results.append(_build_result_dict(threat, risk_level, score))

    db.commit()
    return {"system_description": system_description, "analysis": results}


# ─────────────────────────────────────────────
# POST /analysis/upload   — file-based analysis
# ─────────────────────────────────────────────

@router.post("/upload")
async def analyze_file_upload(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    # ── Validate extension ──
    filename  = file.filename or "upload"
    ext       = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(sorted(SUPPORTED_EXTENSIONS))}",
        )

    # ── Read with size guard ──
    raw = await file.read(MAX_FILE_BYTES + 1)
    if len(raw) > MAX_FILE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum allowed size is {MAX_FILE_BYTES // 1024} KB.",
        )

    # ── Analyse ──
    file_type_label = detect_file_type(filename)
    threats, hints  = analyze_file_content(filename, raw)

    # ── Persist + build response ──
    results = []
    system_description = f"[File: {filename}] {file_type_label} security analysis"

    for threat in threats:
        likelihood = threat.get("likelihood", "Medium")
        impact     = threat.get("impact", "Medium")
        l_score    = {"High": 5, "Medium": 3, "Low": 1}.get(likelihood, 3)
        i_score    = {"High": 5, "Medium": 3, "Low": 1}.get(impact, 3)
        score      = l_score * i_score
        risk_level = _score_to_risk(score)

        _persist_threat(db, system_description, threat, score, risk_level, filename)
        results.append(_build_result_dict(threat, risk_level, score, filename))

    db.commit()

    return {
        "filename":    filename,
        "file_type":   file_type_label,
        "hints_found": len(hints),
        "hints":       hints,
        "analysis":    results,
    }


# ─────────────────────────────────────────────
# GET /analysis/history
# ─────────────────────────────────────────────

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
            "evidence":           r.evidence or None,
            "source_filename":    r.source_filename or None,
            "source_url":         r.source_url or None,
            "mitigation_priority": r.mitigation_priority or None,
        })
    return results


# ─────────────────────────────────────────────
# POST /analysis/url   — URL surface mapper
# ─────────────────────────────────────────────

@router.post("/url")
def analyze_url_endpoint(data: dict, db: Session = Depends(get_db)):
    url = (data.get("url") or "").strip()
    if not url:
        raise HTTPException(status_code=422, detail="url is required")
    if not url.startswith(("http://", "https://")):
        raise HTTPException(status_code=422, detail="url must start with http:// or https://")

    threats, surface_info, url_type = analyze_url(url)
    results = []
    system_description = f"[URL: {url}] {url_type} surface analysis"

    for threat in threats:
        likelihood = threat.get("likelihood", "Medium")
        impact     = threat.get("impact", "Medium")
        l_score    = {"High": 5, "Medium": 3, "Low": 1}.get(likelihood, 3)
        i_score    = {"High": 5, "Medium": 3, "Low": 1}.get(impact, 3)
        score      = l_score * i_score
        risk_level = _score_to_risk(score)

        _persist_threat(db, system_description, threat, score, risk_level, source_url=url)
        results.append(_build_result_dict(threat, risk_level, score, source_url=url))

    db.commit()

    return {
        "url":          url,
        "url_type":     url_type,
        "surface_info": surface_info,
        "analysis":     results,
    }


# ─────────────────────────────────────────────
# DELETE /analysis/history
# ─────────────────────────────────────────────

@router.delete("/history")
def clear_analysis_history(db: Session = Depends(get_db)):
    try:
        db.query(AnalysisResult).delete()
        db.commit()
        return {"message": "History cleared successfully"}
    except Exception as e:
        db.rollback()
        return {"error": str(e)}
