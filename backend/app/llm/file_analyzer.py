"""
file_analyzer.py
Handles file-based threat analysis:
  - File type detection
  - Content decoding
  - Security hint extraction (pre-LLM)
  - LLM prompt construction and call
  - Result normalization
"""

import re
import json

try:
    import yaml
    YAML_AVAILABLE = True
except ImportError:
    YAML_AVAILABLE = False

from app.llm.llm_client import groq_client, extract_json, normalize_threat, map_stride

# ─────────────────────────────────────────────
# CONSTANTS
# ─────────────────────────────────────────────

SUPPORTED_EXTENSIONS = {".yaml", ".yml", ".json", ".txt", ".log"}
MAX_CONTENT_CHARS = 4000   # truncate before sending to LLM
MAX_FILE_BYTES    = 512_000  # 512 KB hard limit

# Patterns applied to ALL file types
UNIVERSAL_PATTERNS: list[tuple[str, str]] = [
    (r'(?i)(password|passwd|pwd)\s*[:=]\s*["\']?(?!<)[^\s\'"<>{},\[\]]{3,}',  "Hardcoded password value"),
    (r'(?i)(api[_\-]?key|apikey)\s*[:=]\s*["\']?[^\s\'"<>{},\[\]]{8,}',        "Exposed API key"),
    (r'(?i)(secret[_\-]?key?|client[_\-]?secret)\s*[:=]\s*["\']?[^\s\'"<>{},\[\]]{5,}', "Hardcoded secret"),
    (r'(?i)(access[_\-]?token|auth[_\-]?token|bearer)\s*[:=]\s*["\']?[^\s\'"<>{},\[\]]{8,}', "Hardcoded token"),
    (r'(?i)debug\s*[:=]\s*(true|1|yes|on)',                                     "Debug mode enabled"),
    (r'(?i)(allow_?all|cors.*\*|\*.*origins?|origin.*\*)',                       "Wildcard CORS / open permissions"),
    (r'http://(?!localhost|127\.0\.0\.1|0\.0\.0\.0)[a-zA-Z0-9]',                "Insecure HTTP endpoint (non-local)"),
    (r'(?i)ssl\s*[:=]\s*(false|0|no|disabled)',                                  "SSL explicitly disabled"),
    (r'(?i)verify\s*[:=]\s*(false|0|no)',                                        "TLS certificate verification disabled"),
    (r'(?i)(private[_\-]?key|rsa[_\-]?key|-----BEGIN)',                          "Private key material present"),
    (r'(?i)(root|admin)\s*[:=]\s*["\'](?!<)[^\s\'"]{3,}',                       "Root/admin credential reference"),
]

# Extra patterns for log files
LOG_PATTERNS: list[tuple[str, str]] = [
    (r'(?i)(authentication failed|login failed|invalid (password|credentials)|bad credentials)', "Authentication failure events"),
    (r'(?i)(union\s+select|select\s+\*\s+from|drop\s+table|insert\s+into|--\s*$)',              "SQL injection attempt in logs"),
    (r'(?i)(<script[\s>]|javascript:|onerror\s*=|onload\s*=|alert\s*\()',                        "XSS payload in logs"),
    (r'(?i)(\.\.\/|%2e%2e|directory traversal)',                                                  "Path traversal attempt"),
    (r'(?i)(brute.?force|too many (login |auth )?attempts|account (locked|blocked))',             "Brute-force / lockout activity"),
    (r'(?i)(CVE-\d{4}-\d+)',                                                                       "Known CVE referenced"),
    (r'(?i)(403 Forbidden|401 Unauthorized|permission denied)',                                    "Access control rejection"),
]


# ─────────────────────────────────────────────
# FILE TYPE DETECTION
# ─────────────────────────────────────────────

def detect_file_type(filename: str) -> str:
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    mapping = {
        ".yaml": "YAML configuration",
        ".yml":  "YAML configuration",
        ".json": "JSON configuration",
        ".txt":  "Plain-text document",
        ".log":  "Log file",
    }
    return mapping.get(ext, "Unknown file")


# ─────────────────────────────────────────────
# SAFE CONTENT DECODING
# ─────────────────────────────────────────────

def decode_content(raw: bytes) -> str:
    for enc in ("utf-8", "utf-8-sig", "latin-1", "cp1252"):
        try:
            return raw.decode(enc)
        except UnicodeDecodeError:
            continue
    return raw.decode("utf-8", errors="replace")


# ─────────────────────────────────────────────
# SECURITY HINT EXTRACTOR
# ─────────────────────────────────────────────

def extract_hints(content: str, file_type: str) -> list[str]:
    """
    Scan content with regex patterns and return a deduplicated list of
    human-readable hint strings. Each hint includes the offending snippet
    truncated to 80 chars so the LLM sees concrete evidence.
    """
    hints: list[str] = []
    seen: set[str] = set()

    patterns = UNIVERSAL_PATTERNS + (LOG_PATTERNS if "Log" in file_type else [])

    for pattern, label in patterns:
        for match in re.finditer(pattern, content):
            snippet = match.group(0).strip()[:80]
            hint = f"{label}: `{snippet}`"
            if hint not in seen:
                seen.add(hint)
                hints.append(hint)

    # YAML/JSON structural checks
    if file_type in ("YAML configuration", "JSON configuration"):
        hints += _check_config_structure(content, file_type)

    return hints[:20]  # cap at 20 so prompt doesn't balloon


def _check_config_structure(content: str, file_type: str) -> list[str]:
    hints: list[str] = []

    if file_type == "YAML configuration" and YAML_AVAILABLE:
        try:
            data = yaml.safe_load(content)
            hints += _walk_dict(data)
        except Exception:
            pass
    elif file_type == "JSON configuration":
        try:
            data = json.loads(content)
            hints += _walk_dict(data)
        except Exception:
            pass

    return hints


def _walk_dict(obj, depth: int = 0) -> list[str]:
    """Recursively look for insecure config patterns in parsed dicts/lists."""
    if depth > 6:
        return []
    hints: list[str] = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            k_lower = str(k).lower()
            if any(kw in k_lower for kw in ("port", "host", "bind")):
                if str(v) in ("0.0.0.0", "*", "0"):
                    hints.append(f"Service bound to all interfaces: {k}={v}")
            if "allow" in k_lower and v in (True, "true", "*", "all"):
                hints.append(f"Permissive allow setting: {k}={v}")
            hints += _walk_dict(v, depth + 1)
    elif isinstance(obj, list):
        for item in obj:
            hints += _walk_dict(item, depth + 1)
    return hints


# ─────────────────────────────────────────────
# NORMALIZE FILE THREAT (extends llm_client.normalize_threat)
# ─────────────────────────────────────────────

def normalize_file_threat(item: dict, hints: list[str]) -> dict:
    """
    Apply the standard normalize_threat, then validate/fill the
    file-specific `evidence` field.
    """
    # Reuse base normalization
    item = normalize_threat(item)

    # evidence — short string pointing to specific file content
    evidence = item.get("evidence", "")
    if not isinstance(evidence, str) or not evidence.strip():
        # Fall back to the first hint that partially matches the threat name
        threat_lower = item.get("threat", "").lower()
        matched = next(
            (h for h in hints if any(w in h.lower() for w in threat_lower.split()[:3])),
            hints[0] if hints else "",
        )
        item["evidence"] = matched
    else:
        item["evidence"] = evidence.strip()[:200]

    # mitigation_priority — computed server-side from risk_score
    score = item.get("risk_score", 0)
    if score >= 20:
        item["mitigation_priority"] = "Immediate"
    elif score >= 14:
        item["mitigation_priority"] = "High"
    elif score >= 8:
        item["mitigation_priority"] = "Moderate"
    else:
        item["mitigation_priority"] = "Low"

    return item


# ─────────────────────────────────────────────
# LLM CALL — GROQ
# ─────────────────────────────────────────────

def _call_groq_file(filename: str, file_type: str, content: str, hints: list[str]) -> list[dict] | None:
    if not groq_client:
        return None

    hints_block = "\n".join(f"  • {h}" for h in hints) if hints else "  (none detected by static analysis)"
    truncated   = content[:MAX_CONTENT_CHARS]
    trunc_note  = f"[truncated to {MAX_CONTENT_CHARS} chars]" if len(content) > MAX_CONTENT_CHARS else ""

    prompt = f"""You are a senior application security engineer performing a file-based threat analysis.

File: {filename}
File Type: {file_type}

== STATIC ANALYSIS HINTS ==
The following potential issues were detected automatically:
{hints_block}

== FILE CONTENT {trunc_note} ==
{truncated}

Your task:
Analyze the file content and the hints above to identify 3–6 realistic security threats.
Every threat MUST be grounded in something present in the file — reference it in the `evidence` field.

Return ONLY a valid JSON array — no markdown, no explanation, no code fences.
Each element MUST contain exactly these fields:
{{
  "threat": "concise threat name",
  "category": "threat category",
  "stride": "Spoofing | Tampering | Repudiation | Information Disclosure | Denial of Service | Elevation of Privilege",
  "likelihood": "High | Medium | Low",
  "impact": "High | Medium | Low",
  "confidence": <integer 0-100>,
  "evidence": "exact key, value, or log line from the file that triggered this finding (max 120 chars)",
  "why_flagged": "1-2 sentences explaining why this is a vulnerability based on the file content",
  "attack_impact": [
    "specific consequence 1 if exploited",
    "specific consequence 2 if exploited",
    "specific consequence 3 if exploited"
  ],
  "mitigation_steps": [
    "Implementation-ready step 1",
    "Implementation-ready step 2",
    "Implementation-ready step 3"
  ],
  "mitigation": "one-sentence mitigation summary"
}}

Rules:
- evidence must quote something ACTUALLY present in the file content shown above
- why_flagged must explain the specific risk in context of this file
- mitigation_steps must be actionable and reference the specific config key or log pattern
- Return only the JSON array, nothing else
"""

    try:
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are a security expert. Return only valid JSON arrays. No markdown."},
                {"role": "user",   "content": prompt},
            ],
            temperature=0.2,
        )
        text   = response.choices[0].message.content
        result = extract_json(text)
        if result:
            return [normalize_file_threat(item, hints) for item in result]
        return None
    except Exception as e:
        print("[GROQ FILE ERROR]", e)
        return None


# ─────────────────────────────────────────────
# LLM CALL — OLLAMA FALLBACK
# ─────────────────────────────────────────────

def _call_ollama_file(filename: str, file_type: str, content: str, hints: list[str]) -> list[dict] | None:
    import requests as req
    hints_block = "\n".join(f"- {h}" for h in hints) if hints else "None"
    truncated   = content[:2000]

    prompt = f"""Analyze this {file_type} for security threats.
File: {filename}
Hints: {hints_block}
Content: {truncated}

Return a JSON array. Each object must have:
threat, category, stride, likelihood, impact, confidence, evidence, why_flagged,
attack_impact (array), mitigation_steps (array), mitigation.
"""
    try:
        res    = req.post("http://localhost:11434/api/generate",
                          json={"model": "llama3.2:1b", "prompt": prompt, "stream": False},
                          timeout=30)
        text   = res.json().get("response", "")
        result = extract_json(text)
        if result:
            return [normalize_file_threat(item, hints) for item in result]
        return None
    except Exception as e:
        print("[OLLAMA FILE ERROR]", e)
        return None


# ─────────────────────────────────────────────
# RULE-BASED FALLBACK
# ─────────────────────────────────────────────

def _rule_based_fallback(filename: str, file_type: str, hints: list[str]) -> list[dict]:
    threats = []

    for hint in hints[:5]:
        label   = hint.split(":")[0].strip()
        snippet = hint[len(label)+1:].strip()

        # Map hint label → rough STRIDE / likelihood
        stride, likelihood, impact = "Tampering", "Medium", "Medium"

        if "password" in label.lower() or "secret" in label.lower() or "token" in label.lower():
            stride, likelihood, impact = "Information Disclosure", "High", "High"
        elif "debug" in label.lower():
            stride, likelihood, impact = "Information Disclosure", "Medium", "Medium"
        elif "cors" in label.lower() or "wildcard" in label.lower():
            stride, likelihood, impact = "Elevation of Privilege", "High", "Medium"
        elif "ssl" in label.lower() or "tls" in label.lower() or "verify" in label.lower():
            stride, likelihood, impact = "Information Disclosure", "High", "High"
        elif "injection" in label.lower() or "xss" in label.lower():
            stride, likelihood, impact = "Tampering", "High", "High"
        elif "brute" in label.lower():
            stride, likelihood, impact = "Spoofing", "High", "Medium"
        elif "traversal" in label.lower():
            stride, likelihood, impact = "Information Disclosure", "Medium", "High"

        threat = {
            "threat":            label,
            "category":          "Configuration" if "Log" not in file_type else "Runtime Security",
            "stride":            stride,
            "likelihood":        likelihood,
            "impact":            impact,
            "confidence":        70,
            "evidence":          snippet[:120],
            "why_flagged":       f"Detected in {filename}: {snippet[:80]}",
            "attack_impact":     ["Sensitive data exposure", "Unauthorized access"],
            "mitigation_steps":  ["Remove or rotate the exposed credential", "Apply principle of least privilege"],
            "mitigation":        f"Remediate {label.lower()} found in {filename}",
        }
        threats.append(normalize_file_threat(threat, hints))

    if not threats:
        threats.append(normalize_file_threat({
            "threat":            "Unverified file security posture",
            "category":          "Configuration Review",
            "stride":            "Tampering",
            "likelihood":        "Medium",
            "impact":            "Medium",
            "confidence":        50,
            "evidence":          f"File: {filename}",
            "why_flagged":       "No specific patterns detected; manual review recommended.",
            "attack_impact":     ["Unknown attack surface", "Potential misconfiguration exposure"],
            "mitigation_steps":  ["Perform manual security review of file content", "Run a dedicated SAST tool"],
            "mitigation":        "Manual security review recommended",
        }, hints))

    return threats


# ─────────────────────────────────────────────
# PUBLIC ENTRY POINT
# ─────────────────────────────────────────────

def analyze_file_content(filename: str, raw_bytes: bytes) -> tuple[list[dict], list[str]]:
    """
    Decode, extract hints, and run LLM analysis on uploaded file bytes.
    Returns (threats, hints) so the route can include hints in the response.
    """
    file_type = detect_file_type(filename)
    content   = decode_content(raw_bytes)
    hints     = extract_hints(content, file_type)

    print(f"[FILE ANALYSIS] {filename} ({file_type}) | hints: {len(hints)}")

    # 1. GROQ
    result = _call_groq_file(filename, file_type, content, hints)
    if result:
        print("[FILE ANALYSIS] GROQ success")
        return result, hints

    # 2. Ollama
    result = _call_ollama_file(filename, file_type, content, hints)
    if result:
        print("[FILE ANALYSIS] Ollama success")
        return result, hints

    # 3. Rule-based
    print("[FILE ANALYSIS] Rule-based fallback")
    return _rule_based_fallback(filename, file_type, hints), hints
