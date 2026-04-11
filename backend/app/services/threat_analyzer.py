from app.llm.llm_client import analyze_with_llm
import json


def analyze_threats(system_description: str):

    try:

        llm_result = analyze_with_llm(system_description)

        threats = json.loads(llm_result)

        return threats

    except Exception:

        # fallback rule-based analysis
        threats = []

        text = system_description.lower()

        if "database" in text:
            threats.append({
                "threat": "SQL Injection",
                "category": "Injection",
                "risk_level": "High"
            })

        if "login" in text or "authentication" in text:
            threats.append({
                "threat": "Credential Brute Force",
                "category": "Authentication",
                "risk_level": "Medium"
            })

        if "api" in text:
            threats.append({
                "threat": "API Abuse",
                "category": "Access Control",
                "risk_level": "Medium"
            })

        return threats