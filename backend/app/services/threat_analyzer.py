from app.llm.llm_client import analyze_with_llm


def analyze_threats(system_description: str):
    """
    Thin wrapper around the LLM client.
    Returns a list of threat dicts — already normalised by llm_client.
    """
    try:
        result = analyze_with_llm(system_description)
        if isinstance(result, list):
            return result
        return []
    except Exception:
        # Rule-based fallback
        threats = []
        text = system_description.lower()

        if "database" in text:
            threats.append({
                "threat": "SQL Injection",
                "category": "Injection",
                "risk_level": "High",
                "stride": "Tampering",
                "likelihood": "High",
                "impact": "High",
                "confidence": 85,
                "mitigation": "Use parameterized queries",
                "why_flagged": None,
                "attack_impact": [],
                "mitigation_steps": [],
            })

        if "login" in text or "authentication" in text:
            threats.append({
                "threat": "Credential Brute Force",
                "category": "Authentication",
                "risk_level": "Medium",
                "stride": "Spoofing",
                "likelihood": "Medium",
                "impact": "Medium",
                "confidence": 75,
                "mitigation": "Enforce MFA and rate limiting",
                "why_flagged": None,
                "attack_impact": [],
                "mitigation_steps": [],
            })

        if "api" in text:
            threats.append({
                "threat": "API Abuse",
                "category": "Access Control",
                "risk_level": "Medium",
                "stride": "Elevation of Privilege",
                "likelihood": "Medium",
                "impact": "Medium",
                "confidence": 70,
                "mitigation": "Implement rate limiting and proper auth checks",
                "why_flagged": None,
                "attack_impact": [],
                "mitigation_steps": [],
            })

        return threats
