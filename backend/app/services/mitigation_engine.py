def suggest_mitigation(threats):

    mitigations = {
        "SQL Injection": "Use prepared statements and input validation",
        "Credential Brute Force": "Implement rate limiting and account lockout",
        "API Abuse": "Use authentication tokens and request throttling",
        "Unknown Threat": "Perform security audit"
    }

    for threat in threats:

        threat_name = threat["threat"]

        threat["mitigation"] = mitigations.get(
            threat_name,
            "Apply standard security practices"
        )

    return threats