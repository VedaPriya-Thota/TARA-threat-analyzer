# ─────────────────────────────────────────────────────────────────────────────
# services/risk_engine.py — Static risk score calculator (legacy)
#
# This module provided the original risk scoring logic before dynamic
# likelihood × impact scoring was moved into routes/analysis.py.
#
# How it works:
#   - Maps risk_level (High/Medium/Low) to a numeric likelihood score
#   - Maps threat category (Injection, Authentication, etc.) to an impact score
#   - Multiplies the two scores to produce a final risk_score
#
# Note: The active scoring logic now lives in routes/analysis.py using the
# LLM-returned likelihood and impact fields directly. This module is kept
# as a reference and legacy fallback only.
# ─────────────────────────────────────────────────────────────────────────────

def calculate_risk(threats):
    """
    Compute and attach a numeric risk_score to each threat dict.
    Uses the threat's risk_level as the likelihood proxy and its
    category as the impact proxy, then multiplies them together.
    Mutates and returns the threats list.
    """

    risk_scores = []

    # Maps risk_level string to a numeric likelihood score
    likelihood_map = {
        "High": 5,
        "Medium": 3,
        "Low": 1
    }

    # Maps threat category string to a numeric impact score
    impact_map = {
        "Injection": 5,
        "Authentication": 4,
        "Access Control": 3,
        "General": 2
    }

    for threat in threats:

        # Fall back to 1 if the value is not in the map
        likelihood = likelihood_map.get(threat["risk_level"], 1)
        impact = impact_map.get(threat["category"], 1)

        risk_score = likelihood * impact  # simple multiplicative scoring model

        threat["risk_score"] = risk_score

        risk_scores.append(threat)

    return risk_scores