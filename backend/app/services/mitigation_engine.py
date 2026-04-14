# ─────────────────────────────────────────────────────────────────────────────
# services/mitigation_engine.py — Static rule-based mitigation lookup (legacy)
#
# This module provides a simple keyword-to-mitigation mapping that was used
# as the original mitigation strategy before LLM-generated mitigations were
# introduced. It is kept for backward compatibility and as a last-resort
# fallback if the LLM does not return a mitigation field.
#
# Note: The primary mitigation strategy is now handled by the LLM inside
# llm_client.py — this module is no longer called in the main pipeline.
# ─────────────────────────────────────────────────────────────────────────────

def suggest_mitigation(threats):
    """
    For each threat in the list, attach a mitigation string looked up by
    threat name. Falls back to a generic message for unknown threat names.
    Mutates and returns the threats list.
    """

    # Static map of known threat names to their recommended mitigations
    mitigations = {
        "SQL Injection": "Use prepared statements and input validation",
        "Credential Brute Force": "Implement rate limiting and account lockout",
        "API Abuse": "Use authentication tokens and request throttling",
        "Unknown Threat": "Perform security audit"
    }

    for threat in threats:

        threat_name = threat["threat"]

        # Look up the mitigation; if not found, return a generic fallback
        threat["mitigation"] = mitigations.get(
            threat_name,
            "Apply standard security practices"
        )

    return threats