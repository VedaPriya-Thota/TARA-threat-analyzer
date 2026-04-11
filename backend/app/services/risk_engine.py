def calculate_risk(threats):

    risk_scores = []

    likelihood_map = {
        "High": 5,
        "Medium": 3,
        "Low": 1
    }

    impact_map = {
        "Injection": 5,
        "Authentication": 4,
        "Access Control": 3,
        "General": 2
    }

    for threat in threats:

        likelihood = likelihood_map.get(threat["risk_level"], 1)
        impact = impact_map.get(threat["category"], 1)

        risk_score = likelihood * impact

        threat["risk_score"] = risk_score

        risk_scores.append(threat)

    return risk_scores