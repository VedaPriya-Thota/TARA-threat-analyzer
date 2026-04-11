"""
url_analyzer.py
Handles URL-based surface mapping:
  - Detects GitHub repo vs public website
  - GitHub: inspects repo file tree via API
  - Website: fetches public metadata + security headers
  - Generates structured threat analysis from evidence
"""

import re
import json
import requests as req

from app.llm.llm_client import groq_client, extract_json, normalize_threat

# ─────────────────────────────────────────────
# CONSTANTS
# ─────────────────────────────────────────────

TIMEOUT = 10  # seconds for HTTP requests

SECURITY_HEADERS = [
    "strict-transport-security",
    "content-security-policy",
    "x-frame-options",
    "x-content-type-options",
    "referrer-policy",
    "permissions-policy",
    "x-xss-protection",
]

INTERESTING_PATHS = [
    ".env", ".env.example", ".env.local",
    "docker-compose.yml", "docker-compose.yaml", "Dockerfile",
    ".github/workflows", "terraform/", "k8s/", "kubernetes/",
    "scripts/", "deploy/", "infra/",
    "config/", "secrets/", "credentials/",
    "requirements.txt", "package.json", "Makefile",
    ".travis.yml", "circle.yml", "Jenkinsfile",
    "helm/", "charts/",
]

GITHUB_RE = re.compile(
    r"^https?://github\.com/(?P<owner>[^/]+)/(?P<repo>[^/?\s]+)", re.IGNORECASE
)


# ─────────────────────────────────────────────
# URL TYPE DETECTION
# ─────────────────────────────────────────────

def detect_url_type(url: str) -> str:
    """Returns 'github' or 'website'."""
    if GITHUB_RE.match(url.strip()):
        return "github"
    return "website"


# ─────────────────────────────────────────────
# GITHUB ANALYSIS
# ─────────────────────────────────────────────

def _fetch_github_tree(owner: str, repo: str) -> list[str]:
    """Fetch the recursive file tree for a GitHub repo. Returns list of paths."""
    # First get default branch
    meta_url = f"https://api.github.com/repos/{owner}/{repo}"
    try:
        meta = req.get(meta_url, timeout=TIMEOUT, headers={"Accept": "application/vnd.github+json"})
        default_branch = meta.json().get("default_branch", "main")
    except Exception:
        default_branch = "main"

    tree_url = f"https://api.github.com/repos/{owner}/{repo}/git/trees/{default_branch}?recursive=1"
    try:
        resp = req.get(tree_url, timeout=TIMEOUT, headers={"Accept": "application/vnd.github+json"})
        if resp.status_code != 200:
            return []
        data = resp.json()
        return [item["path"] for item in data.get("tree", []) if item.get("type") == "blob"]
    except Exception:
        return []


def _match_interesting_paths(all_paths: list[str]) -> list[str]:
    """Return paths from the tree that match known sensitive/interesting patterns."""
    found = []
    for path in all_paths:
        lower = path.lower()
        for pattern in INTERESTING_PATHS:
            if pattern.rstrip("/") in lower:
                found.append(path)
                break
    return found


def _github_rule_based(owner: str, repo: str, notable: list[str], all_paths: list[str]) -> list[dict]:
    """Generate threats from repo structure when LLM is unavailable."""
    threats = []

    checks = [
        (
            lambda p: any(".env" in x for x in p),
            "Environment file exposed in repository",
            "Information Disclosure", "High", "High",
            ".env file found in repo tree",
            ["Secrets leaked to anyone who clones the repo", "API keys and credentials compromised"],
            ["Add .env to .gitignore immediately", "Rotate all secrets referenced in the file", "Use GitHub Secrets or a vault for credentials"],
        ),
        (
            lambda p: any("docker" in x.lower() for x in p),
            "Docker configuration present — container attack surface",
            "Tampering", "Medium", "Medium",
            "Dockerfile or docker-compose found",
            ["Misconfigured container privileges", "Exposed ports and services"],
            ["Review Docker image for privileged flags", "Ensure non-root user inside container", "Audit exposed ports"],
        ),
        (
            lambda p: any(".github/workflows" in x for x in p),
            "CI/CD pipeline files expose build secrets",
            "Elevation of Privilege", "Medium", "High",
            ".github/workflows directory present",
            ["Supply chain attack via compromised workflow", "Secrets injected via env vars leaking in logs"],
            ["Audit workflow files for secret exposure", "Use GitHub OIDC instead of long-lived tokens", "Restrict workflow trigger permissions"],
        ),
        (
            lambda p: any("terraform" in x.lower() or "k8s" in x.lower() or "kubernetes" in x.lower() for x in p),
            "Infrastructure-as-Code files present",
            "Elevation of Privilege", "Medium", "High",
            "Terraform or Kubernetes manifests found",
            ["Misconfigured cloud resources deployed at scale", "Overly permissive IAM roles"],
            ["Run tfsec or checkov on IaC files", "Enforce least-privilege IAM policies", "Store state files in encrypted remote backend"],
        ),
        (
            lambda p: any("scripts/" in x.lower() or x.endswith(".sh") for x in p),
            "Shell scripts may contain hardcoded credentials",
            "Information Disclosure", "Medium", "Medium",
            "Shell scripts (.sh) found in scripts/",
            ["Credentials or tokens embedded in automation scripts", "Scripts run in privileged CI context"],
            ["Scan scripts with truffleHog or gitleaks", "Replace inline credentials with environment variables"],
        ),
        (
            lambda p: any("helm" in x.lower() or "charts/" in x.lower() for x in p),
            "Helm charts may expose Kubernetes secrets in plaintext",
            "Information Disclosure", "Medium", "High",
            "Helm charts directory found",
            ["Sensitive values stored in values.yaml", "Secrets not encrypted at rest in chart"],
            ["Use Helm Secrets plugin or external secrets operator", "Never store real credentials in values.yaml"],
        ),
        (
            lambda p: any("config/" in x.lower() or "credentials" in x.lower() for x in p),
            "Config or credentials directory found",
            "Information Disclosure", "High", "High",
            "config/ or credentials/ path in repo",
            ["Configuration files may contain sensitive connection strings", "Credential files accessible to all contributors"],
            ["Audit config directory for secrets", "Move sensitive config to environment variables or secrets manager"],
        ),
    ]

    for (test, threat_name, stride, likelihood, impact, evidence, attack_impact, mitigations) in checks:
        if test(notable):
            l_score = {"High": 5, "Medium": 3, "Low": 1}[likelihood]
            i_score = {"High": 5, "Medium": 3, "Low": 1}[impact]
            score = l_score * i_score
            threats.append(normalize_threat({
                "threat":            threat_name,
                "category":          "Repository Security",
                "stride":            stride,
                "likelihood":        likelihood,
                "impact":            impact,
                "confidence":        72,
                "evidence":          evidence,
                "why_flagged":       f"Found in {owner}/{repo}: {evidence}",
                "attack_impact":     attack_impact,
                "mitigation_steps":  mitigations,
                "mitigation":        mitigations[0],
            }))

    if not threats:
        threats.append(normalize_threat({
            "threat":            "Public repository exposure",
            "category":          "Repository Security",
            "stride":            "Information Disclosure",
            "likelihood":        "Low",
            "impact":            "Medium",
            "confidence":        55,
            "evidence":          f"Public repo {owner}/{repo} with {len(all_paths)} files",
            "why_flagged":       "Repository is public — all code, history, and issues are accessible",
            "attack_impact":     ["Reconnaissance by attackers", "Business logic exposure"],
            "mitigation_steps":  ["Review if repo should be private", "Audit commit history for accidental secret commits"],
            "mitigation":        "Audit repository visibility and commit history",
        }))

    return threats


def analyze_github(url: str) -> tuple[list[dict], dict]:
    """
    Analyze a GitHub repo URL.
    Returns (threats, surface_info).
    """
    m = GITHUB_RE.match(url.strip())
    if not m:
        return [], {}

    owner = m.group("owner")
    repo  = m.group("repo").rstrip("/")

    all_paths = _fetch_github_tree(owner, repo)
    notable   = _match_interesting_paths(all_paths)

    surface_info = {
        "owner":         owner,
        "repo":          repo,
        "total_files":   len(all_paths),
        "notable_paths": notable[:20],
    }

    threats = _call_groq_github(owner, repo, notable, all_paths)
    if not threats:
        threats = _github_rule_based(owner, repo, notable, all_paths)

    return threats, surface_info


def _call_groq_github(owner: str, repo: str, notable: list[str], all_paths: list[str]) -> list[dict] | None:
    if not groq_client:
        return None

    notable_block = "\n".join(f"  - {p}" for p in notable[:30]) if notable else "  (none detected)"
    sample_block  = "\n".join(f"  - {p}" for p in all_paths[:60])

    prompt = f"""You are a security engineer doing a repository surface analysis.

GitHub repository: {owner}/{repo}
Total files: {len(all_paths)}

Notable/sensitive paths found:
{notable_block}

Sample of all paths (first 60):
{sample_block}

Analyze the repository structure for security threats. Focus ONLY on what the file tree reveals.
Do NOT invent threats without evidence from the paths above.

Return a JSON array. Each object MUST have these exact fields:
- threat: string (threat name)
- category: string
- stride: one of [Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege]
- likelihood: High | Medium | Low
- impact: High | Medium | Low
- confidence: integer 0-100
- evidence: exact file path or pattern from the tree that triggered this (max 120 chars)
- why_flagged: why this path/pattern is a security concern (1-2 sentences)
- attack_impact: array of 2-3 strings describing what an attacker could do
- mitigation_steps: array of 2-3 actionable developer steps
- mitigation: string (single primary mitigation)

Return ONLY the JSON array, no explanation."""

    try:
        resp = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=2000,
        )
        text   = resp.choices[0].message.content
        result = extract_json(text)
        if result:
            return [normalize_threat(item) for item in result]
        return None
    except Exception as e:
        print("[GROQ GITHUB ERROR]", e)
        return None


# ─────────────────────────────────────────────
# WEBSITE ANALYSIS
# ─────────────────────────────────────────────

def fetch_website_surface(url: str) -> dict:
    """
    Fetch public metadata from a URL.
    Returns a dict with headers, status, stack signals, missing security headers.
    """
    surface = {
        "final_url":               url,
        "status_code":             None,
        "server":                  None,
        "x_powered_by":            None,
        "missing_security_headers": [],
        "present_security_headers": [],
        "stack_signals":           [],
        "error":                   None,
    }

    try:
        resp = req.get(
            url, timeout=TIMEOUT,
            allow_redirects=True,
            headers={"User-Agent": "Mozilla/5.0 (security-audit; TARA-analyzer/1.0)"},
            stream=True,  # don't download body
        )
        # Read only a small slice of the body for stack signals
        body_sample = b""
        for chunk in resp.iter_content(chunk_size=4096):
            body_sample += chunk
            break  # only first chunk
        body_text = body_sample.decode("utf-8", errors="replace").lower()

        surface["status_code"] = resp.status_code
        surface["final_url"]   = resp.url

        h = {k.lower(): v for k, v in resp.headers.items()}

        surface["server"]       = h.get("server")
        surface["x_powered_by"] = h.get("x-powered-by")

        for sh in SECURITY_HEADERS:
            if sh in h:
                surface["present_security_headers"].append(sh)
            else:
                surface["missing_security_headers"].append(sh)

        # Stack signals from headers + body
        signals = []
        if h.get("server"):
            signals.append(f"Server: {h['server']}")
        if h.get("x-powered-by"):
            signals.append(f"X-Powered-By: {h['x-powered-by']}")
        if h.get("x-aspnet-version") or h.get("x-aspnetmvc-version"):
            signals.append("ASP.NET detected via headers")
        if "wp-content" in body_text or "wp-json" in body_text:
            signals.append("WordPress detected via HTML")
        if "drupal" in body_text:
            signals.append("Drupal detected via HTML")
        if "react" in body_text or "__next" in body_text:
            signals.append("React/Next.js detected via HTML")
        if h.get("cf-ray") or h.get("cf-cache-status"):
            signals.append("Cloudflare CDN detected")
        if h.get("x-amz-request-id") or "amazonaws" in h.get("server", "").lower():
            signals.append("AWS infrastructure detected")
        if "laravel" in body_text or "laravel_session" in str(h.get("set-cookie", "")):
            signals.append("Laravel framework detected")

        surface["stack_signals"] = signals

    except req.exceptions.SSLError as e:
        surface["error"] = f"SSL error: {str(e)[:120]}"
    except req.exceptions.ConnectionError as e:
        surface["error"] = f"Connection error: {str(e)[:120]}"
    except req.exceptions.Timeout:
        surface["error"] = "Request timed out"
    except Exception as e:
        surface["error"] = f"Fetch error: {str(e)[:120]}"

    return surface


def _website_rule_based(surface: dict) -> list[dict]:
    """Generate threats from website surface metadata."""
    threats = []
    missing = surface.get("missing_security_headers", [])
    present = surface.get("present_security_headers", [])
    signals = surface.get("stack_signals", [])
    server  = surface.get("server") or ""
    powered = surface.get("x_powered_by") or ""
    url     = surface.get("final_url", "")

    # Missing security headers
    critical_missing = [h for h in ["strict-transport-security", "content-security-policy"] if h in missing]
    if critical_missing:
        threats.append(normalize_threat({
            "threat":            "Critical security headers absent",
            "category":          "Web Security Headers",
            "stride":            "Information Disclosure",
            "likelihood":        "High",
            "impact":            "High",
            "confidence":        90,
            "evidence":          f"Missing: {', '.join(critical_missing)}",
            "why_flagged":       "Absence of HSTS and CSP leaves the site vulnerable to MITM and XSS attacks",
            "attack_impact":     ["Man-in-the-middle downgrade attack", "Cross-site scripting exploitation", "Cookie hijacking over HTTP"],
            "mitigation_steps":  ["Add Strict-Transport-Security header with max-age >= 31536000", "Define a Content-Security-Policy restricting script sources", "Enable HTTPS-only with redirect from HTTP"],
            "mitigation":        "Implement HSTS and Content-Security-Policy headers",
        }))

    moderate_missing = [h for h in ["x-frame-options", "x-content-type-options", "referrer-policy"] if h in missing]
    if moderate_missing:
        threats.append(normalize_threat({
            "threat":            "Clickjacking and MIME-sniffing protections missing",
            "category":          "Web Security Headers",
            "stride":            "Tampering",
            "likelihood":        "Medium",
            "impact":            "Medium",
            "confidence":        85,
            "evidence":          f"Missing: {', '.join(moderate_missing)}",
            "why_flagged":       "Without X-Frame-Options and X-Content-Type-Options, the site is vulnerable to clickjacking and MIME confusion attacks",
            "attack_impact":     ["Clickjacking to trick users into unintended actions", "MIME-type confusion leading to script execution"],
            "mitigation_steps":  ["Set X-Frame-Options: DENY or SAMEORIGIN", "Set X-Content-Type-Options: nosniff", "Set Referrer-Policy: strict-origin-when-cross-origin"],
            "mitigation":        "Add X-Frame-Options and X-Content-Type-Options headers",
        }))

    # Server version disclosure
    version_pattern = re.compile(r'[\d]+\.[\d]+', re.IGNORECASE)
    if server and version_pattern.search(server):
        threats.append(normalize_threat({
            "threat":            "Server version disclosed in response headers",
            "category":          "Information Disclosure",
            "stride":            "Information Disclosure",
            "likelihood":        "Medium",
            "impact":            "Medium",
            "confidence":        88,
            "evidence":          f"Server: {server}",
            "why_flagged":       "Exact server version enables targeted CVE exploitation by attackers",
            "attack_impact":     ["Targeted exploit selection based on version", "Automated vulnerability scanner hits"],
            "mitigation_steps":  ["Configure server to omit version from headers", "For nginx: set server_tokens off", "For Apache: set ServerTokens Prod"],
            "mitigation":        "Suppress server version from HTTP response headers",
        }))

    # X-Powered-By disclosure
    if powered:
        threats.append(normalize_threat({
            "threat":            "Technology stack disclosed via X-Powered-By header",
            "category":          "Information Disclosure",
            "stride":            "Information Disclosure",
            "likelihood":        "Medium",
            "impact":            "Low",
            "confidence":        92,
            "evidence":          f"X-Powered-By: {powered}",
            "why_flagged":       "X-Powered-By reveals the backend technology, aiding attacker reconnaissance",
            "attack_impact":     ["Framework-specific exploit targeting", "Version-based CVE lookup"],
            "mitigation_steps":  ["Remove X-Powered-By header from all responses", "In Express.js: app.disable('x-powered-by')", "In PHP: expose_php = Off in php.ini"],
            "mitigation":        "Remove X-Powered-By header",
        }))

    # HTTP (not HTTPS)
    if url.startswith("http://"):
        threats.append(normalize_threat({
            "threat":            "Site served over unencrypted HTTP",
            "category":          "Transport Security",
            "stride":            "Information Disclosure",
            "likelihood":        "High",
            "impact":            "High",
            "confidence":        95,
            "evidence":          f"Final URL: {url}",
            "why_flagged":       "HTTP transmits data in plaintext — credentials, cookies, and content are visible to network attackers",
            "attack_impact":     ["Credential interception", "Session hijacking", "Content injection by network attacker"],
            "mitigation_steps":  ["Obtain and install a TLS certificate (Let's Encrypt is free)", "Redirect all HTTP traffic to HTTPS", "Set HSTS header after HTTPS is confirmed stable"],
            "mitigation":        "Migrate to HTTPS immediately",
        }))

    # WordPress
    if any("WordPress" in s for s in signals):
        threats.append(normalize_threat({
            "threat":            "WordPress installation detected — plugin attack surface",
            "category":          "CMS Security",
            "stride":            "Tampering",
            "likelihood":        "Medium",
            "impact":            "High",
            "confidence":        80,
            "evidence":          "wp-content or wp-json detected in HTML",
            "why_flagged":       "WordPress plugins are the most common attack vector for CMS compromises",
            "attack_impact":     ["Plugin RCE via known CVEs", "Admin panel brute-force", "XML-RPC abuse"],
            "mitigation_steps":  ["Keep WordPress core and all plugins updated", "Disable XML-RPC if not needed", "Use a WAF plugin such as Wordfence"],
            "mitigation":        "Keep WordPress and plugins updated, disable unused features",
        }))

    # SSL error
    if surface.get("error") and "ssl" in (surface["error"] or "").lower():
        threats.append(normalize_threat({
            "threat":            "SSL/TLS certificate error on target URL",
            "category":          "Transport Security",
            "stride":            "Information Disclosure",
            "likelihood":        "High",
            "impact":            "High",
            "confidence":        90,
            "evidence":          surface["error"][:120],
            "why_flagged":       "An invalid or expired TLS certificate allows MITM attacks without browser warning bypass",
            "attack_impact":     ["Traffic interception by MITM", "User credential theft", "Loss of user trust"],
            "mitigation_steps":  ["Renew or replace the TLS certificate", "Use Let's Encrypt for automatic renewal", "Monitor certificate expiry with an alerting tool"],
            "mitigation":        "Fix TLS certificate — renew or replace immediately",
        }))

    if not threats:
        threats.append(normalize_threat({
            "threat":            "No critical surface issues detected from metadata",
            "category":          "Web Security",
            "stride":            "Information Disclosure",
            "likelihood":        "Low",
            "impact":            "Low",
            "confidence":        50,
            "evidence":          f"Status {surface.get('status_code')} | {len(present)} security headers present",
            "why_flagged":       "Surface metadata analysis complete — deeper application-layer testing recommended",
            "attack_impact":     ["Unknown application-layer vulnerabilities", "Business logic flaws not visible from headers"],
            "mitigation_steps":  ["Run authenticated DAST scan", "Review application code for OWASP Top 10", "Perform manual penetration testing"],
            "mitigation":        "Perform application-layer security testing",
        }))

    return threats


def analyze_website(url: str) -> tuple[list[dict], dict]:
    """
    Analyze a public website URL via metadata.
    Returns (threats, surface_info).
    """
    surface = fetch_website_surface(url)

    threats = _call_groq_website(url, surface)
    if not threats:
        threats = _website_rule_based(surface)

    return threats, surface


def _call_groq_website(url: str, surface: dict) -> list[dict] | None:
    if not groq_client:
        return None

    missing = surface.get("missing_security_headers", [])
    present = surface.get("present_security_headers", [])
    signals = surface.get("stack_signals", [])

    surface_block = f"""URL: {url}
Status code: {surface.get('status_code')}
Server header: {surface.get('server') or 'not disclosed'}
X-Powered-By: {surface.get('x_powered_by') or 'not disclosed'}
Present security headers: {', '.join(present) if present else 'none'}
Missing security headers: {', '.join(missing) if missing else 'none'}
Stack signals: {', '.join(signals) if signals else 'none detected'}
Fetch error: {surface.get('error') or 'none'}"""

    prompt = f"""You are a web security analyst performing a passive surface analysis.

{surface_block}

Based ONLY on this metadata, identify security threats. Do NOT invent vulnerabilities not supported by the evidence above.
Every threat MUST cite specific evidence from the surface data (a header name, a detected technology, the URL scheme, etc.).

Return a JSON array. Each object MUST have these exact fields:
- threat: string
- category: string
- stride: one of [Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege]
- likelihood: High | Medium | Low
- impact: High | Medium | Low
- confidence: integer 0-100
- evidence: the specific header, value, or signal that triggered this threat (max 120 chars)
- why_flagged: 1-2 sentences explaining the security risk
- attack_impact: array of 2-3 strings
- mitigation_steps: array of 2-3 actionable steps
- mitigation: string (primary fix)

Return ONLY the JSON array, no explanation."""

    try:
        resp = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=2000,
        )
        text   = resp.choices[0].message.content
        result = extract_json(text)
        if result:
            return [normalize_threat(item) for item in result]
        return None
    except Exception as e:
        print("[GROQ WEBSITE ERROR]", e)
        return None


# ─────────────────────────────────────────────
# PUBLIC ENTRY POINT
# ─────────────────────────────────────────────

def analyze_url(url: str) -> tuple[list[dict], dict, str]:
    """
    Main entry point. Returns (threats, surface_info, url_type).
    url_type is 'github' or 'website'.
    """
    url_type = detect_url_type(url)
    print(f"[URL ANALYSIS] {url_type.upper()}: {url}")

    if url_type == "github":
        threats, surface_info = analyze_github(url)
    else:
        threats, surface_info = analyze_website(url)

    print(f"[URL ANALYSIS] {len(threats)} threats generated")
    return threats, surface_info, url_type
