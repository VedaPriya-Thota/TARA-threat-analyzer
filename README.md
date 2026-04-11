# 🛡️ TARA - Threat Analysis and Risk Assessment System

## 📌 Overview

**TARA (Threat Analysis and Risk Assessment System)** is an AI-powered cybersecurity platform that automates threat modeling using Large Language Models (LLMs).

It analyzes system descriptions, identifies potential security threats, classifies them using the STRIDE model, calculates risk scores, and provides mitigation strategies — all through an interactive dashboard.

---

## 🎯 Problem Statement

Traditional threat modeling is:

* Manual and time-consuming
* Dependent on expert knowledge
* Prone to human error

TARA solves this by:

* Automating threat detection
* Providing structured risk assessment
* Generating actionable mitigation strategies

---

## 🚀 Key Features

* 🤖 **LLM-Based Threat Generation** (GROQ - LLaMA 3)
* 🛡️ **STRIDE Threat Classification**
* 📊 **Dynamic Risk Scoring (Likelihood × Impact)**
* 📈 **Risk Visualization Dashboard**
* 🧾 **Comprehensive Report Generation**
* 📜 **Threat History Tracking**
* ⚙️ **Configurable System Settings**
* 📉 **AI Confidence Score**

---

## 🧠 System Architecture

```
User Input (System Description)
            ↓
     Frontend (Next.js)
            ↓
     Backend API (FastAPI)
            ↓
      LLM Engine (GROQ)
            ↓
   Threat Processing Engine
   - STRIDE Classification
   - Risk Calculation
            ↓
        Database
            ↓
     Dashboard Visualization
```

---

## 🔄 System Flow

1. User enters system description
2. Frontend sends request to backend
3. Backend queries LLM (GROQ)
4. LLM generates threats
5. Backend:

   * Parses response
   * Applies STRIDE classification
   * Calculates risk score
6. Results stored in database
7. Dashboard displays:

   * Threat table
   * Risk visualization
   * Reports

---

## 🛠️ Tech Stack

### 🔹 Frontend

* Next.js (App Router)
* React
* Tailwind CSS

### 🔹 Backend

* FastAPI
* Python
* GROQ API (LLaMA 3 - 70B)

### 🔹 Concepts Used

* STRIDE Threat Modeling
* Risk Assessment Models
* Prompt Engineering
* REST APIs

---

## 📊 Risk Scoring Model

TARA uses a dynamic risk scoring approach:

```
Risk Score = Likelihood × Impact
```

| Level  | Value |
| ------ | ----- |
| High   | 5     |
| Medium | 3     |
| Low    | 1     |

### Risk Classification:

* 20–25 → Critical
* 10–19 → High
* 5–9 → Medium
* 1–4 → Low

---

## 🧾 Application Modules

### 📊 Dashboard

* Threat analysis input
* Risk visualization
* Threat report table

### 📜 Threat History

* Stores previous analyses
* Displays structured threat data

### 📄 Reports

* Aggregated threat insights
* Risk distribution
* Recommendations

### ⚙️ Settings

* Risk scoring configuration
* System status monitoring
* Data management

---

## ⚙️ Setup & Installation

### 🔹 Clone Repository

```
git clone https://github.com/VedaPriya-Thota/TARA-threat-analyzer.git
cd TARA-threat-analyzer
```

---

### 🔹 Backend Setup

```
cd backend
venv\Scripts\activate
python -m uvicorn app.main:app --reload
```

---

### 🔹 Frontend Setup

```
cd frontend
npm install
npm run dev
```

---

## 🌐 Access Application

* Frontend: http://localhost:3000
* Backend API: http://127.0.0.1:8000

---

## 📸 Screenshots (Add here)

* Dashboard UI
* Threat History Page
* Reports Page
* Settings Page

---

## 🔮 Future Enhancements

* 📄 PDF Report Export
* 🧠 Multi-model AI support
* 🏗️ Architecture-based threat input
* 🔄 Real-time threat monitoring
* 🔐 Integration with security tools

---

## 🌍 Real-World Applications

* Banking & Financial Systems
* Cloud Security Analysis
* API Security Auditing
* IoT Threat Modeling


## 📌 Conclusion

TARA bridges the gap between AI and cybersecurity by automating threat modeling and risk assessment, making security analysis faster, smarter, and more accessible.

---
