"use client"

import { useState, useRef, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import axios from "axios"
import Sidebar from "../components/Sidebar"
import RiskChart from "../components/RiskChart"
import BackToHome from "../components/BackToHome"
import jsPDF from "jspdf"

/* ─────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────── */
const STEPS = [
  "Analyzing system architecture...",
  "Detecting possible threats...",
  "Applying STRIDE classification...",
  "Calculating risk scores...",
  "Generating mitigation strategies...",
]

const FILE_STEPS = [
  "Reading file content...",
  "Extracting security hints...",
  "Mapping to STRIDE model...",
  "Scoring vulnerabilities...",
  "Building mitigation plan...",
]

const URL_STEPS = [
  "Resolving target URL...",
  "Fetching surface metadata...",
  "Inspecting security headers...",
  "Mapping attack surface...",
  "Generating threat model...",
]

const ACCEPTED_EXTENSIONS = ".yaml,.yml,.json,.txt,.log"
const MAX_FILE_MB = 0.5

const SEVERITY_ORDER = ["critical", "high", "medium", "low"]

const SEVERITY_META: Record<string, { color: string; bg: string; border: string; label: string }> = {
  critical: { color: "#ef4444", bg: "rgba(239,68,68,.08)",  border: "rgba(239,68,68,.2)",  label: "Critical" },
  high:     { color: "#f97316", bg: "rgba(249,115,22,.08)", border: "rgba(249,115,22,.2)", label: "High"     },
  medium:   { color: "#f59e0b", bg: "rgba(245,158,11,.08)", border: "rgba(245,158,11,.2)", label: "Medium"   },
  low:      { color: "#38bdf8", bg: "rgba(56,189,248,.08)", border: "rgba(56,189,248,.2)", label: "Low"      },
}

/* ─────────────────────────────────────────────────────────
   SMALL SHARED COMPONENTS
───────────────────────────────────────────────────────── */
function ConfBar({ val }: { val: number }) {
  const pct   = Math.min(100, Math.max(0, val))
  const color = pct >= 75 ? "#22c55e" : pct >= 50 ? "#f59e0b" : "#ef4444"
  const label = pct >= 75 ? "High" : pct >= 50 ? "Med" : "Low"
  return (
    <div className="conf-bar-wrap">
      <div className="conf-bar-track">
        <div className="conf-bar-fill" style={{ width: `${pct}%`, background: color, boxShadow: `0 0 6px ${color}55` }} />
      </div>
      <div className="conf-bar-meta">
        <span className="conf-bar-pct" style={{ color }}>{pct}%</span>
        <span className="conf-bar-label" style={{ color }}>{label}</span>
      </div>
    </div>
  )
}

function ScoreBar({ score }: { score: number }) {
  const pct   = Math.min(100, (score / 25) * 100)
  const color = pct >= 80 ? "#ef4444" : pct >= 60 ? "#f97316" : pct >= 40 ? "#f59e0b" : "#22c55e"
  return (
    <div className="score-bar-wrap">
      <span className="score-bar-num" style={{ color }}>{score}</span>
      <div className="score-bar-track">
        <div className="score-bar-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg,#22c55e,${color})`, boxShadow: `0 0 4px ${color}44` }} />
      </div>
    </div>
  )
}

function MitigationCell({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false)
  const LIMIT = 90
  if (!text || text.length <= LIMIT) {
    return <span className="td-mitigation-text">{text}</span>
  }
  return (
    <span className="td-mitigation-text">
      {expanded ? text : text.slice(0, LIMIT) + "…"}
      {" "}
      <button className="mitigation-toggle" onClick={() => setExpanded(e => !e)}>
        {expanded ? "less" : "more"}
      </button>
    </span>
  )
}

/* ─────────────────────────────────────────────────────────
   FILE UPLOAD ZONE
───────────────────────────────────────────────────────── */
function FileUploadZone({
  file, onFile, onClear, error,
}: {
  file: File | null
  onFile: (f: File) => void
  onClear: () => void
  error: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) onFile(f)
  }

  const EXT_LABELS = ["YAML", "JSON", "TXT", "LOG"]

  return (
    <div style={{ marginTop: 14 }}>
      {/* Hidden native input */}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        style={{ display: "none" }}
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }}
      />

      {file ? (
        /* ── File selected state ── */
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "11px 14px", borderRadius: 10,
          background: "rgba(34,197,94,.05)", border: "1px solid rgba(34,197,94,.25)",
        }}>
          {/* File icon */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          <span style={{ flex: 1, fontSize: ".82rem", fontWeight: 600, color: "#86efac", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {file.name}
          </span>
          <span style={{ fontSize: ".72rem", color: "#334155", flexShrink: 0 }}>
            {(file.size / 1024).toFixed(1)} KB
          </span>
          <button
            onClick={onClear}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#475569", padding: 2, lineHeight: 0 }}
            title="Remove file"
          >
            <svg width="13" height="13" viewBox="0 0 10 10" fill="none">
              <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      ) : (
        /* ── Drop zone ── */
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: 8, padding: "22px 16px", borderRadius: 10, cursor: "pointer",
            border: `1.5px dashed ${dragging ? "rgba(56,189,248,.6)" : "rgba(56,189,248,.2)"}`,
            background: dragging ? "rgba(56,189,248,.04)" : "rgba(2,6,18,.5)",
            transition: "border-color .15s, background .15s",
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={dragging ? "#38bdf8" : "#334155"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "stroke .15s" }}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <p style={{ margin: 0, fontSize: ".8rem", fontWeight: 600, color: dragging ? "#38bdf8" : "#475569" }}>
            Drop file here or <span style={{ color: "#38bdf8", textDecoration: "underline" }}>browse</span>
          </p>
          <div style={{ display: "flex", gap: 5 }}>
            {EXT_LABELS.map(ext => (
              <span key={ext} style={{ fontSize: ".62rem", fontWeight: 700, color: "#1e3a52", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 4, padding: "1px 6px" }}>
                .{ext.toLowerCase()}
              </span>
            ))}
          </div>
          <p style={{ margin: 0, fontSize: ".67rem", color: "#1e3a52" }}>Max {MAX_FILE_MB * 1024} KB</p>
        </div>
      )}

      {error && (
        <p style={{ margin: "6px 0 0", fontSize: ".78rem", color: "#fca5a5", fontWeight: 600 }}>⚠ {error}</p>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   HINTS BANNER  (shown after file analysis)
───────────────────────────────────────────────────────── */
function HintsBanner({ filename, fileType, hints }: { filename: string; fileType: string; hints: string[] }) {
  const [open, setOpen] = useState(false)
  if (!hints.length) return null
  return (
    <div style={{
      borderRadius: 12, border: "1px solid rgba(245,158,11,.2)",
      background: "rgba(245,158,11,.04)", padding: "10px 14px",
      marginBottom: 14, animation: "fade-up .3s ease both",
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: "100%", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, padding: 0 }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        </svg>
        <span style={{ fontSize: ".72rem", fontWeight: 700, color: "#f59e0b", textTransform: "uppercase", letterSpacing: ".07em" }}>
          {hints.length} static hint{hints.length !== 1 ? "s" : ""} detected in {filename}
        </span>
        <span style={{ fontSize: ".67rem", color: "#334155", marginLeft: "auto" }}>{fileType}</span>
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#475569" strokeWidth="1.8" strokeLinecap="round"
          style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .15s" }}>
          <polyline points="2 4 6 8 10 4"/>
        </svg>
      </button>
      {open && (
        <ul style={{ margin: "10px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
          {hints.map((h, i) => (
            <li key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#f59e0b", flexShrink: 0, marginTop: 6 }} />
              <code style={{ fontSize: ".71rem", color: "#94a3b8", lineHeight: 1.5, wordBreak: "break-all", fontFamily: "ui-monospace, monospace" }}>{h}</code>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   EMPTY STATE  (shown before any analysis is run)
───────────────────────────────────────────────────────── */
const EXAMPLE_STORIES = [
  "As a user, I want to reset my password via email link so that I can regain account access.",
  "As an admin, I want to export all user data as CSV so that I can share reports with stakeholders.",
  "As a customer, I want to upload a profile photo so that my account shows my identity.",
  "As a seller, I want to update product prices in bulk so that I can respond to market changes quickly.",
  "As a user, I want to log in with my Google account so that I don't have to remember a password.",
  "As a manager, I want to delete any employee record so that I can keep the directory accurate.",
]

function EmptyState({ onChipClick }: { onChipClick: (text: string) => void }) {
  return (
    <div className="empty-state-grid">
      {/* Left placeholder — mirrors the threat table panel */}
      <div className="panel empty-panel">
        <div className="panel-head"><h2>Threat Report</h2></div>
        <div className="es-body">
          <div className="es-icon-ring">
            <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#1e3a52" }}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <p className="es-headline">No analysis run yet</p>
          <p className="es-sub">
            Enter a user story or system description and click <strong>Analyze</strong> to detect threats, STRIDE classifications, and risk scores.
          </p>
          <div className="es-examples">
            <span className="es-examples-label">Try these user stories:</span>
            <div className="es-chips">
              {EXAMPLE_STORIES.map(s => (
                <button key={s} className="es-chip" onClick={() => onChipClick(s)} title={s}>
                  {s.length > 52 ? s.slice(0, 50) + "…" : s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right placeholder — mirrors the risk visualization panel */}
      <div className="panel empty-panel">
        <div className="panel-head"><h2>Risk Visualization</h2></div>
        <div className="es-body es-body-chart">
          {/* Ghost bars */}
          <div className="es-ghost-chart">
            {[60, 85, 45, 25].map((h, i) => (
              <div key={i} className="es-ghost-bar-wrap">
                <div className="es-ghost-bar" style={{ height: `${h}%` }} />
                <span className="es-ghost-label">
                  {["Critical","High","Medium","Low"][i]}
                </span>
              </div>
            ))}
          </div>
          <p className="es-sub" style={{ marginTop: 20, textAlign: "center" }}>
            Risk distribution chart will appear here
          </p>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   LOADING STATE  (step-by-step messages)
───────────────────────────────────────────────────────── */
const THINKING_MSGS = [
  "Parsing input…",
  "Mapping attack surface…",
  "Classifying threats…",
  "Calculating risk scores…",
  "Generating mitigations…",
  "Cross-referencing threat vectors…",
  "Evaluating exploitability…",
  "Scoring blast radius…",
  "Consulting threat intelligence…",
  "Building mitigation plan…",
]

/* Rotating phrases shown below the main step — adds perceived AI depth */
const SUBPHRASES: Record<string, string[]> = {
  text: [
    "Applying STRIDE methodology…",
    "Identifying trust boundaries…",
    "Checking for privilege escalation paths…",
    "Reviewing authentication flows…",
    "Analysing data exposure vectors…",
    "Mapping lateral movement risks…",
  ],
  file: [
    "Parsing configuration keys…",
    "Scanning for hardcoded secrets…",
    "Checking permission settings…",
    "Detecting injection surfaces…",
    "Reviewing exposed endpoints…",
    "Flagging deprecated dependencies…",
  ],
  url: [
    "Fingerprinting server stack…",
    "Enumerating security headers…",
    "Checking CORS policy…",
    "Probing redirect chains…",
    "Mapping exposed sub-resources…",
    "Assessing TLS configuration…",
  ],
}

function AnalysisLoader({ step, fileMode = false, urlMode = false }: { step: number; fileMode?: boolean; urlMode?: boolean }) {
  const steps     = urlMode ? URL_STEPS : fileMode ? FILE_STEPS : STEPS
  const modeKey   = urlMode ? "url" : fileMode ? "file" : "text"
  const phrases   = SUBPHRASES[modeKey]

  const [thinkIdx,  setThinkIdx]  = useState(0)
  const [subIdx,    setSubIdx]    = useState(0)
  const [subVisible,setSubVisible]= useState(true)
  const [dotCount,  setDotCount]  = useState(1)
  const [elapsed,   setElapsed]   = useState(0)

  /* Rotate thinking messages */
  useEffect(() => {
    const t = setInterval(() => setThinkIdx(i => (i + 1) % THINKING_MSGS.length), 1800)
    return () => clearInterval(t)
  }, [])

  /* Cross-fade sub-phrases */
  useEffect(() => {
    const cycle = () => {
      setSubVisible(false)
      setTimeout(() => {
        setSubIdx(i => (i + 1) % phrases.length)
        setSubVisible(true)
      }, 300)
    }
    const t = setInterval(cycle, 2400)
    return () => clearInterval(t)
  }, [phrases])

  /* Animated ellipsis dots */
  useEffect(() => {
    const t = setInterval(() => setDotCount(d => (d % 3) + 1), 500)
    return () => clearInterval(t)
  }, [])

  /* Elapsed-time counter */
  useEffect(() => {
    const t = setInterval(() => setElapsed(s => s + 1), 1000)
    return () => clearInterval(t)
  }, [])

  const pct = Math.round((step / (steps.length - 1)) * 100)

  return (
    <div className="analysis-loader">
      {/* ── Spinner ── */}
      <div className="loader-spinner">
        <div className="spinner-ring spinner-ring--outer" />
        <div className="spinner-ring spinner-ring--mid" />
        <div className="spinner-ring spinner-ring--inner" />
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="#38bdf8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
          style={{ position: "relative", zIndex: 1 }}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      </div>

      {/* ── Steps list ── */}
      <div className="loader-steps">
        <div className="loader-title-row">
          <span className="loader-title">
            {urlMode ? "URL Surface Mapping" : fileMode ? "File Threat Analysis" : "AI Security Analysis"}
          </span>
          <span className="loader-elapsed">{elapsed}s</span>
        </div>

        {steps.map((text, i) => {
          const state = i < step ? "done" : i === step ? "active" : "pending"
          return (
            <div key={i} className={`loader-step loader-step--${state}`}>
              <span className="step-dot">
                {state === "done"    && <DoneIcon />}
                {state === "active"  && <ActiveIcon />}
                {state === "pending" && <PendingIcon />}
              </span>
              <span className="step-text">
                {text}
                {state === "active" && (
                  <span className="step-dots" aria-hidden>
                    {".".repeat(dotCount)}
                  </span>
                )}
              </span>
            </div>
          )
        })}

        {/* Sub-phrase — cross-fades between technical detail messages */}
        <div className="loader-subphrase" style={{ opacity: subVisible ? 1 : 0 }}>
          <span className="loader-subphrase-icon">⬡</span>
          {phrases[subIdx]}
        </div>
      </div>

      {/* ── Progress bar + thinking message ── */}
      <div className="loader-progress">
        {/* Stage segments — one per step */}
        <div className="stage-track">
          {steps.map((_, i) => {
            const state = i < step ? "done" : i === step ? "active" : "idle"
            return (
              <div
                key={i}
                className={`stage-segment${state === "done" ? " stage-segment--done" : state === "active" ? " stage-segment--active" : ""}`}
              />
            )
          })}
        </div>
        <div className="stage-labels">
          {steps.map((text, i) => {
            const state = i < step ? "done" : i === step ? "active" : "idle"
            return (
              <span key={i} className={`stage-label${state === "done" ? " stage-label--done" : state === "active" ? " stage-label--active" : ""}`}>
                {text.split(" ")[0]}
              </span>
            )
          })}
        </div>

        <div className="loader-progress-track" style={{ marginTop: 8 }}>
          <div className="loader-progress-fill" style={{ width: `${pct}%` }} />
          <div className="loader-progress-glow" style={{ left: `${pct}%` }} />
        </div>
        <span className="loader-progress-pct">{pct}%</span>
        <span className="loader-thinking-msg">{THINKING_MSGS[thinkIdx]}</span>
      </div>
    </div>
  )
}

function DoneIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
function ActiveIcon() {
  return (
    <span className="loader-active-dot" />
  )
}
function PendingIcon() {
  return <span className="pending-dot" />
}

/* ─────────────────────────────────────────────────────────
   ANIMATED COUNTER
   Counts up from 0 → target over ~600 ms using easeOut
───────────────────────────────────────────────────────── */
function useCountUp(target: number, duration = 600): number {
  const [display, setDisplay] = useState(0)
  const prevTarget = useRef(0)

  useEffect(() => {
    if (target === prevTarget.current) return
    const from  = prevTarget.current
    prevTarget.current = target
    const start = performance.now()
    const tick  = (now: number) => {
      const t   = Math.min((now - start) / duration, 1)
      const ease = 1 - Math.pow(1 - t, 3)            // cubic ease-out
      setDisplay(Math.round(from + (target - from) * ease))
      if (t < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [target, duration])

  return display
}

/* ─────────────────────────────────────────────────────────
   MITIGATION PRIORITY BADGE
───────────────────────────────────────────────────────── */
function priorityFromScore(score: number): { label: string; color: string; bg: string } {
  if (score >= 20) return { label: "Immediate", color: "#ef4444", bg: "rgba(239,68,68,.1)"  }
  if (score >= 14) return { label: "High",      color: "#f97316", bg: "rgba(249,115,22,.1)" }
  if (score >= 8)  return { label: "Moderate",  color: "#f59e0b", bg: "rgba(245,158,11,.1)" }
  return              { label: "Low",       color: "#38bdf8", bg: "rgba(56,189,248,.08)" }
}

function MitigationPriority({ score }: { score: number }) {
  const p = priorityFromScore(score)
  return (
    <span style={{
      display: "inline-block",
      fontSize: ".62rem", fontWeight: 700, letterSpacing: ".04em",
      padding: "2px 7px", borderRadius: 999,
      color: p.color, background: p.bg,
      border: `1px solid ${p.color}33`,
      whiteSpace: "nowrap",
    }}>
      {p.label}
    </span>
  )
}

/* ─────────────────────────────────────────────────────────
   WHY FLAGGED — one-line explainability hint
───────────────────────────────────────────────────────── */
function whyFlagged(r: any): string {
  const level = r.risk_level?.toLowerCase()
  const score = r.risk_score ?? 0
  const stride = r.stride ?? ""
  const cat = r.category ?? ""

  if (level === "critical") return `Critical score (${score}) — direct exploitation path via ${stride || cat || "attack surface"}`
  if (level === "high")     return `High risk (${score}) — ${stride ? `${stride} vector` : cat || "exploitable vulnerability"} identified`
  if (level === "medium")   return `Medium risk (${score}) — ${cat || stride || "threat"} requires attention under certain conditions`
  return `Low risk (${score}) — ${cat || stride || "threat"} unlikely without prior access`
}

/* ─────────────────────────────────────────────────────────
   AI INSIGHTS PANEL
───────────────────────────────────────────────────────── */
function AIInsights({ threats }: { threats: any[] }) {
  if (!threats.length) return null

  const sorted      = [...threats].sort((a, b) => (b.risk_score ?? 0) - (a.risk_score ?? 0))
  const top         = sorted[0]
  const avgScore    = threats.reduce((s, r) => s + (r.risk_score ?? 0), 0) / threats.length
  const critCount   = threats.filter(r => r.risk_level?.toLowerCase() === "critical").length
  const highCount   = threats.filter(r => r.risk_level?.toLowerCase() === "high").length

  // Overall risk label
  const overallRisk =
    critCount > 0 ? { label: "Critical", color: "#ef4444" } :
    highCount > 1 ? { label: "High",     color: "#f97316" } :
    avgScore > 10  ? { label: "Elevated", color: "#f59e0b" } :
                     { label: "Moderate", color: "#38bdf8" }

  // Most common STRIDE category
  const strideCounts: Record<string, number> = {}
  threats.forEach(r => { if (r.stride) strideCounts[r.stride] = (strideCounts[r.stride] ?? 0) + 1 })
  const topStride = Object.entries(strideCounts).sort((a, b) => b[1] - a[1])[0]?.[0]

  // Focus area: category of highest-scoring threat
  const focusArea = top.category || top.stride || "Authentication"

  return (
    <div style={{
      background: "rgba(10,15,28,.9)",
      border: "1px solid rgba(56,189,248,.12)",
      borderRadius: 14,
      padding: "14px 18px",
      marginBottom: 16,
      display: "flex",
      gap: 0,
      flexWrap: "wrap",
    }}>
      {/* Header */}
      <div style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span className="ai-live-dot" />
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span style={{ fontSize: ".72rem", fontWeight: 700, color: "#38bdf8", textTransform: "uppercase", letterSpacing: ".08em" }}>
          AI Insights
        </span>
        <span style={{ fontSize: ".65rem", color: "#1e3a52", marginLeft: "auto" }}>Derived from analysis results</span>
      </div>

      {/* Three insight cells */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, width: "100%" }}>

        {/* Overall risk */}
        <div className={`insight-item${critCount > 0 ? " insight-item--critical" : ""}`} style={{ animation: "fade-up-sm 200ms var(--ease-out) both 60ms" }}>
          <div style={{ fontSize: ".62rem", color: "#334155", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600, marginBottom: 5 }}>Overall System Risk</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{
              width: 8, height: 8, borderRadius: "50%", background: overallRisk.color,
              boxShadow: `0 0 8px ${overallRisk.color}`, flexShrink: 0,
            }} />
            <span style={{ fontWeight: 800, fontSize: ".9rem", color: overallRisk.color }}>{overallRisk.label}</span>
          </div>
          <div style={{ fontSize: ".68rem", color: "#475569", marginTop: 4 }}>
            {critCount > 0 ? `${critCount} critical threat${critCount > 1 ? "s" : ""} require immediate action`
              : highCount > 0 ? `${highCount} high-severity threat${highCount > 1 ? "s" : ""} need prompt review`
              : `Avg score ${avgScore.toFixed(1)} — manageable with planned mitigations`}
          </div>
        </div>

        {/* Top vulnerability */}
        <div className="insight-item insight-item--top" style={{ animation: "fade-up-sm 200ms var(--ease-out) both 110ms" }}>
          <div style={{ fontSize: ".62rem", color: "#334155", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600, marginBottom: 5 }}>Top Vulnerability</div>
          <div style={{ fontWeight: 700, fontSize: ".78rem", color: "#cbd5e1", lineHeight: 1.35, marginBottom: 4 }}>
            {top.threat.length > 48 ? top.threat.slice(0, 46) + "…" : top.threat}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <MitigationPriority score={top.risk_score ?? 0} />
            {top.stride && (
              <span className={`stride-pill ${top.stride.toLowerCase().replaceAll(" ", "-")}`} style={{ fontSize: ".6rem" }}>
                {top.stride}
              </span>
            )}
          </div>
        </div>

        {/* Recommended focus */}
        <div className="insight-item insight-item--focus" style={{ animation: "fade-up-sm 200ms var(--ease-out) both 160ms" }}>
          <div style={{ fontSize: ".62rem", color: "#334155", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600, marginBottom: 5 }}>Recommended Focus</div>
          <div style={{ fontWeight: 700, fontSize: ".82rem", color: "#e2e8f0", marginBottom: 4 }}>{focusArea}</div>
          <div style={{ fontSize: ".68rem", color: "#475569", lineHeight: 1.45 }}>
            {topStride
              ? `${topStride} is the dominant attack pattern — prioritise defences here`
              : "Harden the highest-scoring attack surface first"}
          </div>
        </div>

      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   TOP 3 THREATS
───────────────────────────────────────────────────────── */
function Top3Threats({ threats }: { threats: any[] }) {
  if (threats.length < 2) return null   // only useful with enough data

  const top3 = [...threats]
    .sort((a, b) => (b.risk_score ?? 0) - (a.risk_score ?? 0))
    .slice(0, 3)

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: ".7rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: ".07em" }}>Top 3 Threats</span>
        <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,.04)" }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {top3.map((r, i) => {
          const level = r.risk_level?.toLowerCase() ?? "low"
          const meta  = SEVERITY_META[level] ?? SEVERITY_META.low
          return (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 10,
              background: "rgba(10,15,28,.7)", border: `1px solid ${meta.border}`,
              borderRadius: 10, padding: "9px 14px",
              animation: `fade-up-sm 200ms var(--ease-out) both ${50 + i * 50}ms`,
            }}>
              {/* Rank */}
              <span style={{ fontSize: ".65rem", fontWeight: 800, color: "#1e3a52", width: 16, textAlign: "center", flexShrink: 0 }}>
                #{i + 1}
              </span>
              {/* Threat name */}
              <span style={{ flex: 1, fontSize: ".78rem", fontWeight: 600, color: "#cbd5e1", minWidth: 0 }}>
                {r.threat.length > 55 ? r.threat.slice(0, 53) + "…" : r.threat}
              </span>
              {/* Why flagged */}
              <span style={{ fontSize: ".67rem", color: "#334155", flex: "0 1 200px", lineHeight: 1.35, textAlign: "right" }}>
                {r.category || r.stride || ""}
                {r.category && r.stride ? ` · ${r.stride}` : ""}
              </span>
              {/* Priority badge */}
              <MitigationPriority score={r.risk_score ?? 0} />
              {/* Risk pill */}
              <span className={`risk-pill ${level}`}>{meta.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   TOP THREAT SUMMARY CARDS
───────────────────────────────────────────────────────── */
function TopThreatSummary({ threats }: { threats: any[] }) {
  const animCount = useCountUp(threats.length)
  // One card per severity level that actually has threats
  const bySeverity = SEVERITY_ORDER
    .map(level => ({
      level,
      meta: SEVERITY_META[level],
      items: threats
        .filter(t => t.risk_level?.toLowerCase() === level)
        .sort((a, b) => (b.risk_score ?? 0) - (a.risk_score ?? 0)),
    }))
    .filter(g => g.items.length > 0)

  if (!bySeverity.length) return null

  return (
    <div className="tts-wrapper">
      <div className="tts-header">
        <span className="tts-title">Threat Summary</span>
        <span className="tts-count"><span className="count-up">{animCount}</span> threat{animCount !== 1 ? "s" : ""} detected</span>
      </div>
      <div className="tts-grid">
        {bySeverity.map(({ level, meta, items }, idx) => (
          <div
            key={level}
            className="tts-card"
            style={{ borderColor: meta.border, background: meta.bg, animationDelay: `${40 + idx * 55}ms` }}
          >
            {/* Header row */}
            <div className="tts-card-head">
              <span className="tts-card-count" style={{ color: meta.color }}>{items.length}</span>
              <span className={`risk-pill ${level}`}>{meta.label}</span>
            </div>
            {/* Top threat name for this level */}
            <p className="tts-card-name" title={items[0].threat}>
              {items[0].threat.length > 52
                ? items[0].threat.slice(0, 50) + "…"
                : items[0].threat}
            </p>
            {/* Score + STRIDE */}
            <div className="tts-card-meta">
              <span className="tts-card-score" style={{ color: meta.color }}>
                Score {items[0].risk_score ?? "—"}
              </span>
              {items[0].stride && (
                <span className={`stride-pill ${items[0].stride.toLowerCase().replaceAll(" ", "-")}`}>
                  {items[0].stride}
                </span>
              )}
            </div>
            {items.length > 1 && (
              <p className="tts-card-more">+{items.length - 1} more</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   THREAT DEEP DIVE
───────────────────────────────────────────────────────── */
const STRIDE_COLOR: Record<string, string> = {
  "spoofing":               "#fb7185",
  "tampering":              "#fb923c",
  "repudiation":            "#c084fc",
  "information disclosure": "#60a5fa",
  "denial of service":      "#f87171",
  "elevation of privilege": "#4ade80",
}

function ThreatDeepDive({ threats }: { threats: any[] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null)

  const sorted = [...threats].sort((a, b) => (b.risk_score ?? 0) - (a.risk_score ?? 0))

  return (
    <div style={{ marginTop: 8, animation: "fade-up .4s ease both .05s" }}>
      {/* Section header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <svg className="tdd-section-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <span style={{ fontSize: ".72rem", fontWeight: 700, color: "#818cf8", textTransform: "uppercase", letterSpacing: ".1em" }}>
            Threat Deep Dive
          </span>
        </div>
        <div style={{ flex: 1, height: 1, background: "rgba(129,140,248,.12)" }} />
        <span style={{ fontSize: ".67rem", color: "#334155", fontWeight: 500 }}>
          Click a threat to expand details
        </span>
      </div>

      {/* Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {sorted.map((r, i) => {
          const level    = r.risk_level?.toLowerCase() ?? "low"
          const meta     = SEVERITY_META[level] ?? SEVERITY_META.low
          const priority = priorityFromScore(r.risk_score ?? 0)
          const isOpen   = openIdx === i
          const strideKey = r.stride?.toLowerCase() ?? ""
          const strideColor = STRIDE_COLOR[strideKey] ?? "#94a3b8"

          // Normalise list fields defensively
          const attackImpact: string[]    = Array.isArray(r.attack_impact)    ? r.attack_impact    : []
          const mitigSteps:   string[]    = Array.isArray(r.mitigation_steps) ? r.mitigation_steps : []
          const whyText: string           = r.why_flagged || whyFlagged(r)
          const evidenceText: string      = r.evidence || ""
          const isFileThreat: boolean     = Boolean(r.source_filename)
          const isUrlThreat: boolean      = Boolean(r.source_url)

          return (
            <div
              key={i}
              className={`tdd-card threat-card-host threat-card-discover${isOpen ? " tdd-card--open" : ""}`}
              style={{
                border: `1px solid ${isOpen ? meta.border : "rgba(30,41,59,.8)"}`,
                background: isOpen ? meta.bg : "rgba(10,15,28,.7)",
                animationDelay: `${30 + i * 40}ms`,
                // Pass accent colour for the ::before top-line
                ["--tdd-accent" as any]: meta.color,
              }}
            >
              {/* ── Collapsed header row ── */}
              <button
                className="tdd-header-btn"
                onClick={() => setOpenIdx(isOpen ? null : i)}
              >
                {/* Rank — styled circle badge */}
                <span className={`top3-rank top3-rank--${i < 3 ? i + 1 : "n"}`}>
                  {i + 1}
                </span>

                {/* Threat name */}
                <span style={{ flex: 1, fontSize: ".82rem", fontWeight: 700, color: "#cbd5e1", lineHeight: 1.3, minWidth: 0 }}>
                  {r.threat}
                </span>

                {/* STRIDE pill */}
                <span style={{
                  fontSize: ".62rem", fontWeight: 700, color: strideColor,
                  background: `${strideColor}12`, border: `1px solid ${strideColor}30`,
                  borderRadius: 6, padding: "2px 8px", whiteSpace: "nowrap", flexShrink: 0,
                }}>
                  {r.stride}
                </span>

                {/* Risk pill */}
                <span className={`risk-pill ${level}`} style={{ flexShrink: 0 }}>
                  {meta.label}
                </span>

                {/* Priority */}
                <MitigationPriority score={r.risk_score ?? 0} />

                {/* Chevron */}
                <svg
                  width="12" height="12" viewBox="0 0 12 12" fill="none"
                  stroke="#334155" strokeWidth="1.8" strokeLinecap="round"
                  style={{ flexShrink: 0, transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .18s" }}
                >
                  <polyline points="2 4 6 8 10 4"/>
                </svg>
              </button>

              {/* ── Expanded body ── */}
              {isOpen && (
                <div className="tdd-body">
                  <div className="tdd-divider" />

                  {/* Three-column grid */}
                  <div className="tdd-detail-grid">

                    {/* Why this threat */}
                    <div className="tdd-sub-panel">
                      <div className="tdd-sub-title">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2.2" strokeLinecap="round">
                          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                        <span className="tdd-sub-label" style={{ color: "#818cf8" }}>Why This Threat</span>
                        {isFileThreat && (
                          <span className="tdd-sub-badge" style={{ color: "#f59e0b", background: "rgba(245,158,11,.1)", border: "1px solid rgba(245,158,11,.2)" }}>FILE</span>
                        )}
                        {isUrlThreat && !isFileThreat && (
                          <span className="tdd-sub-badge" style={{ color: "#a78bfa", background: "rgba(167,139,250,.1)", border: "1px solid rgba(167,139,250,.2)" }}>URL</span>
                        )}
                      </div>
                      <p className="tdd-sub-text">{whyText}</p>
                      {evidenceText && (
                        <div className="tdd-evidence">
                          <span className="tdd-evidence-label">Evidence</span>
                          <code className="tdd-evidence-code">{evidenceText}</code>
                        </div>
                      )}
                    </div>

                    {/* Attack impact */}
                    <div className="tdd-sub-panel">
                      <div className="tdd-sub-title">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={meta.color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                        </svg>
                        <span className="tdd-sub-label" style={{ color: meta.color }}>Attack Impact</span>
                      </div>
                      {attackImpact.length > 0 ? (
                        <ul className="tdd-impact-list">
                          {attackImpact.map((item, j) => (
                            <li key={j} className="tdd-impact-item">
                              <span className="tdd-impact-dot" style={{ background: meta.color }} />
                              <span className="tdd-impact-text">{item}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="tdd-empty">No impact details available.</p>
                      )}
                    </div>

                    {/* Developer mitigations */}
                    <div className="tdd-sub-panel">
                      <div className="tdd-sub-title">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        <span className="tdd-sub-label" style={{ color: "#22c55e" }}>Developer Mitigations</span>
                      </div>
                      {mitigSteps.length > 0 ? (
                        <ol className="tdd-mitigation-list">
                          {mitigSteps.map((step, j) => (
                            <li key={j} className="tdd-mitigation-item">
                              <span className="tdd-mitigation-num">{j + 1}</span>
                              <span className="tdd-mitigation-text">{step}</span>
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <p className="tdd-empty">{r.mitigation || "Apply security best practices."}</p>
                      )}
                    </div>

                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   URL INPUT ZONE
───────────────────────────────────────────────────────── */
function URLInputZone({ value, onChange, error }: { value: string; onChange: (v: string) => void; error: string }) {
  const isGitHub = /^https?:\/\/github\.com\//i.test(value.trim())
  const isHTTP   = /^https?:\/\//i.test(value.trim())
  const hasValue = value.trim().length > 0

  return (
    <div style={{ marginTop: 14 }}>
      {/* Explainer pills */}
      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        {[
          { icon: "🌐", label: "Public website", desc: "analyzed via HTTP metadata & security headers" },
          { icon: "🐙", label: "GitHub repo", desc: "analyzed via repository file tree" },
        ].map(({ icon, label, desc }) => (
          <div key={label} style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "5px 10px", borderRadius: 8,
            background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)",
            fontSize: ".7rem", color: "#475569",
          }}>
            <span style={{ fontSize: ".82rem" }}>{icon}</span>
            <span style={{ fontWeight: 700, color: "#64748b" }}>{label}</span>
            <span>— {desc}</span>
          </div>
        ))}
      </div>

      {/* Input field */}
      <div style={{ position: "relative" }}>
        {/* Type indicator */}
        <div style={{
          position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
          display: "flex", alignItems: "center", gap: 5, pointerEvents: "none",
        }}>
          {hasValue && isGitHub ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#94a3b8" aria-label="GitHub">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12"/>
            </svg>
          ) : hasValue && isHTTP ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2" strokeLinecap="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
          )}
        </div>

        <input
          type="url"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="https://example.com  or  https://github.com/owner/repo"
          style={{
            width: "100%", boxSizing: "border-box",
            paddingLeft: 36, paddingRight: hasValue && (isGitHub || isHTTP) ? 80 : 14,
            paddingTop: 11, paddingBottom: 11,
            background: "rgba(2,6,18,.6)", border: "1px solid rgba(56,189,248,.18)",
            borderRadius: 10, color: "#e2e8f0", fontSize: ".84rem",
            outline: "none", fontFamily: "ui-monospace, monospace",
            transition: "border-color .15s",
          }}
          onFocus={e => { e.target.style.borderColor = "rgba(56,189,248,.45)" }}
          onBlur={e => { e.target.style.borderColor = "rgba(56,189,248,.18)" }}
        />

        {/* Type badge */}
        {hasValue && (isGitHub || isHTTP) && (
          <span style={{
            position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
            fontSize: ".62rem", fontWeight: 700,
            color: isGitHub ? "#a78bfa" : "#38bdf8",
            background: isGitHub ? "rgba(167,139,250,.1)" : "rgba(56,189,248,.1)",
            border: `1px solid ${isGitHub ? "rgba(167,139,250,.25)" : "rgba(56,189,248,.25)"}`,
            borderRadius: 5, padding: "2px 7px", pointerEvents: "none",
          }}>
            {isGitHub ? "GitHub" : "Website"}
          </span>
        )}
      </div>

      {error && (
        <p style={{ margin: "6px 0 0", fontSize: ".78rem", color: "#fca5a5", fontWeight: 600 }}>⚠ {error}</p>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   SURFACE INFO BANNER  (shown after URL analysis)
───────────────────────────────────────────────────────── */
function SurfaceInfoBanner({ urlType, surfaceInfo }: { urlType: string; surfaceInfo: any }) {
  const [open, setOpen] = useState(false)
  if (!surfaceInfo || Object.keys(surfaceInfo).length === 0) return null

  const isGitHub = urlType === "github"

  const items: { label: string; value: string }[] = isGitHub ? [
    { label: "Repository", value: `${surfaceInfo.owner}/${surfaceInfo.repo}` },
    { label: "Total files", value: String(surfaceInfo.total_files ?? "—") },
    { label: "Notable paths", value: surfaceInfo.notable_paths?.length ? `${surfaceInfo.notable_paths.length} detected` : "none" },
  ] : [
    { label: "Final URL", value: surfaceInfo.final_url ?? "—" },
    { label: "Status", value: String(surfaceInfo.status_code ?? "—") },
    { label: "Server", value: surfaceInfo.server ?? "not disclosed" },
    { label: "X-Powered-By", value: surfaceInfo.x_powered_by ?? "not disclosed" },
    { label: "Missing headers", value: surfaceInfo.missing_security_headers?.length ? surfaceInfo.missing_security_headers.join(", ") : "none" },
    { label: "Stack signals", value: surfaceInfo.stack_signals?.length ? surfaceInfo.stack_signals.join(", ") : "none" },
  ]

  const accentColor = isGitHub ? "#a78bfa" : "#38bdf8"
  const accentBg    = isGitHub ? "rgba(167,139,250,.04)" : "rgba(56,189,248,.04)"
  const accentBorder = isGitHub ? "rgba(167,139,250,.2)" : "rgba(56,189,248,.2)"

  return (
    <div style={{
      borderRadius: 12, border: `1px solid ${accentBorder}`,
      background: accentBg, padding: "10px 14px",
      marginBottom: 14, animation: "fade-up .3s ease both",
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: "100%", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, padding: 0 }}
      >
        {isGitHub ? (
          <svg width="13" height="13" viewBox="0 0 24 24" fill={accentColor} aria-label="GitHub">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12"/>
          </svg>
        ) : (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
        )}
        <span style={{ fontSize: ".72rem", fontWeight: 700, color: accentColor, textTransform: "uppercase", letterSpacing: ".07em" }}>
          Surface scan — {isGitHub ? "GitHub repository" : "website metadata"}
        </span>
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#475569" strokeWidth="1.8" strokeLinecap="round"
          style={{ flexShrink: 0, marginLeft: "auto", transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .15s" }}>
          <polyline points="2 4 6 8 10 4"/>
        </svg>
      </button>

      {open && (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 5 }}>
          {items.map(({ label, value }) => (
            <div key={label} style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
              <span style={{ fontSize: ".67rem", fontWeight: 700, color: "#334155", minWidth: 110, flexShrink: 0 }}>{label}</span>
              <span style={{ fontSize: ".71rem", color: "#64748b", wordBreak: "break-all", fontFamily: "ui-monospace, monospace" }}>{value}</span>
            </div>
          ))}
          {isGitHub && surfaceInfo.notable_paths?.length > 0 && (
            <div style={{ marginTop: 6 }}>
              <span style={{ fontSize: ".67rem", fontWeight: 700, color: "#334155" }}>Notable paths</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                {surfaceInfo.notable_paths.slice(0, 15).map((p: string) => (
                  <code key={p} style={{
                    fontSize: ".62rem", color: "#a78bfa", background: "rgba(167,139,250,.06)",
                    border: "1px solid rgba(167,139,250,.15)", borderRadius: 4, padding: "1px 6px",
                    fontFamily: "ui-monospace, monospace",
                  }}>{p}</code>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────── */
function Dashboard() {
  const searchParams = useSearchParams()

  const [description, setDescription] = useState(() => {
    // Pre-fill from history "re-run" link (?q=…)
    // Can't call hooks inside useState initializer directly, so we'll
    // handle it in a useEffect below.
    return ""
  })
  const [results, setResults]         = useState<any[]>([])
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState("")
  const [step, setStep]               = useState(0)
  const stepRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Pre-fill description when arriving from History page via ?q=
  useEffect(() => {
    const q = searchParams.get("q")
    if (q) setDescription(decodeURIComponent(q))
  }, [searchParams])

  // ── File upload state ──
  const [analysisMode, setAnalysisMode]   = useState<"text" | "file" | "url">("text")
  const [uploadedFile, setUploadedFile]   = useState<File | null>(null)
  const [fileError, setFileError]         = useState("")
  const [fileHints, setFileHints]         = useState<string[]>([])
  const [fileType, setFileType]           = useState("")
  const [fileName, setFileName]           = useState("")

  // ── URL surface mapper state ──
  const [urlInput, setUrlInput]           = useState("")
  const [urlError, setUrlError]           = useState("")
  const [surfaceInfo, setSurfaceInfo]     = useState<any>(null)
  const [urlType, setUrlType]             = useState("")

  const handleFileSelect = (f: File) => {
    const ext = "." + f.name.split(".").pop()!.toLowerCase()
    const allowed = [".yaml", ".yml", ".json", ".txt", ".log"]
    if (!allowed.includes(ext)) { setFileError(`Unsupported type: ${ext}`); return }
    if (f.size > MAX_FILE_MB * 1024 * 1024) { setFileError(`File too large (max ${MAX_FILE_MB * 1024} KB)`); return }
    setFileError(""); setUploadedFile(f)
  }

  const clearFile = () => { setUploadedFile(null); setFileError("") }

  const switchMode = (m: "text" | "file" | "url") => {
    setAnalysisMode(m); setError(""); setFileError(""); setUrlError("")
  }

  // ── Text analysis ──
  const analyzeText = async () => {
    if (!description.trim()) { setError("Please enter a system description."); return }
    setError(""); setLoading(true); setStep(0)
    stepRef.current = setInterval(
      () => setStep(s => Math.min(s + 1, STEPS.length - 1)),
      Math.floor(700 + Math.random() * 400),
    )
    try {
      const res = await axios.post("http://localhost:8000/analysis/", { system_description: description })
      setResults(res.data.analysis ?? [])
      setFileHints([]); setFileType(""); setFileName("")
    } catch {
      setError("Failed to connect to backend. Ensure backend is running on :8000.")
    } finally {
      if (stepRef.current) clearInterval(stepRef.current)
      setLoading(false); setStep(0)
    }
  }

  // ── File analysis ──
  const analyzeFile = async () => {
    if (!uploadedFile) { setFileError("Please select a file first."); return }
    setFileError(""); setError(""); setLoading(true); setStep(0)
    stepRef.current = setInterval(
      () => setStep(s => Math.min(s + 1, FILE_STEPS.length - 1)),
      Math.floor(600 + Math.random() * 400),
    )
    try {
      const form = new FormData()
      form.append("file", uploadedFile)
      const res = await axios.post("http://localhost:8000/analysis/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      setResults(res.data.analysis ?? [])
      setFileHints(res.data.hints ?? [])
      setFileType(res.data.file_type ?? "")
      setFileName(res.data.filename ?? uploadedFile.name)
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "File analysis failed. Check backend."
      setFileError(msg)
    } finally {
      if (stepRef.current) clearInterval(stepRef.current)
      setLoading(false); setStep(0)
    }
  }

  // ── URL analysis ──
  const analyzeURL = async () => {
    const url = urlInput.trim()
    if (!url) { setUrlError("Please enter a URL."); return }
    if (!/^https?:\/\//i.test(url)) { setUrlError("URL must start with http:// or https://"); return }
    setUrlError(""); setError(""); setLoading(true); setStep(0)
    stepRef.current = setInterval(
      () => setStep(s => Math.min(s + 1, URL_STEPS.length - 1)),
      Math.floor(700 + Math.random() * 500),
    )
    try {
      const res = await axios.post("http://localhost:8000/analysis/url", { url })
      setResults(res.data.analysis ?? [])
      setSurfaceInfo(res.data.surface_info ?? null)
      setUrlType(res.data.url_type ?? "")
      setFileHints([]); setFileType(""); setFileName("")
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "URL analysis failed. Check backend."
      setUrlError(msg)
    } finally {
      if (stepRef.current) clearInterval(stepRef.current)
      setLoading(false); setStep(0)
    }
  }

  const runAnalysis = () => {
    if (analysisMode === "file") return analyzeFile()
    if (analysisMode === "url")  return analyzeURL()
    return analyzeText()
  }

  const exportPDF = () => {
    if (!results.length) return

    const pdf   = new jsPDF("p", "mm", "a4")
    const PW    = 210   // A4 width mm
    const PH    = 297   // A4 height mm
    const ML    = 14    // margin left
    const MR    = 14    // margin right
    const MT    = 16    // margin top
    const MB    = 16    // margin bottom
    const CW    = PW - ML - MR   // content width
    let   y     = MT

    // ── helpers ──────────────────────────────────────────────
    const checkPage = (needed = 8) => {
      if (y + needed > PH - MB) { pdf.addPage(); y = MT }
    }

    const heading = (text: string, size = 13, color: [number,number,number] = [30,30,30]) => {
      checkPage(10)
      pdf.setFontSize(size)
      pdf.setTextColor(...color)
      pdf.setFont("helvetica", "bold")
      pdf.text(text, ML, y)
      y += size * 0.45
    }

    const subheading = (text: string) => {
      checkPage(8)
      pdf.setFontSize(9)
      pdf.setTextColor(80, 80, 80)
      pdf.setFont("helvetica", "bold")
      pdf.text(text, ML, y)
      y += 5
    }

    const body = (text: string, indent = 0, color: [number,number,number] = [50,50,50]) => {
      pdf.setFontSize(8.5)
      pdf.setTextColor(...color)
      pdf.setFont("helvetica", "normal")
      const lines = pdf.splitTextToSize(text, CW - indent)
      lines.forEach((line: string) => {
        checkPage(5)
        pdf.text(line, ML + indent, y)
        y += 4.5
      })
    }

    const pill = (text: string, x: number, yPos: number, bg: [number,number,number], fg: [number,number,number]) => {
      pdf.setFillColor(...bg)
      pdf.setTextColor(...fg)
      pdf.setFontSize(7)
      pdf.setFont("helvetica", "bold")
      const w = pdf.getTextWidth(text) + 4
      pdf.roundedRect(x, yPos - 3.5, w, 5, 1, 1, "F")
      pdf.text(text, x + 2, yPos)
      return w + 2
    }

    const divider = (color: [number,number,number] = [220,220,220]) => {
      checkPage(4)
      pdf.setDrawColor(...color)
      pdf.setLineWidth(0.3)
      pdf.line(ML, y, ML + CW, y)
      y += 4
    }

    const riskColors: Record<string, { bg: [number,number,number]; fg: [number,number,number] }> = {
      critical: { bg: [239,68,68],  fg: [255,255,255] },
      high:     { bg: [249,115,22], fg: [255,255,255] },
      medium:   { bg: [245,158,11], fg: [255,255,255] },
      low:      { bg: [56,189,248], fg: [255,255,255] },
    }

    // ── PAGE 1 — COVER ────────────────────────────────────────
    // Dark header bar
    pdf.setFillColor(8, 15, 32)
    pdf.rect(0, 0, PW, 48, "F")

    pdf.setTextColor(255, 255, 255)
    pdf.setFont("helvetica", "bold")
    pdf.setFontSize(22)
    pdf.text("TARA Threat Analysis Report", ML, 22)

    pdf.setFontSize(9)
    pdf.setFont("helvetica", "normal")
    pdf.setTextColor(148, 163, 184)
    pdf.text("AI-Powered Security Assessment  ·  STRIDE Framework", ML, 30)
    pdf.text(`Generated: ${new Date().toLocaleString()}`, ML, 36)

    y = 58

    // ── Summary stats row ────────────────────────────────────
    const sevCounts = { critical: 0, high: 0, medium: 0, low: 0 }
    results.forEach(r => {
      const l = r.risk_level?.toLowerCase()
      if (l in sevCounts) (sevCounts as any)[l]++
    })

    const statBoxes = [
      { label: "Total Threats", value: String(results.length),  bg: [15,23,42]  as [number,number,number] },
      { label: "Critical",      value: String(sevCounts.critical), bg: [127,29,29]  as [number,number,number] },
      { label: "High",          value: String(sevCounts.high),     bg: [124,45,18]  as [number,number,number] },
      { label: "Medium",        value: String(sevCounts.medium),   bg: [113,63,18]  as [number,number,number] },
      { label: "Low",           value: String(sevCounts.low),      bg: [12,58,92]   as [number,number,number] },
    ]
    const boxW = CW / statBoxes.length - 2
    statBoxes.forEach((b, i) => {
      const bx = ML + i * (boxW + 2)
      pdf.setFillColor(...b.bg)
      pdf.roundedRect(bx, y, boxW, 18, 2, 2, "F")
      pdf.setTextColor(255, 255, 255)
      pdf.setFont("helvetica", "bold")
      pdf.setFontSize(14)
      pdf.text(b.value, bx + boxW / 2, y + 9, { align: "center" })
      pdf.setFontSize(6.5)
      pdf.setFont("helvetica", "normal")
      pdf.setTextColor(180, 200, 220)
      pdf.text(b.label.toUpperCase(), bx + boxW / 2, y + 14.5, { align: "center" })
    })
    y += 26

    // Avg score + top STRIDE
    const avgScore = (results.reduce((s, r) => s + (r.risk_score ?? 0), 0) / results.length).toFixed(1)
    const strideCounts: Record<string, number> = {}
    results.forEach(r => { if (r.stride) strideCounts[r.stride] = (strideCounts[r.stride] ?? 0) + 1 })
    const topStride = Object.entries(strideCounts).sort((a, b) => b[1] - a[1])[0]

    pdf.setFontSize(8.5)
    pdf.setFont("helvetica", "normal")
    pdf.setTextColor(80, 80, 80)
    pdf.text(`Average Risk Score: ${avgScore}`, ML, y)
    if (topStride) pdf.text(`Dominant STRIDE Category: ${topStride[0]} (${topStride[1]} threats)`, ML + 70, y)
    y += 8

    divider()

    // ── PAGE CONTENT — ALL THREATS ───────────────────────────
    heading("Threat Analysis", 14, [8, 15, 32])
    y += 2

    const sorted = [...results].sort((a, b) => (b.risk_score ?? 0) - (a.risk_score ?? 0))

    sorted.forEach((r, i) => {
      const level = r.risk_level?.toLowerCase() ?? "low"
      const rc    = riskColors[level] ?? riskColors.low

      checkPage(30)

      // Threat number + name band
      pdf.setFillColor(245, 247, 250)
      pdf.rect(ML, y - 1, CW, 9, "F")

      pdf.setFontSize(7)
      pdf.setFont("helvetica", "bold")
      pdf.setTextColor(100, 116, 139)
      pdf.text(`#${i + 1}`, ML + 1, y + 4.5)

      pdf.setFontSize(9)
      pdf.setTextColor(15, 23, 42)
      const nameLines = pdf.splitTextToSize(r.threat ?? "Unknown threat", CW - 30)
      pdf.text(nameLines[0], ML + 8, y + 4.5)

      // Risk + STRIDE pills on the right
      let px = ML + CW
      if (r.stride) {
        const sw = pdf.getTextWidth(r.stride) + 6
        px -= sw
        pdf.setFillColor(241, 245, 249)
        pdf.setTextColor(71, 85, 105)
        pdf.setFontSize(6.5)
        pdf.roundedRect(px, y + 1, sw - 1, 4.5, 1, 1, "F")
        pdf.text(r.stride, px + 2, y + 4.5)
        px -= 2
      }
      const rlabel = (r.risk_level ?? "Low").charAt(0).toUpperCase() + (r.risk_level ?? "low").slice(1).toLowerCase()
      const rw = pdf.getTextWidth(rlabel) + 5
      px -= rw
      pdf.setFillColor(...rc.bg)
      pdf.setTextColor(...rc.fg)
      pdf.setFontSize(6.5)
      pdf.roundedRect(px, y + 1, rw - 1, 4.5, 1, 1, "F")
      pdf.text(rlabel, px + 2, y + 4.5)

      y += 11

      // Details grid: score / category / confidence
      const cols = [
        `Score: ${r.risk_score ?? "—"}`,
        `Category: ${r.category || r.stride || "—"}`,
        `Confidence: ${r.confidence != null ? r.confidence + "%" : "—"}`,
      ]
      pdf.setFontSize(7.5)
      pdf.setFont("helvetica", "normal")
      pdf.setTextColor(100, 116, 139)
      cols.forEach((c, ci) => pdf.text(c, ML + ci * (CW / 3), y))
      y += 5.5

      // Why flagged
      if (r.why_flagged || r.evidence) {
        pdf.setFontSize(7.5)
        pdf.setFont("helvetica", "bolditalic")
        pdf.setTextColor(100, 116, 139)
        pdf.text("Why flagged:", ML, y)
        y += 4
        body(r.why_flagged || r.evidence || "", 3, [80, 80, 80])
      }

      // Mitigation
      const mitigText: string = Array.isArray(r.mitigation_steps) && r.mitigation_steps.length
        ? r.mitigation_steps.map((s: string, j: number) => `${j + 1}. ${s}`).join("  ")
        : r.mitigation ?? ""
      if (mitigText) {
        checkPage(8)
        pdf.setFontSize(7.5)
        pdf.setFont("helvetica", "bolditalic")
        pdf.setTextColor(34, 197, 94)
        pdf.text("Mitigation:", ML, y)
        y += 4
        body(mitigText, 3, [40, 80, 50])
      }

      y += 3
      divider([230, 230, 230])
    })

    // ── LAST PAGE — FOOTER ───────────────────────────────────
    const pageCount = (pdf as any).internal.getNumberOfPages()
    for (let p = 1; p <= pageCount; p++) {
      pdf.setPage(p)
      pdf.setFillColor(8, 15, 32)
      pdf.rect(0, PH - 10, PW, 10, "F")
      pdf.setFontSize(7)
      pdf.setFont("helvetica", "normal")
      pdf.setTextColor(148, 163, 184)
      pdf.text("TARA — AI Threat Analysis & Risk Assessment", ML, PH - 4)
      pdf.text(`Page ${p} of ${pageCount}`, PW - MR, PH - 4, { align: "right" })
    }

    pdf.save(`tara_report_${new Date().toISOString().slice(0,10)}.pdf`)
  }

  const critical = results.filter(r => r.risk_level?.toLowerCase() === "critical").length
  const high     = results.filter(r => r.risk_level?.toLowerCase() === "high").length
  const medium   = results.filter(r => r.risk_level?.toLowerCase() === "medium").length
  const low      = results.filter(r => r.risk_level?.toLowerCase() === "low").length
  const total    = results.length || 1

  // Animated counters — count up when results arrive
  const animTotal    = useCountUp(results.length)
  const animCritical = useCountUp(critical)
  const animHigh     = useCountUp(high)
  const animMedium   = useCountUp(medium)
  const animLow      = useCountUp(low)

  const chartData = [
    { name: "Critical", value: critical },
    { name: "High",     value: high     },
    { name: "Medium",   value: medium   },
    { name: "Low",      value: low      },
  ]

  return (
    <div className="dashboard-shell">
      <BackToHome />
      <Sidebar />
      <div className="dashboard-main">

        {/* ── Page header ── */}
        <div className="dashboard-header">
          <div>
            <h1>TARA Threat Dashboard</h1>
            <p>User story review, system architecture analysis, file scanning, or URL surface mapping.</p>
          </div>
          <div className={`status-pill${loading ? " status-busy" : results.length ? " status-done" : ""}`}>
            {loading
              ? <><span className="status-live-dot" />Analyzing…</>
              : results.length
                ? <><span className="status-live-dot status-live-dot--done" />{animTotal} threat{animTotal !== 1 ? "s" : ""} found</>
                : <><span className="status-live-dot status-live-dot--idle" />Ready</>
            }
          </div>
        </div>

        {/* ── Analysis input ── */}
        <section className="analysis-panel">
          {/* Mode tabs */}
          <div style={{ display: "flex", gap: 4, marginBottom: 14, flexWrap: "wrap" }}>
            {([
              { id: "text", label: "Text Description", icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>, badge: null },
              { id: "file", label: "Upload File",       icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>, badge: null },
              { id: "url",  label: "Surface Mapper",    icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>, badge: "NEW" },
            ] as const).map(({ id, label, icon, badge }) => (
              <button
                key={id}
                onClick={() => switchMode(id)}
                className={`mode-tab ${analysisMode === id ? "mode-tab--active" : "mode-tab--idle"}`}
              >
                {icon}
                {label}
                {badge && (
                  <span style={{ fontSize: ".58rem", fontWeight: 800, color: "#f59e0b", background: "rgba(245,158,11,.12)", border: "1px solid rgba(245,158,11,.25)", borderRadius: 3, padding: "0 4px" }}>
                    {badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Text mode — User Story / Functional Requirement */}
          {analysisMode === "text" && (
            <div className="mode-panel-enter">
              <div className="panel-head">
                <h2>User Story / Functional Requirement</h2>
                <p className="muted-text">Describe a user story, feature, or system for shift-left security review.</p>
              </div>

              {/* Template hint */}
              <div style={{
                display: "flex", alignItems: "flex-start", gap: 8,
                padding: "8px 12px", borderRadius: 8, marginBottom: 10,
                background: "rgba(56,189,248,.04)", border: "1px solid rgba(56,189,248,.12)",
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 2 }}>
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <div>
                  <p style={{ margin: 0, fontSize: ".72rem", color: "#38bdf8", fontWeight: 700, marginBottom: 3 }}>
                    Suggested format — user story
                  </p>
                  <p style={{ margin: 0, fontSize: ".72rem", color: "#334155", lineHeight: 1.55, fontFamily: "ui-monospace, monospace" }}>
                    As a [user role], I want to [action] using [technology/workflow] so that [goal].
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: ".68rem", color: "#1e3a52" }}>
                    Or describe any system, API, or workflow — both formats work.
                  </p>
                </div>
              </div>

              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="analysis-textarea"
                placeholder={"As a registered user, I want to reset my password via email link so that I can regain access to my account.\n\nOr: A REST API with JWT auth, MySQL database and Redis cache deployed on AWS..."}
                rows={4}
              />

              {/* Quick-fill chips */}
              {!description.trim() && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
                  <span style={{ fontSize: ".67rem", color: "#334155", alignSelf: "center", flexShrink: 0 }}>Try:</span>
                  {EXAMPLE_STORIES.slice(0, 3).map(s => (
                    <button
                      key={s}
                      onClick={() => setDescription(s)}
                      style={{
                        fontSize: ".67rem", color: "#475569", background: "rgba(255,255,255,.03)",
                        border: "1px solid rgba(255,255,255,.07)", borderRadius: 6,
                        padding: "3px 9px", cursor: "pointer", transition: "all .12s",
                        maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}
                      title={s}
                    >
                      {s.length > 50 ? s.slice(0, 48) + "…" : s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* File mode */}
          {analysisMode === "file" && (
            <div className="mode-panel-enter">
              <div className="panel-head">
                <h2>File Threat Analysis</h2>
                <p className="muted-text">Upload a config or log file — YAML, JSON, TXT, or LOG.</p>
              </div>
              <FileUploadZone
                file={uploadedFile}
                onFile={handleFileSelect}
                onClear={clearFile}
                error={fileError}
              />
            </div>
          )}

          {/* URL Surface Mapper mode */}
          {analysisMode === "url" && (
            <div className="mode-panel-enter">
              <div className="panel-head">
                <h2>URL Surface Mapper</h2>
                <p className="muted-text">Enter a public website or GitHub repo URL for passive surface analysis.</p>
              </div>
              <URLInputZone value={urlInput} onChange={setUrlInput} error={urlError} />
            </div>
          )}

          <div className="analysis-actions">
            <button
              onClick={runAnalysis}
              disabled={loading || (analysisMode === "file" && !uploadedFile) || (analysisMode === "url" && !urlInput.trim())}
              className="action-btn analyze-btn"
            >
              {loading
                ? "Analyzing…"
                : analysisMode === "file"
                  ? "⚡ Analyze File"
                  : analysisMode === "url"
                    ? "⚡ Map Surface"
                    : description.trim().match(/^as\s+a\s+/i)
                      ? "⚡ Review Story"
                      : "⚡ Analyze System"}
            </button>
            <button onClick={exportPDF} disabled={!results.length} className="action-btn export-btn">
              📄 Export PDF
            </button>
          </div>
          {error && <div className="error-text">⚠ {error}</div>}
        </section>

        {/* ── Loading animation ── */}
        {loading && <AnalysisLoader step={step} fileMode={analysisMode === "file"} urlMode={analysisMode === "url"} />}

        {/* ── Hints banner (file analysis only) ── */}
        {!loading && fileHints.length > 0 && (
          <HintsBanner filename={fileName} fileType={fileType} hints={fileHints} />
        )}

        {/* ── Surface info banner (URL analysis only) ── */}
        {!loading && surfaceInfo && urlType && (
          <SurfaceInfoBanner urlType={urlType} surfaceInfo={surfaceInfo} />
        )}

        {/* ── Results or empty state ── */}
        {!loading && results.length > 0 && (
          <div className="results-reveal">
            <AIInsights threats={results} />
            <Top3Threats threats={results} />
            <TopThreatSummary threats={results} />
          </div>
        )}

        {!loading && (
          results.length === 0
            ? <EmptyState onChipClick={(text) => { switchMode("text"); setDescription(text) }} />
            : (
              <>
              <div className="result-grid">

                {/* Threat table */}
                <section id="report" className="panel report-panel">
                  <div className="panel-head">
                    <h2>Threat Report</h2>
                    {/* Severity count badges */}
                    <div className="sev-badges">
                      {[
                        { key: "critical", count: animCritical, color: "#ef4444" },
                        { key: "high",     count: animHigh,     color: "#f97316" },
                        { key: "medium",   count: animMedium,   color: "#f59e0b" },
                        { key: "low",      count: animLow,      color: "#38bdf8" },
                      ].filter(b => b.count > 0).map(({ key, count, color }) => (
                        <span key={key} className="sev-badge" style={{ color, borderColor: `${color}33`, background: `${color}0f` }}>
                          <span className="sev-badge-dot" style={{ background: color }} />
                          {count} {key.charAt(0).toUpperCase() + key.slice(1)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="table-wrap">
                    <table className="report-table">
                      <thead>
                        <tr>
                          <th>Threat</th>
                          <th>STRIDE</th>
                          <th>Risk</th>
                          <th>Score</th>
                          <th>Confidence</th>
                          <th>Mitigation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.map((r, i) => (
                          <tr key={`${r.threat}-${i}`} className="tbl-row">
                            <td className="td-threat">
                              <div className="td-threat-name">{r.threat}</div>
                              {r.category && <div className="td-threat-cat">{r.category}</div>}
                              <div style={{ fontSize: ".63rem", color: "#1e3a52", marginTop: 3, lineHeight: 1.3 }}>
                                {whyFlagged(r)}
                              </div>
                            </td>
                            <td>
                              <span className={`stride-pill ${r.stride?.toLowerCase().replaceAll(" ", "-")}`}>
                                {r.stride}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                <span className={`risk-pill ${r.risk_level?.toLowerCase()}`}>
                                  {r.risk_level}
                                </span>
                                <MitigationPriority score={r.risk_score ?? 0} />
                              </div>
                            </td>
                            <td><ScoreBar score={r.risk_score ?? 0} /></td>
                            <td><ConfBar val={r.confidence ?? 0} /></td>
                            <td className="td-mitigation">
                              <MitigationCell text={r.mitigation} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* Risk visualization */}
                <section className="panel risk-panel">
                  <div className="panel-head">
                    <h2>Risk Visualization</h2>
                    <span className="panel-head-sub">{animTotal} threats analysed</span>
                  </div>

                  {/* Severity count row */}
                  <div className="sev-count-row">
                    {[
                      { label: "Critical", count: animCritical, color: "#ef4444" },
                      { label: "High",     count: animHigh,     color: "#f97316" },
                      { label: "Medium",   count: animMedium,   color: "#f59e0b" },
                      { label: "Low",      count: animLow,      color: "#38bdf8" },
                    ].map(({ label, count, color }) => (
                      <div key={label} className="sev-count-item" style={{ borderColor: `${color}22`, background: `${color}0a` }}>
                        <span className="sev-count-num count-up" style={{ color }}>{count}</span>
                        <span className="sev-count-label">{label}</span>
                      </div>
                    ))}
                  </div>

                  <div className="chart-reveal">
                    <RiskChart data={chartData} />
                  </div>

                  <div className="bars">
                    {[
                      { label: "Critical", count: animCritical, raw: critical, color: "#ef4444" },
                      { label: "High",     count: animHigh,     raw: high,     color: "#f97316" },
                      { label: "Medium",   count: animMedium,   raw: medium,   color: "#f59e0b" },
                      { label: "Low",      count: animLow,      raw: low,      color: "#38bdf8" },
                    ].map(({ label, count, raw, color }, idx) => (
                      <div key={label} className="bar-row" style={{ animation: `fade-up-sm 220ms var(--ease-out) both ${60 + idx * 60}ms` }}>
                        <span className="bar-label" style={{ color: raw > 0 ? color : undefined }}>
                          {label}
                          <span className="bar-count">{count}</span>
                        </span>
                        <div className="bar-track">
                          <div
                            className="bar-fill"
                            style={{
                              width: `${Math.max(raw > 0 ? 3 : 0, (raw / total) * 100)}%`,
                              background: `linear-gradient(90deg, ${color}66, ${color})`,
                              boxShadow: raw > 0 ? `0 0 10px ${color}44` : "none",
                            }}
                          />
                        </div>
                        <span className="bar-pct" style={{ color: raw > 0 ? color : "#1e293b" }}>
                          {Math.round((raw / total) * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="risk-summary-strip">
                    <div className="rss-item">
                      <span className="rss-label">Total</span>
                      <span className="rss-val count-up">{animTotal}</span>
                    </div>
                    <div className="rss-divider" />
                    <div className="rss-item">
                      <span className="rss-label">Avg Score</span>
                      <span className="rss-val">
                        {(results.reduce((a, r) => a + (r.risk_score ?? 0), 0) / results.length).toFixed(1)}
                      </span>
                    </div>
                    <div className="rss-divider" />
                    <div className="rss-item">
                      <span className="rss-label">Avg Conf.</span>
                      <span className="rss-val">
                        {Math.round(results.reduce((a, r) => a + (r.confidence ?? 0), 0) / results.length)}%
                      </span>
                    </div>
                  </div>
                </section>

              </div>

              {/* ── Threat Deep Dive ── */}
              <ThreatDeepDive threats={results} />
              </>
            )
        )}

      </div>
    </div>
  )
}

/* Next.js requires useSearchParams to be inside a Suspense boundary */
export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <Dashboard />
    </Suspense>
  )
}
