# TARA — Threat Analysis and Risk Assessment System

> AI-powered threat modeling. Describe your system architecture; TARA surfaces attack vectors, STRIDE classifications, risk scores, and developer-ready mitigations in seconds.

---

## Table of Contents

1. [Overview](#overview)
2. [Key Features](#key-features)
3. [System Architecture](#system-architecture)
4. [Project Structure](#project-structure)
5. [Tech Stack](#tech-stack)
6. [Risk Scoring Model](#risk-scoring-model)
7. [API Reference](#api-reference)
8. [Setup and Installation](#setup-and-installation)
9. [Environment Variables](#environment-variables)
10. [Database Schema](#database-schema)
11. [Application Pages](#application-pages)
12. [LLM Prompt Design](#llm-prompt-design)
13. [Fallback Chain](#fallback-chain)
14. [Future Enhancements](#future-enhancements)

---

## Overview

**TARA (Threat Analysis and Risk Assessment)** automates the threat-modeling process that would otherwise require hours of expert review. A developer pastes a plain-English description of their system; TARA returns a structured threat report aligned with the STRIDE framework, complete with risk scores, confidence percentages, and step-by-step mitigations tailored to the actual tech stack.

Traditional threat modeling is manual, slow, and expert-gated. TARA makes it instant, repeatable, and accessible.

---

## Key Features

| Feature | Description |
|---|---|
| LLM Threat Generation | GROQ-hosted LLaMA 3.3-70B generates contextual, stack-aware threats |
| STRIDE Classification | Every threat is mapped to one of the six STRIDE categories |
| Dynamic Risk Scoring | `Risk Score = Likelihood × Impact` (both on a 1/3/5 scale) |
| Why This Threat | Short explanation of why the specific system is vulnerable |
| Attack Impact Simulation | 2–4 concrete consequences if the threat is exploited |
| Developer Mitigations | Numbered, implementation-ready steps referencing the actual stack |
| AI Confidence Score | Per-threat confidence percentage with visual bar |
| Risk Visualization | Bar chart + severity breakdown for the current analysis |
| Threat History | All past analyses stored in MySQL, browsable in the History page |
| PDF Export | One-click export of the threat report |
| Responsive UI | Works on desktop and mobile; sidebar collapses on small screens |

---

## System Architecture

```
┌─────────────────────────────────────────┐
│              Browser (Next.js)          │
│                                         │
│  Landing → Dashboard → History          │
│           → Reports → Settings          │
└──────────────────┬──────────────────────┘
                   │ HTTP (axios / fetch)
                   ▼
┌─────────────────────────────────────────┐
│           FastAPI Backend               │
│                                         │
│  POST /analysis/     ← analyze system  │
│  GET  /analysis/history                │
│  DELETE /analysis/history              │
└──────┬──────────────────────┬───────────┘
       │                      │
       ▼                      ▼
┌─────────────┐      ┌────────────────────┐
│  GROQ API   │      │   MySQL Database   │
│ LLaMA 3.3  │      │  analysis_results  │
│  70B-ver.   │      │  systems           │
└──────┬──────┘      └────────────────────┘
       │ fallback if GROQ unavailable
       ▼
┌─────────────┐
│Ollama local │  → further fallback: built-in rule engine
│ llama3.2:1b │
└─────────────┘
```

---

## Project Structure

```
TARA-threat-analyzer/
│
├── backend/
│   ├── app/
│   │   ├── main.py               # FastAPI app entry point, CORS, router registration
│   │   ├── database.py           # SQLAlchemy engine, session factory, Base
│   │   ├── models.py             # ORM models (AnalysisResult, System)
│   │   ├── schemas.py            # Pydantic request/response schemas
│   │   ├── llm/
│   │   │   └── llm_client.py     # GROQ prompt, Ollama fallback, local engine,
│   │   │                         # normalize_threat() field validator
│   │   ├── routes/
│   │   │   ├── analysis.py       # /analysis/ POST/GET/DELETE endpoints
│   │   │   └── systems.py        # /systems/ endpoints
│   │   └── services/
│   │       ├── threat_analyzer.py  # Thin wrapper around llm_client
│   │       ├── risk_engine.py      # Risk score calculation helpers
│   │       └── mitigation_engine.py
│   ├── migrate_db.py             # ALTER TABLE migration script
│   ├── requirements.txt          # All Python dependencies with explanations
│   └── .env                      # GROQ_API_KEY (not committed)
│
├── frontend/
│   ├── src/app/
│   │   ├── page.tsx              # Landing page
│   │   ├── layout.tsx            # Root layout, WorkspaceShell
│   │   ├── globals.css           # All custom CSS, keyframes, responsive rules
│   │   ├── dashboard/page.tsx    # Main analysis dashboard
│   │   ├── history/page.tsx      # Threat history table
│   │   ├── reports/page.tsx      # Aggregated reports + charts
│   │   ├── settings/page.tsx     # Configuration + system status
│   │   └── components/
│   │       ├── Sidebar.tsx       # Collapsible nav sidebar
│   │       ├── BackToHome.tsx    # Fixed × button back to landing
│   │       ├── RiskChart.tsx     # Recharts bar chart component
│   │       ├── TabContext.tsx    # Tab open/close state (React context)
│   │       └── WorkspaceShell.tsx
│   ├── package.json
│   └── tsconfig.json
│
└── README.md
```

---

## Tech Stack

### Backend

| Package | Version | Purpose |
|---|---|---|
| FastAPI | 0.135.3 | REST API framework |
| Uvicorn | 0.44.0 | ASGI server |
| SQLAlchemy | 2.0.49 | ORM — MySQL models and queries |
| PyMySQL | 1.1.2 | Pure-Python MySQL driver |
| Pydantic | 2.12.5 | Request/response validation |
| groq | 1.1.2 | GROQ SDK — LLaMA 3.3-70B inference |
| requests | 2.33.1 | HTTP client for Ollama fallback |
| python-dotenv | 1.2.2 | `.env` file loading |

Full list with explanations: [`backend/requirements.txt`](backend/requirements.txt)

### Frontend

| Package | Version | Purpose |
|---|---|---|
| Next.js | 16.1.6 | React framework (App Router) |
| React | 19.2.3 | UI library |
| Tailwind CSS | 4 | Utility-first styling |
| Recharts | 3.8.0 | Risk distribution bar chart |
| axios | 1.13.6 | HTTP client for API calls |
| lucide-react | 0.577.0 | Icon set |
| jsPDF + html2canvas | 4.2.0 / 1.4.1 | PDF export |

### Database

| Item | Detail |
|---|---|
| Engine | MySQL |
| ORM | SQLAlchemy 2.0 |
| Connection | `mysql+pymysql://user:pass@localhost/tara_db` |

---

## Risk Scoring Model

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
| 20 – 25 | Critical |
| 10 – 19 | High |
| 5 – 9 | Medium |
| 1 – 4 | Low |

Max possible score: `5 × 5 = 25` (Critical).

---

## API Reference

### POST `/analysis/`

Analyze a system description and return structured threats.

**Request body**
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

---

### GET `/analysis/history`

Returns all previously stored threat analyses.

**Response** — array of threat objects (same schema as above, with `system_description` field).

---

### DELETE `/analysis/history`

Permanently deletes all records from the `analysis_results` table.

**Response**
```json
{ "message": "History cleared successfully" }
```

---

### GET `/`

Health check.

```json
{ "message": "TARA Threat Analyzer Running" }
```

Interactive docs available at `http://127.0.0.1:8000/docs` (Swagger UI) and `/redoc`.

---

## Setup and Installation

### Prerequisites

- Python 3.10 or higher
- Node.js 18 or higher
- MySQL 8+ running locally
- A GROQ API key — get one free at [console.groq.com](https://console.groq.com)

---

### 1. Clone the repository

```bash
git clone https://github.com/VedaPriya-Thota/TARA-threat-analyzer.git
cd TARA-threat-analyzer
```

---

### 2. MySQL — create the database

```sql
CREATE DATABASE tara_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Update the connection string in `backend/app/database.py` if your MySQL user or password differs:

```python
DATABASE_URL = "mysql+pymysql://root:yourpassword@localhost/tara_db"
```

---

### 3. Backend setup

```bash
cd backend

# Create and activate virtual environment
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
echo GROQ_API_KEY=your_key_here > .env

# Run database migrations (adds all columns to analysis_results)
python migrate_db.py

# Start the backend server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

> Tables are auto-created on first startup via `Base.metadata.create_all()`.
> Run `migrate_db.py` once if the table already existed before the enrichment fields were added.

---

### 4. Frontend setup

```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

---

### 5. Open the app

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://127.0.0.1:8000 |
| Swagger UI | http://127.0.0.1:8000/docs |
| ReDoc | http://127.0.0.1:8000/redoc |

---

## Environment Variables

Create a file at `backend/.env`:

```env
# Required — GROQ cloud inference key
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

The backend reads this with `python-dotenv` at startup. If the key is missing, GROQ is skipped and the system falls back to Ollama or the built-in rule engine.

---

## Database Schema

### `analysis_results`

| Column | Type | Description |
|---|---|---|
| `id` | INT PK | Auto-increment primary key |
| `system_description` | TEXT | User-provided architecture description |
| `threat` | VARCHAR(255) | Threat name |
| `category` | VARCHAR(255) | Threat category (e.g. Injection, Authentication) |
| `stride` | VARCHAR(50) | STRIDE classification |
| `likelihood` | VARCHAR(50) | High / Medium / Low |
| `impact` | VARCHAR(50) | High / Medium / Low |
| `risk_score` | INT | Likelihood score × Impact score (max 25) |
| `risk_level` | VARCHAR(50) | Critical / High / Medium / Low |
| `confidence` | INT | LLM confidence 0–100 |
| `mitigation` | TEXT | One-sentence mitigation summary |
| `why_flagged` | TEXT | Why this specific system is vulnerable |
| `attack_impact` | TEXT | JSON array of 2–4 exploitation consequences |
| `mitigation_steps` | TEXT | JSON array of implementation-ready steps |

### `systems`

| Column | Type | Description |
|---|---|---|
| `id` | INT PK | Auto-increment primary key |
| `system_name` | VARCHAR(255) | System name |
| `description` | TEXT | System description |

---

## Application Pages

### Dashboard (`/dashboard`)

The core page. Paste a system description, click **Analyze System**, and get:

- **AI Insights panel** — overall risk level, top vulnerability, recommended focus area
- **Top 3 Threats** — highest-scoring threats at a glance
- **Threat Summary cards** — grouped by severity
- **Threat Report table** — all threats with STRIDE, risk, score, confidence, mitigation
- **Risk Visualization** — bar chart + percentage breakdown
- **Threat Deep Dive** — expandable accordion per threat showing:
  - *Why This Threat* — why the described system is specifically vulnerable
  - *Attack Impact* — concrete exploitation consequences
  - *Developer Mitigations* — numbered, stack-aware implementation steps

### History (`/history`)

Full scrollable table of every threat from all past analyses, sorted by risk score descending.

### Reports (`/reports`)

Aggregated view across all stored analyses: summary cards (Critical/High/Medium/Low counts), risk distribution chart, AI insights, consolidated mitigation plan.

### Settings (`/settings`)

- **AI Configuration** — provider, model, mode (read-only display)
- **System Status** — live backend/LLM/database connectivity check
- **Risk Scoring Behavior** — toggle Dynamic vs Static scoring
- **Analysis Parameters** — max threats slider (1–10), show/hide confidence
- **Danger Zone** — clear all history

---

## LLM Prompt Design

The GROQ prompt is crafted to produce structured, stack-aware output:

1. **Context detection** — the system description is first classified (Financial, IoT, Cloud, API, General) to prime the LLM with domain context.
2. **Structured output requirement** — the prompt specifies the exact JSON schema with field-level instructions (e.g. `why_flagged` must reference actual components like JWT, Redis, MySQL).
3. **Low temperature** (`0.3`) — reduces hallucination and keeps output consistent.
4. **Normalization** — `normalize_threat()` post-processes every LLM response to handle edge cases: string fields returned as lists, empty arrays, missing fields.

---

## Fallback Chain

TARA never returns an error to the user due to LLM unavailability:

```
1. GROQ (LLaMA 3.3-70B)          ← primary, cloud-based
        ↓ fails (no key / timeout)
2. Ollama (llama3.2:1b)           ← local model, if running on :11434
        ↓ fails (not installed)
3. Built-in rule engine           ← keyword-based, always available
   (context-specific hardcoded threats for Financial / IoT / General)
```

---

## Future Enhancements

- Multi-model support (GPT-4o, Claude, Gemini)
- Architecture diagram upload (auto-extract components)
- Real-time threat monitoring with webhook alerts
- CVSS score integration
- Team collaboration and shared workspaces
- Export to JIRA / GitHub Issues
- Compliance mapping (OWASP, NIST, ISO 27001)
