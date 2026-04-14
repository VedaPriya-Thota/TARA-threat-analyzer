# ─────────────────────────────────────────────────────────────────────────────
# llm/llm_client.py — Core LLM inference engine for text-based threat analysis
#
# This is the main AI brain of TARA. It handles all text-based threat analysis
# (plain descriptions and user stories) through a three-tier fallback pipeline:
#
#   1. GROQ (primary)     : calls the llama-3.3-70b-versatile model via the Groq
#                           cloud API for fast, high-quality inference
#   2. Ollama (secondary) : falls back to a locally running llama3.2:1b model if
#                           GROQ is unavailable or returns an error
#   3. Local engine       : pure rule-based threats keyed to the detected system
#                           context (Financial, IoT, Cloud, API, General) —
#                           requires no external service
#
# User story detection:
#   - is_user_story() checks the input for user story patterns ("As a ...",
#     "I want to ...", "Given ...", etc.)
#   - If detected, call_groq_user_story() runs a shift-left security review
#     focused on authorization, business logic, and repudiation risks
#   - Falls back to _user_story_fallback() which generates rule-based threats
#     for authorization, repudiation, input validation, and rate limiting
#
# Utility functions shared with file_analyzer.py and url_analyzer.py:
#   - detect_context()    : infers system type from keywords in the description
#   - map_stride()        : maps a threat name to the most likely STRIDE category
#   - extract_json()      : robustly parses JSON from LLM output (handles markdown)
#   - normalize_threat()  : validates and fills missing fields in a threat dict,
#                           ensures why_flagged, attack_impact, and
#                           mitigation_steps are always populated lists/strings
# ─────────────────────────────────────────────────────────────────────────────

import os
import json
import re
from pathlib import Path
from dotenv import load_dotenv
from groq import Groq
import requests

# =========================
# LOAD .ENV
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
        print("[GROQ INIT ERROR]", e)


# =========================
# 🔍 DETECT INPUT TYPE
# =========================
_USER_STORY_RE = re.compile(
    r"(?i)(as\s+a\s+\w|i\s+want\s+to|so\s+that\s+|given\s+|when\s+i\s+|user\s+story|feature\s+request|requirement[:\s])",
)

def is_user_story(text: str) -> bool:
    """Return True when the input looks like a user story or functional requirement."""
    return bool(_USER_STORY_RE.search(text))


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
        print("[GROQ RAW]:", text[:200])

        result = extract_json(text)

        if result:
            result = [normalize_threat(item) for item in result]

        return result

    except Exception as e:
        print("[GROQ ERROR]:", e)
        return None


# =========================
# USER STORY SECURITY REVIEW
# =========================
def call_groq_user_story(user_story: str) -> list[dict] | None:
    """Shift-left security review of a user story or functional requirement."""
    if not groq_client:
        return None

    prompt = f"""You are a senior application security engineer performing a shift-left security review.

User Story / Functional Requirement:
\"\"\"{user_story}\"\"\"

Analyze this user story for security risks across:
- Authentication & identity verification
- Authorization & access control (who can perform the action, on whose data)
- Workflow abuse & business logic flaws (can the flow be misused or replayed?)
- Input validation & injection risks
- Sensitive data exposure (what data is accessed, stored, or transmitted?)
- Repudiation (is the action auditable? can users deny it?)
- Race conditions or TOCTOU issues in the described workflow

Return 3-6 realistic, SPECIFIC threats tied to the described user story.
Each threat must reference the exact role, action, or technology named in the story.

Return ONLY a valid JSON array — no markdown, no explanation, no code fences.

Each element MUST contain exactly these fields:
{{
  "threat": "concise threat name tied to the story",
  "category": "e.g. Authorization, Business Logic, Input Validation, Data Exposure, Repudiation",
  "stride": "one of: Spoofing | Tampering | Repudiation | Information Disclosure | Denial of Service | Elevation of Privilege",
  "likelihood": "High | Medium | Low",
  "impact": "High | Medium | Low",
  "confidence": <integer 0-100>,
  "why_flagged": "1-2 sentences explaining why this user story introduces this specific risk",
  "attack_impact": [
    "concrete consequence 1 if exploited",
    "concrete consequence 2 if exploited",
    "concrete consequence 3 if exploited"
  ],
  "mitigation_steps": [
    "Actionable step 1 referencing the story's role/action/technology",
    "Actionable step 2",
    "Actionable step 3"
  ],
  "mitigation": "one-sentence primary mitigation"
}}

Rules:
- why_flagged must reference the role, action, or goal from the user story
- attack_impact must describe real business consequences (data breach, fraud, account takeover, etc.)
- mitigation_steps must be implementation-ready developer actions
- Do NOT return generic threats unrelated to the story
- Return only the JSON array, nothing else
"""

    try:
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are a security engineer doing shift-left threat modeling. Return only valid JSON arrays. No markdown. No explanation."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.3,
            max_tokens=2500,
        )
        text   = response.choices[0].message.content
        print("[GROQ USER STORY RAW]:", text[:200])
        result = extract_json(text)
        if result:
            return [normalize_threat(item) for item in result]
        return None
    except Exception as e:
        print("[GROQ USER STORY ERROR]:", e)
        return None


def _user_story_fallback(user_story: str) -> list[dict]:
    """Rule-based fallback threats for user story review."""
    text = user_story.lower()
    threats = []

    # Authorization
    threats.append(normalize_threat({
        "threat":           "Missing object-level authorization check",
        "category":         "Authorization",
        "stride":           "Elevation of Privilege",
        "likelihood":       "High",
        "impact":           "High",
        "confidence":       80,
        "why_flagged":      "User story involves accessing or modifying a resource — without per-object checks any authenticated user may access another user's data.",
        "attack_impact":    ["Horizontal privilege escalation to other users' records", "Data exposure of sensitive user information", "Regulatory violation (GDPR/HIPAA)"],
        "mitigation_steps": ["Verify the requesting user owns or is authorized for the target resource before every operation", "Use parameterized ownership queries (e.g. WHERE user_id = :current_user AND id = :resource_id)", "Return 403 — not 404 — on authorization failure to avoid information leakage"],
        "mitigation":       "Enforce object-level authorization on every resource access",
    }))

    # Repudiation
    threats.append(normalize_threat({
        "threat":           "Insufficient audit trail for sensitive action",
        "category":         "Repudiation",
        "stride":           "Repudiation",
        "likelihood":       "Medium",
        "impact":           "Medium",
        "confidence":       75,
        "why_flagged":      "The described action changes state or accesses sensitive data — without an audit log users can deny performing it.",
        "attack_impact":    ["Users can deny performing the action in disputes", "Forensic investigation is impossible after an incident", "Compliance requirements unmet"],
        "mitigation_steps": ["Log actor ID, timestamp, action type, and target resource for every state-changing operation", "Store audit logs in an append-only store separate from the application database", "Include IP address and session ID for correlation"],
        "mitigation":       "Add an immutable audit log for every state-changing operation",
    }))

    # Input validation
    if any(w in text for w in ["input", "form", "upload", "enter", "submit", "type", "search", "field"]):
        threats.append(normalize_threat({
            "threat":           "Insufficient input validation enabling injection",
            "category":         "Input Validation",
            "stride":           "Tampering",
            "likelihood":       "Medium",
            "impact":           "High",
            "confidence":       78,
            "why_flagged":      "The user story involves user-supplied input that flows into storage or processing — without strict validation, injection payloads can reach the backend.",
            "attack_impact":    ["SQL or NoSQL injection leading to data exfiltration", "XSS payload stored and executed in other users' browsers", "Business logic bypass via malformed values"],
            "mitigation_steps": ["Validate all inputs against a strict schema (type, length, format, allowlist)", "Use parameterized queries or an ORM that prevents SQL injection", "Encode outputs in the appropriate context (HTML, JSON, URL)"],
            "mitigation":       "Validate and sanitize all user inputs before processing",
        }))

    # Workflow abuse
    threats.append(normalize_threat({
        "threat":           "Workflow abuse via missing rate limiting",
        "category":         "Business Logic",
        "stride":           "Denial of Service",
        "likelihood":       "Medium",
        "impact":           "Medium",
        "confidence":       72,
        "why_flagged":      "The described action can be repeated programmatically — without rate limiting it is vulnerable to abuse, enumeration, or resource exhaustion.",
        "attack_impact":    ["Credential stuffing or enumeration attacks", "Resource exhaustion degrading service for all users", "Spam or fraudulent submissions at scale"],
        "mitigation_steps": ["Apply per-user and per-IP rate limits on the endpoint backing this story", "Return 429 Too Many Requests with a Retry-After header", "Add CAPTCHA or proof-of-work for high-value actions (password reset, registration)"],
        "mitigation":       "Enforce rate limiting on the endpoint for this action",
    }))

    return threats


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
        print("[OLLAMA RAW]:", text[:200])

        result = extract_json(text)

        if result:
            result = [normalize_threat(item) for item in result]

        return result

    except Exception as e:
        print("[OLLAMA ERROR]:", e)
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
    print("INPUT:", system_description[:120])

    # ── Route user stories to the shift-left reviewer ──
    if is_user_story(system_description):
        print("[LLM] Detected user story — running shift-left review")
        result = call_groq_user_story(system_description)
        if result:
            print("[LLM] User story GROQ success")
            return result
        print("[LLM] User story GROQ failed — using rule-based fallback")
        return _user_story_fallback(system_description)

    # 1. GROQ
    print("[LLM] Trying GROQ...")
    result = call_groq(system_description)

    if result:
        print("[LLM] GROQ success")
        return result

    # 2. OLLAMA
    print("[LLM] Trying OLLAMA...")
    result = call_ollama(system_description)

    if result:
        print("[LLM] OLLAMA success")
        return result

    # 3. LOCAL FALLBACK
    print("[LLM] Using local engine")
    return local_engine(system_description)
