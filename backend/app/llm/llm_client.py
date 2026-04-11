import os
import json
import re
from pathlib import Path
from dotenv import load_dotenv
from groq import Groq
import requests

# =========================
# 🔥 LOAD .ENV
# =========================
env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

groq_key = os.getenv("GROQ_API_KEY")
print("LOADED GROQ KEY:", groq_key)

# =========================
# 🔥 INIT GROQ CLIENT
# =========================
groq_client = None
if groq_key:
    try:
        groq_client = Groq(api_key=groq_key)
    except Exception as e:
        print("❌ GROQ INIT ERROR:", e)


# =========================
# 🔍 DETECT SYSTEM TYPE
# =========================
def detect_context(system_description: str):
    desc = system_description.lower()

    if "bank" in desc or "payment" in desc:
        return "FINANCIAL SYSTEM"
    elif "iot" in desc or "sensor" in desc:
        return "IOT SYSTEM"
    elif "cloud" in desc or "aws" in desc:
        return "CLOUD SYSTEM"
    elif "api" in desc:
        return "API-BASED SYSTEM"
    else:
        return "GENERAL SOFTWARE SYSTEM"


# =========================
# 🔐 STRIDE MAPPING
# =========================
def map_stride(threat_name: str):
    t = threat_name.lower()

    if "spoof" in t or "impersonation" in t:
        return "Spoofing"
    elif "tamper" in t or "injection" in t:
        return "Tampering"
    elif "repudiation" in t:
        return "Repudiation"
    elif "leak" in t or "exposure" in t:
        return "Information Disclosure"
    elif "dos" in t or "denial" in t:
        return "Denial of Service"
    elif "privilege" in t or "escalation" in t:
        return "Elevation of Privilege"

    return "Tampering"


# =========================
# 📦 JSON PARSER
# =========================
def extract_json(text):
    try:
        return json.loads(text)
    except:
        pass

    match = re.search(r"\[.*\]", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except:
            pass

    return None


# =========================
# 🔧 NORMALIZE THREAT FIELDS
# Ensures new fields are always lists/strings, never None
# =========================
def normalize_threat(item: dict) -> dict:
    """Normalize and validate all fields in a threat dict."""

    # Ensure STRIDE
    if not item.get("stride"):
        item["stride"] = map_stride(item.get("threat", ""))

    # Normalize why_flagged → always a non-empty string
    why = item.get("why_flagged", "")
    if not isinstance(why, str) or not why.strip():
        item["why_flagged"] = (
            f"This threat is relevant because the system exposes "
            f"{item.get('category', 'a component')} to {item.get('stride', 'attack')} attacks."
        )
    else:
        item["why_flagged"] = why.strip()

    # Normalize attack_impact → always a list of strings
    raw_impact = item.get("attack_impact", [])
    if isinstance(raw_impact, str):
        # LLM returned a plain string — split on newlines or semicolons
        parts = re.split(r"[\n;]", raw_impact)
        raw_impact = [p.strip().lstrip("•-* ") for p in parts if p.strip()]
    if not isinstance(raw_impact, list) or not raw_impact:
        raw_impact = [
            "Unauthorized access to sensitive data",
            "Service disruption or data integrity loss",
        ]
    item["attack_impact"] = [str(s).strip() for s in raw_impact if str(s).strip()][:4]

    # Normalize mitigation_steps → always a list of strings
    raw_steps = item.get("mitigation_steps", [])
    if isinstance(raw_steps, str):
        parts = re.split(r"[\n;]", raw_steps)
        raw_steps = [p.strip().lstrip("•-*0123456789. ") for p in parts if p.strip()]
    if not isinstance(raw_steps, list) or not raw_steps:
        # Fall back to splitting the plain mitigation string
        plain = item.get("mitigation", "")
        if plain:
            raw_steps = [plain]
        else:
            raw_steps = ["Apply security best practices for this component."]
    item["mitigation_steps"] = [str(s).strip() for s in raw_steps if str(s).strip()][:6]

    # Keep backward-compat plain mitigation string
    if not item.get("mitigation"):
        item["mitigation"] = ". ".join(item["mitigation_steps"][:2])

    return item


# =========================
# 🤖 GROQ CALL (PRIMARY)
# =========================
def call_groq(system_description):

    if not groq_client:
        return None

    context = detect_context(system_description)

    prompt = f"""You are a senior application security engineer performing a formal threat model.

System Type: {context}
System Description: {system_description}

Analyze the system and return 3-5 realistic, specific threats using the STRIDE model.
Tailor every field to the actual technology stack and components described.

Return ONLY a valid JSON array — no markdown, no explanation, no code fences.

Each element MUST contain exactly these fields:
{{
  "threat": "concise threat name",
  "category": "threat category (e.g. Injection, Authentication, Access Control, Cryptography)",
  "stride": "one of: Spoofing | Tampering | Repudiation | Information Disclosure | Denial of Service | Elevation of Privilege",
  "likelihood": "High | Medium | Low",
  "impact": "High | Medium | Low",
  "confidence": <integer 0-100>,
  "why_flagged": "1-2 sentences explaining why this specific system is vulnerable to this threat based on its architecture",
  "attack_impact": [
    "specific consequence 1 if exploited",
    "specific consequence 2 if exploited",
    "specific consequence 3 if exploited"
  ],
  "mitigation_steps": [
    "Actionable step 1 referencing the specific stack/component",
    "Actionable step 2",
    "Actionable step 3"
  ],
  "mitigation": "one-sentence summary of mitigations"
}}

Rules:
- why_flagged must reference the actual system components (e.g. JWT, Redis, MySQL)
- attack_impact must be concrete security consequences, not vague statements
- mitigation_steps must be implementation-ready (e.g. \"Add rate limiting via Redis INCR with TTL on the /login endpoint\")
- Return only the JSON array, nothing else
"""

    try:
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are a cybersecurity expert. Return only valid JSON arrays. No markdown. No explanation."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
        )

        text = response.choices[0].message.content
        print("🧠 GROQ RAW:\n", text)

        result = extract_json(text)

        if result:
            result = [normalize_threat(item) for item in result]

        return result

    except Exception as e:
        print("❌ GROQ ERROR:", e)
        return None


# =========================
# 🤖 OLLAMA CALL (FALLBACK)
# =========================
def call_ollama(system_description):

    context = detect_context(system_description)

    prompt = f"""Analyze this system and generate threats using STRIDE.

System Type: {context}
System: {system_description}

Return ONLY a JSON array. Each object must contain:
threat, category, stride, likelihood (High/Medium/Low), impact (High/Medium/Low),
confidence (0-100), why_flagged (string), attack_impact (array of strings),
mitigation_steps (array of strings), mitigation (string).
"""

    try:
        res = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": "llama3.2:1b",
                "prompt": prompt,
                "stream": False
            }
        )

        text = res.json().get("response", "")
        print("🖥️ OLLAMA RAW:\n", text)

        result = extract_json(text)

        if result:
            result = [normalize_threat(item) for item in result]

        return result

    except Exception as e:
        print("❌ OLLAMA ERROR:", e)
        return None


# =========================
# ⚡ LOCAL FALLBACK ENGINE
# =========================
def local_engine(system_description):

    context = detect_context(system_description)
    desc = system_description

    if context == "FINANCIAL SYSTEM":
        return [
            normalize_threat({
                "threat": "SQL Injection in transaction APIs",
                "category": "Injection",
                "stride": "Tampering",
                "likelihood": "High",
                "impact": "High",
                "confidence": 95,
                "why_flagged": f"The system processes financial transactions via APIs that likely construct dynamic SQL queries, making it vulnerable to injection if inputs are not parameterized.",
                "attack_impact": [
                    "Attacker can read or modify all transaction records",
                    "Account balances can be manipulated or zeroed",
                    "PII and payment data exfiltrated in bulk",
                ],
                "mitigation_steps": [
                    "Use parameterized queries or ORM throughout all transaction endpoints",
                    "Apply input validation and allowlist on all financial API parameters",
                    "Enable WAF rules targeting SQLi patterns in front of the API gateway",
                    "Audit all raw SQL usage in the codebase with a SAST tool",
                ],
                "mitigation": "Use parameterized queries and enable WAF rules",
            }),
            normalize_threat({
                "threat": "Credential stuffing via login endpoint",
                "category": "Authentication",
                "stride": "Spoofing",
                "likelihood": "High",
                "impact": "Medium",
                "confidence": 88,
                "why_flagged": "Financial systems are high-value targets for credential stuffing; the login endpoint is exposed and likely lacks rate limiting.",
                "attack_impact": [
                    "Account takeover of customers with reused credentials",
                    "Unauthorized fund transfers or payments initiated",
                    "Regulatory breach requiring mandatory disclosure",
                ],
                "mitigation_steps": [
                    "Enforce MFA (TOTP or SMS) for all customer accounts",
                    "Implement IP-based rate limiting (max 5 attempts/min) on /login",
                    "Integrate with HaveIBeenPwned API to reject known breached passwords",
                    "Add CAPTCHA after 3 failed attempts",
                ],
                "mitigation": "Enforce MFA and rate-limit the login endpoint",
            }),
        ]

    elif context == "IOT SYSTEM":
        return [
            normalize_threat({
                "threat": "Device identity spoofing",
                "category": "IoT Security",
                "stride": "Spoofing",
                "likelihood": "High",
                "impact": "High",
                "confidence": 90,
                "why_flagged": "IoT devices often rely on shared or static credentials, making it trivial for a rogue device to impersonate a legitimate sensor.",
                "attack_impact": [
                    "Rogue device injects false sensor readings into the system",
                    "Attacker gains persistent foothold in the device network",
                    "Safety-critical actuators could be triggered by spoofed commands",
                ],
                "mitigation_steps": [
                    "Provision each device with a unique X.509 certificate at manufacturing",
                    "Use mutual TLS (mTLS) for all device-to-cloud communication",
                    "Implement device attestation using TPM or secure element",
                ],
                "mitigation": "Use per-device certificates and mutual TLS",
            }),
        ]

    return [
        normalize_threat({
            "threat": "Insufficient input validation",
            "category": "Input Handling",
            "stride": "Tampering",
            "likelihood": "Medium",
            "impact": "Medium",
            "confidence": 75,
            "why_flagged": "The system accepts user-supplied input that may not be validated, enabling injection or malformed-data attacks.",
            "attack_impact": [
                "Malformed data corrupts application state",
                "Injection payloads reach downstream services",
            ],
            "mitigation_steps": [
                "Apply strict schema validation (e.g. Pydantic, Zod) on all input surfaces",
                "Reject and log all requests that fail validation before processing",
            ],
            "mitigation": "Apply strict schema validation on all inputs",
        })
    ]


# =========================
# 🚀 MAIN FUNCTION
# =========================
def analyze_with_llm(system_description: str):

    print("\n==============================")
    print("INPUT:", system_description)

    # 1️⃣ GROQ
    print("➡️ TRYING GROQ...")
    result = call_groq(system_description)

    if result:
        print("✅ GROQ SUCCESS")
        return result

    # 2️⃣ OLLAMA
    print("➡️ TRYING OLLAMA...")
    result = call_ollama(system_description)

    if result:
        print("✅ OLLAMA SUCCESS")
        return result

    # 3️⃣ LOCAL FALLBACK
    print("⚡ USING LOCAL ENGINE")
    return local_engine(system_description)
