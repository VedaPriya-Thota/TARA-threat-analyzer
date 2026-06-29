<div align="center">

# 🛡️ TARA
### Threat Analysis and Risk Assessment System

**AI-powered, STRIDE-aligned threat modeling — from architecture description to developer-ready mitigations in seconds.**

[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.135.3-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-16.1.6-000000?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.3-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?style=flat-square&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![LLM](https://img.shields.io/badge/LLM-LLaMA%203.3--70B%20%7C%20Groq-FF6B35?style=flat-square&logo=meta&logoColor=white)](https://groq.com/)
[![Build](https://img.shields.io/badge/build-passing-brightgreen?style=flat-square)]()
[![API Status](https://img.shields.io/badge/API-operational-brightgreen?style=flat-square)]()
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)]()
[![Stars](https://img.shields.io/github/stars/VedaPriya-Thota/TARA-threat-analyzer?style=flat-square&color=yellow)](https://github.com/VedaPriya-Thota/TARA-threat-analyzer/stargazers)
[![Forks](https://img.shields.io/github/forks/VedaPriya-Thota/TARA-threat-analyzer?style=flat-square&color=blue)](https://github.com/VedaPriya-Thota/TARA-threat-analyzer/network/members)

</div>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Input Modes Supported](#-input-modes-supported)
- [System Walkthrough (Visual Tour)](#-system-walkthrough-visual-tour)
- [Key Features](#-key-features)
- [How It Works](#-how-it-works)
- [System Architecture](#-system-architecture)
- [Key Innovations](#-key-innovations)
- [Tech Stack](#-tech-stack)
- [Risk Scoring Model](#-risk-scoring-model)
- [API Reference](#-api-reference)
- [Project Structure](#-project-structure)
- [Setup & Installation](#-setup--installation)
- [Environment Variables](#-environment-variables)
- [Database Schema](#-database-schema)
- [Application Pages](#-application-pages)
- [LLM Prompt Design](#-llm-prompt-design)
- [Fallback Chain](#-fallback-chain)
- [Future Improvements](#-future-improvements)
- [Philosophy](#-philosophy)

---

## 🎯 Overview

Threat modeling is one of the highest-leverage security practices a team can adopt — and one of the most neglected. **Manual STRIDE analysis requires a security expert, hours of whiteboarding, and constant re-validation every time the architecture changes.** Most teams skip it entirely until an incident forces the conversation.

**TARA removes that bottleneck.**

TARA is a multi-modal AI-powered threat modeling system. Users can provide system context in multiple ways — from plain text descriptions to structured configuration files or even entire GitHub repositories — and TARA generates structured STRIDE-classified threat reports with risk scoring and actionable mitigations.

| Before TARA | With TARA |
|---|---|
| Hours of expert-led whiteboarding | Seconds, fully automated |
| Inconsistent, reviewer-dependent output | Structured, repeatable, schema-enforced |
| Generic security checklists | Stack-aware mitigations (e.g. "Redis SET with TTL") |
| One-time analysis, quickly stale | Re-run on every architecture change |

It's threat modeling that scales with how fast modern teams actually ship.

---

## 📥 Input Modes Supported

### Text Description Mode (Core Input)

Natural language system description
Architecture explanations
API design descriptions
Threat modeling from scratch

Example: As an admin,I want to export all user data as CSV so that I can share report with stakeholders.

---

### File Upload Mode (Structured Systems)

YAML (.yaml, .yml)
XML (.xml)
JSON (.json)
Similar structured configuration formats

What it does:

Parses system structure
Extracts services, databases, APIs, queues, etc.
Converts configuration into internal architecture graph
Feeds structured representation into STRIDE analysis engine


---

### Surface Mapper Mode (Repository Analysis)

GitHub repository URL
Project README + directory structure
Service manifests

What it does:

Parses repository structure
Extracts tech stack automatically
Identifies exposed endpoints and services
Performs attack surface mapping
Detects architecture-level security risks
Infers implicit trust boundaries

---

## 📸 System Walkthrough (Visual Tour)

A quick visual overview of how TARA analyzes systems, generates threats, and visualizes risk.

---

### 🧠 Core Threat Analysis Flow

#### ⚡ Dashboard — Real-Time Threat Intelligence
The main interface where users input system descriptions and instantly receive STRIDE-based threat analysis.

![Dashboard](assets/dashboard-overview.png)

---

#### 🧾 Threat Report — Structured STRIDE Output
Detailed breakdown of each threat with classification, risk scoring, and mitigation steps.

![Threat Report](assets/threat-report.png)

---

#### 📊 Risk Visualization — Severity Distribution
Visual representation of system risk using computed scoring across all detected threats.

![Risk Visualization](assets/risk-analytics.png)

---

### 📂 Historical & System Views

#### 🕘 History — All Past Analyses
Track and review previously analyzed systems with full persistence via MySQL.

![History Page](assets/threat-report.png)

---

#### ⚙️ Settings — AI Configuration & System Health
Manage LLM provider settings, system status, and analysis parameters.

![Settings Page](assets/settings-page.png)

---

### 🏗️ System Design

#### 🧩 Architecture Overview
Complete system design showing frontend, backend, LLM pipeline, and fallback layers.

![Architecture Diagram](assets/system-architecture.png)

---

### Workflow Preview

```
User Input  →  LLM Reasoning  →  STRIDE Mapping  →  Risk Scoring  →  Mitigation Output
```

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 🧠 **LLM Threat Generation** | GROQ-hosted LLaMA 3.3-70B generates contextual, stack-aware threats |
| 🗂️ **STRIDE Classification** | Every threat mapped to one of the six STRIDE categories |
| 📊 **Dynamic Risk Scoring** | `Risk Score = Likelihood × Impact` (1 / 3 / 5 scale) |
| ❓ **"Why This Threat"** | Short, system-specific explanation of the vulnerability |
| 💥 **Attack Impact Simulation** | 2–4 concrete consequences if the threat is exploited |
| 🛠️ **Developer Mitigations** | Numbered, implementation-ready steps referencing the real stack |
| 📈 **AI Confidence Score** | Per-threat confidence percentage with a visual bar |
| 📉 **Risk Visualization** | Bar chart + severity breakdown for each analysis |
| 🕒 **Threat History** | Every analysis stored in MySQL, browsable in History |
| 📄 **PDF Export** | One-click export of the full threat report |
| 📱 **Responsive UI** | Desktop and mobile-ready; sidebar collapses on small screens |

---

## ⚙️ How It Works

1. **User provides input in any supported mode**
 *Text description OR
 *Structured file OR
 *GitHub/repository URL
2. **Backend normalizes input into a unified system representation**

 *Text → parsed directly
 *Files → converted into architecture graph
 *Repos → surface mapper extracts components
3. System auto-detects domain context (Financial / IoT / Cloud / API / General)
4. **LLM returns STRIDE-classified threats** — schema-enforced JSON from LLaMA 3.3-70B via Groq
5. **Risk engine computes scores** — Likelihood × Impact → Critical / High / Medium / Low
6. **Mitigation engine enriches output** — adds "why flagged," attack impact, and step-by-step fixes
7. **Results are persisted to MySQL** — every analysis becomes part of the searchable history
8. **Frontend visualizes the findings** — dashboard cards, charts, and an exportable PDF report

---

## 🏗️ System Architecture

```
┌──────────────────────────────────────────────┐
│                Browser (Next.js)              │
│   Landing → Dashboard → History               │
│            → Reports  → Settings              │
└───────────────────┬────────────────────────────┘
                     │ HTTP (axios / fetch)
                     ▼
┌──────────────────────────────────────────────┐
│                FastAPI Backend                │
│   POST   /analysis/        analyze system     │
│   GET    /analysis/history fetch history       │
│   DELETE /analysis/history clear history       │
└──────────┬─────────────────────────┬───────────┘
            │                         │
            ▼                         ▼
   ┌─────────────────┐      ┌──────────────────────┐
   │     Groq API     │      │     MySQL Database    │
   │  LLaMA 3.3-70B   │      │  analysis_results      │
   │  (primary LLM)   │      │  systems               │
   └────────┬─────────┘      └──────────────────────┘
            │ fallback if Groq unavailable
            ▼
   ┌─────────────────┐
   │  Ollama (local)  │  → final fallback: rule-based engine
   │  llama3.2:1b     │
   └─────────────────┘
```

**Reading the diagram:**
- The **Next.js frontend** is the only thing the user touches — it never talks to the LLM or database directly.
- The **FastAPI backend** owns all business logic: prompting, risk scoring, normalization, and persistence.
- **Groq (LLaMA 3.3-70B)** is the primary reasoning engine. If it's unreachable, the backend transparently degrades to **Ollama**, then to a **deterministic rule engine** — the user never sees an error.
- **MySQL** is the single source of truth for every analysis ever run, powering the History and Reports pages.

---

## 🔑 Key Innovations

- **Multi-model fallback chain** — Groq → Ollama → rule engine, so threat analysis never fails due to LLM downtime
- **Schema-enforced LLM prompting** — the model is instructed to return exact, field-level JSON, not free text
- **Automated STRIDE modeling** — six-category classification applied consistently across every analysis
- **Quantified risk formula** — `Likelihood × Impact` turns subjective judgment into a reproducible score
- **Output normalization layer** — `normalize_threat()` repairs malformed LLM responses (stringified lists, missing fields, empty arrays) before they ever reach the database
- **Real-time visualization** — risk distribution and severity breakdowns render immediately after analysis

---

## 🧩 Tech Stack

### 🔧 Backend
| Package | Version | Purpose |
|---|---|---|
| FastAPI | 0.135.3 | REST API framework |
| Uvicorn | 0.44.0 | ASGI server |
| SQLAlchemy | 2.0.49 | ORM — MySQL models & queries |
| PyMySQL | 1.1.2 | Pure-Python MySQL driver |
| Pydantic | 2.12.5 | Request/response validation |
| python-dotenv | 1.2.2 | `.env` file loading |

*Full list with explanations: [`backend/requirements.txt`](backend/requirements.txt)*

### 🎨 Frontend
| Package | Version | Purpose |
|---|---|---|
| Next.js | 16.1.6 | React framework (App Router) |
| React | 19.2.3 | UI library |
| Tailwind CSS | 4 | Utility-first styling |
| Recharts | 3.8.0 | Risk distribution bar chart |
| axios | 1.13.6 | HTTP client |
| lucide-react | 0.577.0 | Icon set |
| jsPDF + html2canvas | 4.2.0 / 1.4.1 | PDF export |

### 🤖 AI / LLM
| Component | Detail |
|---|---|
| Primary model | LLaMA 3.3-70B via Groq (`groq` SDK 1.1.2) |
| Fallback model | Ollama, `llama3.2:1b` (local, port `11434`) |
| Final fallback | Built-in rule engine (keyword-based, always available) |
| HTTP client (Ollama) | `requests` 2.33.1 |

### 🗄️ Infra
| Item | Detail |
|---|---|
| Database engine | MySQL 8+ |
| ORM | SQLAlchemy 2.0 |
| Connection | `mysql+pymysql://user:pass@localhost/tara_db` |

---

## 📐 Risk Scoring Model

```
Risk Score = Likelihood Score × Impact Score
```

| Rating | Score |
|---|---|
| High | 5 |
| Medium | 3 |
| Low | 1 |

| Risk Score Range | Classification |
|---|---|
| 20 – 25 | 🔴 Critical |
| 10 – 19 | 🟠 High |
| 5 – 9 | 🟡 Medium |
| 1 – 4 | 🟢 Low |

> Max possible score: `5 × 5 = 25` (Critical).

---

## 🔌 API Reference

### `POST /analysis/`
Analyze a system description and return structured threats.

**Request**
```json
{
  "system_description": "A REST API with JWT auth, MySQL database and Redis cache on AWS"
}
```

**Response**
```json
{
  "system_description": "...",
  "analysis": [
    {
      "threat": "JWT Token Tampering",
      "category": "Authentication",
      "stride": "Tampering",
      "likelihood": "Medium",
      "impact": "High",
      "risk_score": 15,
      "risk_level": "High",
      "confidence": 80,
      "mitigation": "Implement token blacklisting using Redis SET with TTL.",
      "why_flagged": "The system uses JWT auth which is vulnerable to tampering if tokens are not validated on every request.",
      "attack_impact": [
        "Unauthorized access to protected API endpoints",
        "Session hijacking allowing privilege escalation",
        "Sensitive data exfiltration from MySQL"
      ],
      "mitigation_steps": [
        "Implement token blacklisting using Redis SET with TTL on logout",
        "Validate JWT signature and expiry on every request in middleware",
        "Use short-lived access tokens (15 min) with refresh token rotation"
      ]
    }
  ]
}
```

| Endpoint | Method | Description |
|---|---|---|
| `/analysis/` | `POST` | Analyze a system description, return STRIDE threats |
| `/analysis/history` | `GET` | Return all previously stored analyses |
| `/analysis/history` | `DELETE` | Permanently delete all stored analyses |
| `/` | `GET` | Health check (`{ "message": "TARA Threat Analyzer Running" }`) |

**`DELETE /analysis/history` response**
```json
{ "message": "History cleared successfully" }
```

> 📚 Interactive docs: [`/docs`](http://127.0.0.1:8000/docs) (Swagger UI) · [`/redoc`](http://127.0.0.1:8000/redoc)

---

## 📁 Project Structure

```
TARA-threat-analyzer/
│
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI entry point, CORS, router registration
│   │   ├── database.py              # SQLAlchemy engine, session factory, Base
│   │   ├── models.py                # ORM models (AnalysisResult, System)
│   │   ├── schemas.py               # Pydantic request/response schemas
│   │   ├── llm/llm_client.py        # Groq prompt, Ollama fallback, rule engine, normalize_threat()
│   │   ├── routes/                  # analysis.py, systems.py — API endpoints
│   │   └── services/                # threat_analyzer.py, risk_engine.py, mitigation_engine.py
│   ├── migrate_db.py                # ALTER TABLE migration script
│   ├── requirements.txt
│   └── .env                         # GROQ_API_KEY (not committed)
│
├── frontend/
│   └── src/app/
│       ├── page.tsx                 # Landing page
│       ├── layout.tsx               # Root layout, WorkspaceShell
│       ├── dashboard/page.tsx       # Main analysis dashboard
│       ├── history/page.tsx         # Threat history table
│       ├── reports/page.tsx         # Aggregated reports + charts
│       ├── settings/page.tsx        # Configuration + system status
│       └── components/              # Sidebar, RiskChart, TabContext, WorkspaceShell...
│
└── README.md
```

**Separation of concerns at a glance:** the `backend/` owns prompting, scoring, and persistence; the `frontend/` is purely presentational and never talks to Groq, Ollama, or MySQL directly.

---

## 🚀 Setup & Installation

### Prerequisites
- Python 3.10+
- Node.js 18+
- MySQL 8+ (running locally)
- A free Groq API key → [console.groq.com](https://console.groq.com)

### 1. Clone the repository
```bash
git clone https://github.com/VedaPriya-Thota/TARA-threat-analyzer.git
cd TARA-threat-analyzer
```

### 2. Create the MySQL database
```sql
CREATE DATABASE tara_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```
Update the connection string in `backend/app/database.py` if your credentials differ:
```python
DATABASE_URL = "mysql+pymysql://root:yourpassword@localhost/tara_db"
```

### 3. Backend setup
```bash
cd backend

# Virtual environment
python -m venv .venv
.venv\Scripts\activate        # Windows
source .venv/bin/activate     # macOS / Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
echo GROQ_API_KEY=your_key_here > .env

# Run migrations (adds enrichment columns to analysis_results)
python migrate_db.py

# Start the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
> Tables are auto-created on first startup via `Base.metadata.create_all()`. Run `migrate_db.py` once if the table existed before the enrichment fields were added.

### 4. Frontend setup
```bash
cd frontend
npm install
npm run dev
```

### 5. Open the app
| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://127.0.0.1:8000 |
| Swagger UI | http://127.0.0.1:8000/docs |
| ReDoc | http://127.0.0.1:8000/redoc |

---

## 🔐 Environment Variables

Create `backend/.env`:
```env
# Required — Groq cloud inference key
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```
Read via `python-dotenv` at startup. If the key is missing, Groq is skipped automatically and the system falls back to Ollama, then the rule engine.

---

## 🗃️ Database Schema

### `analysis_results`
| Column | Type | Description |
|---|---|---|
| `id` | `INT PK` | Auto-increment primary key |
| `system_description` | `TEXT` | User-provided architecture description |
| `threat` | `VARCHAR(255)` | Threat name |
| `category` | `VARCHAR(255)` | Threat category (e.g. Injection, Authentication) |
| `stride` | `VARCHAR(50)` | STRIDE classification |
| `likelihood` | `VARCHAR(50)` | High / Medium / Low |
| `impact` | `VARCHAR(50)` | High / Medium / Low |
| `risk_score` | `INT` | Likelihood score × Impact score (max 25) |
| `risk_level` | `VARCHAR(50)` | Critical / High / Medium / Low |
| `confidence` | `INT` | LLM confidence 0–100 |
| `mitigation` | `TEXT` | One-sentence mitigation summary |
| `why_flagged` | `TEXT` | Why this specific system is vulnerable |
| `attack_impact` | `TEXT` | JSON array of 2–4 exploitation consequences |
| `mitigation_steps` | `TEXT` | JSON array of implementation-ready steps |

### `systems`
| Column | Type | Description |
|---|---|---|
| `id` | `INT PK` | Auto-increment primary key |
| `system_name` | `VARCHAR(255)` | System name |
| `description` | `TEXT` | System description |

---

## 🖥️ Application Pages

### Dashboard (`/dashboard`)
The core workspace. Paste a system description, click **Analyze System**, and get:
- **AI Insights panel** — overall risk level, top vulnerability, recommended focus area
- **Top 3 Threats** — highest-scoring threats at a glance
- **Threat Summary cards** — grouped by severity
- **Threat Report table** — STRIDE, risk, score, confidence, mitigation
- **Risk Visualization** — bar chart + percentage breakdown
- **Threat Deep Dive** — expandable accordion per threat: *Why This Threat*, *Attack Impact*, *Developer Mitigations*

### History (`/history`)
Full scrollable table of every threat from every past analysis, sorted by risk score descending.

### Reports (`/reports`)
Aggregated view across all analyses: severity count cards, risk distribution chart, AI insights, consolidated mitigation plan.

### Settings (`/settings`)
- **AI Configuration** — provider, model, mode (read-only)
- **System Status** — live backend / LLM / database connectivity check
- **Risk Scoring Behavior** — toggle Dynamic vs Static scoring
- **Analysis Parameters** — max threats slider (1–10), show/hide confidence
- **Danger Zone** — clear all history

---

## 🧠 LLM Prompt Design

The Groq prompt is engineered for structured, stack-aware output:

1. **Context detection** — the system description is classified first (Financial, IoT, Cloud, API, General) to prime the LLM with domain context
2. **Structured output requirement** — the prompt specifies an exact JSON schema with field-level instructions (e.g. `why_flagged` must reference real components like JWT, Redis, MySQL)
3. **Low temperature (0.3)** — reduces hallucination, keeps output consistent
4. **Normalization** — `normalize_threat()` post-processes every response to handle string-as-list fields, empty arrays, and missing fields

---

## 🔄 Fallback Chain

TARA never surfaces an LLM-availability error to the user:

```
1. Groq (LLaMA 3.3-70B)     ← primary, cloud-based
        ↓ fails (no key / timeout)
2. Ollama (llama3.2:1b)      ← local model, if running on :11434
        ↓ fails (not installed)
3. Built-in rule engine       ← keyword-based, always available
   (context-specific hardcoded threats for Financial / IoT / General)
```

---

## 🛣️ Future Improvements

- 🔐 Multi-user authentication system
- 🧩 Role-based access control (RBAC)
- ☁️ Cloud deployment (AWS / GCP)
- 🌐 Threat intelligence feed integration
- 🔍 Real-time scanning of connected code repositories
- 🔁 CI/CD security plugin for automated pre-deploy threat checks

---

## 💬 Philosophy

TARA exists on a simple premise: **security review should move at the speed of development, not slower than it.**

It isn't built to replace security engineers — it's built to give every developer a first-pass STRIDE analysis the moment an architecture takes shape, so human expertise gets spent on judgment calls instead of repetitive groundwork. The multi-tier fallback design reflects the same philosophy applied to the tool itself: **threat modeling should never be the thing that fails.**

<div align="center">

*Built with a focus on AI-assisted defense, not AI-assisted guesswork.*

</div>

