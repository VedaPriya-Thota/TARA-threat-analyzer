# import os
# import json
# import re
# from pathlib import Path
# from dotenv import load_dotenv
# from groq import Groq
# import requests

# # =========================
# # 🔥 LOAD .ENV
# # =========================
# env_path = Path(__file__).resolve().parent.parent.parent / ".env"
# load_dotenv(dotenv_path=env_path)

# groq_key = os.getenv("GROQ_API_KEY")
# print("LOADED GROQ KEY:", groq_key)

# # =========================
# # 🔥 INIT GROQ CLIENT
# # =========================
# groq_client = None
# if groq_key:
#     try:
#         groq_client = Groq(api_key=groq_key)
#     except Exception as e:
#         print("❌ GROQ INIT ERROR:", e)


# # =========================
# # 🔥 DETECT SYSTEM TYPE
# # =========================
# def detect_context(system_description: str):
#     desc = system_description.lower()

#     if "bank" in desc or "payment" in desc:
#         return "FINANCIAL SYSTEM"
#     elif "iot" in desc or "sensor" in desc:
#         return "IOT SYSTEM"
#     elif "cloud" in desc or "aws" in desc:
#         return "CLOUD SYSTEM"
#     elif "api" in desc:
#         return "API-BASED SYSTEM"
#     else:
#         return "GENERAL SOFTWARE SYSTEM"


# # =========================
# # 🔥 STRIDE MAPPING (BACKUP)
# # =========================
# def map_stride(threat_name: str):
#     t = threat_name.lower()

#     if "spoof" in t or "impersonation" in t:
#         return "Spoofing"
#     elif "tamper" in t or "injection" in t:
#         return "Tampering"
#     elif "repudiation" in t:
#         return "Repudiation"
#     elif "leak" in t or "exposure" in t:
#         return "Information Disclosure"
#     elif "dos" in t or "denial" in t:
#         return "Denial of Service"
#     elif "privilege" in t or "escalation" in t:
#         return "Elevation of Privilege"

#     return "Tampering"  # default


# # =========================
# # 🔥 JSON PARSER
# # =========================
# def extract_json(text):
#     try:
#         return json.loads(text)
#     except:
#         pass

#     match = re.search(r"\[.*\]", text, re.DOTALL)
#     if match:
#         return json.loads(match.group(0))

#     return None


# # =========================
# # 🔥 GROQ CALL (PRIMARY)
# # =========================
# def call_groq(system_description):

#     if not groq_client:
#         return None

#     context = detect_context(system_description)

#     prompt = f"""
# You are a cybersecurity expert.

# Analyze the system and generate 3–5 threats using STRIDE model.

# System Type: {context}
# System: {system_description}

# Each threat MUST include:
# - threat
# - category
# - stride (Spoofing/Tampering/Repudiation/Information Disclosure/Denial of Service/Elevation of Privilege)
# - risk_level
# - risk_score
# - mitigation

# Return ONLY JSON:

# [
#   {{
#     "threat": "...",
#     "category": "...",
#     "stride": "...",
#     "risk_level": "High/Medium/Low",
#     "risk_score": number,
#     "mitigation": "..."
#   }}
# ]
# """

#     try:
#         response = groq_client.chat.completions.create(
#             model="llama-3.1-70b-versatile",
#             messages=[
#                 {"role": "system", "content": "Return only JSON."},
#                 {"role": "user", "content": prompt}
#             ]
#         )

#         text = response.choices[0].message.content
#         print("🧠 GROQ RAW:\n", text)

#         result = extract_json(text)

#         if result:
#             # ✅ Ensure STRIDE exists
#             for item in result:
#                 if "stride" not in item or not item["stride"]:
#                     item["stride"] = map_stride(item.get("threat", ""))

#         return result

#     except Exception as e:
#         print("❌ GROQ ERROR:", e)
#         return None
    

# # =========================
# # 🔥 OLLAMA CALL (FALLBACK)
# # =========================
# def call_ollama(system_description):

#     try:
#         res = requests.post(
#             "http://localhost:11434/api/generate",
#             json={
#                 "model": "llama3.2:1b",
#                 "prompt": f"""
# Analyze this system and return threats in JSON using STRIDE:

# {system_description}
# """,
#                 "stream": False
#             }
#         )

#         text = res.json().get("response", "")
#         print("🖥️ OLLAMA RAW:\n", text)

#         result = extract_json(text)

#         if result:
#             for item in result:
#                 if "stride" not in item or not item["stride"]:
#                     item["stride"] = map_stride(item.get("threat", ""))

#         return result

#     except Exception as e:
#         print("❌ OLLAMA ERROR:", e)
#         return None


# # =========================
# # 🔥 LOCAL FALLBACK ENGINE
# # =========================
# def local_engine(system_description):

#     context = detect_context(system_description)

#     if context == "FINANCIAL SYSTEM":
#         return [
#             {
#                 "threat": "SQL Injection in transaction APIs",
#                 "category": "Injection",
#                 "stride": "Tampering",
#                 "risk_level": "High",
#                 "risk_score": 25,
#                 "mitigation": "Use parameterized queries"
#             },
#             {
#                 "threat": "Credential stuffing attack",
#                 "category": "Authentication",
#                 "stride": "Spoofing",
#                 "risk_level": "High",
#                 "risk_score": 20,
#                 "mitigation": "Enable MFA"
#             }
#         ]

#     elif context == "IOT SYSTEM":
#         return [
#             {
#                 "threat": "Device spoofing",
#                 "category": "IoT Security",
#                 "stride": "Spoofing",
#                 "risk_level": "High",
#                 "risk_score": 25,
#                 "mitigation": "Use device authentication"
#             },
#             {
#                 "threat": "Unencrypted communication",
#                 "category": "Network",
#                 "stride": "Information Disclosure",
#                 "risk_level": "Medium",
#                 "risk_score": 12,
#                 "mitigation": "Use TLS encryption"
#             }
#         ]

#     else:
#         return [
#             {
#                 "threat": "Input validation failure",
#                 "category": "General",
#                 "stride": "Tampering",
#                 "risk_level": "Medium",
#                 "risk_score": 10,
#                 "mitigation": "Sanitize inputs"
#             }
#         ]


# # =========================
# # 🚀 MAIN FUNCTION
# # =========================
# def analyze_with_llm(system_description: str):

#     print("\n==============================")
#     print("INPUT:", system_description)

#     # 1️⃣ GROQ
#     print("➡️ TRYING GROQ...")
#     result = call_groq(system_description)

#     if result:
#         print("✅ GROQ SUCCESS")
#         return result

#     # 2️⃣ OLLAMA
#     print("➡️ TRYING OLLAMA...")
#     result = call_ollama(system_description)

#     if result:
#         print("✅ OLLAMA SUCCESS")
#         return result

#     # 3️⃣ LOCAL
#     print("⚡ USING LOCAL ENGINE")
#     return local_engine(system_description)
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
        return json.loads(match.group(0))

    return None


# =========================
# 🤖 GROQ CALL (PRIMARY)
# =========================
def call_groq(system_description):

    if not groq_client:
        return None

    context = detect_context(system_description)

    prompt = f"""
You are a cybersecurity expert.

Analyze the system and generate 3–5 SPECIFIC threats using STRIDE model.

System Type: {context}
System: {system_description}

Each threat MUST include:
- threat
- category
- stride
- likelihood (High/Medium/Low)
- impact (High/Medium/Low)
- confidence (0-100)
- mitigation

Return ONLY JSON:
[
  {{
    "threat": "...",
    "category": "...",
    "stride": "...",
    "likelihood": "High",
    "impact": "High",
    "confidence": 85,
    "mitigation": "..."
  }}
]
"""

    try:
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",   # ✅ SAFE WORKING MODEL
            messages=[
                {"role": "system", "content": "Return only JSON."},
                {"role": "user", "content": prompt}
            ]
        )

        text = response.choices[0].message.content
        print("🧠 GROQ RAW:\n", text)

        result = extract_json(text)

        if result:
            for item in result:
                if "stride" not in item or not item["stride"]:
                    item["stride"] = map_stride(item.get("threat", ""))

        return result

    except Exception as e:
        print("❌ GROQ ERROR:", e)
        return None


# =========================
# 🤖 OLLAMA CALL (FALLBACK)
# =========================
def call_ollama(system_description):

    context = detect_context(system_description)

    prompt = f"""
Analyze this system and generate threats using STRIDE.

System Type: {context}
System: {system_description}

Return ONLY a JSON array, and ensure each object contains fields: threat, category, stride, likelihood (High/Medium/Low), impact (High/Medium/Low), confidence (0-100), and mitigation.
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
            for item in result:
                if "stride" not in item or not item["stride"]:
                    item["stride"] = map_stride(item.get("threat", ""))

        return result

    except Exception as e:
        print("❌ OLLAMA ERROR:", e)
        return None


# =========================
# ⚡ LOCAL FALLBACK ENGINE
# =========================
def local_engine(system_description):

    context = detect_context(system_description)

    if context == "FINANCIAL SYSTEM":
        return [
            {
                "threat": "SQL Injection in transaction APIs",
                "category": "Injection",
                "stride": "Tampering",
                "likelihood": "High",
                "impact": "High",
                "confidence": 95,
                "mitigation": "Use parameterized queries"
            },
            {
                "threat": "Credential stuffing attack",
                "category": "Authentication",
                "stride": "Spoofing",
                "likelihood": "High",
                "impact": "Medium",
                "confidence": 88,
                "mitigation": "Enable MFA"
            }
        ]

    elif context == "IOT SYSTEM":
        return [
            {
                "threat": "Device spoofing",
                "category": "IoT Security",
                "stride": "Spoofing",
                "likelihood": "High",
                "impact": "High",
                "confidence": 90,
                "mitigation": "Use device authentication"
            }
        ]

    return [
        {
            "threat": "Input validation failure",
            "category": "General",
            "stride": "Tampering",
            "likelihood": "Medium",
            "impact": "Low",
            "confidence": 75,
            "mitigation": "Sanitize inputs"
        }
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