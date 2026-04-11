"use client"

import { useState, useRef, useEffect } from "react"
import axios from "axios"
import Sidebar from "../components/Sidebar"
import RiskChart from "../components/RiskChart"
import BackToHome from "../components/BackToHome"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"

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
   EMPTY STATE  (shown before any analysis is run)
───────────────────────────────────────────────────────── */
const EXAMPLE_SYSTEMS = [
  "Banking API with JWT auth",
  "IoT device firmware",
  "Healthcare patient portal",
  "Cloud microservices on AWS",
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
            Enter a system description above and click <strong>Analyze System</strong> to detect threats, STRIDE classifications, and risk scores.
          </p>
          <div className="es-examples">
            <span className="es-examples-label">Try these systems:</span>
            <div className="es-chips">
              {EXAMPLE_SYSTEMS.map(s => (
                <button key={s} className="es-chip" onClick={() => onChipClick(s)}>{s}</button>
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
  "Mapping attack surfaces…",
  "Cross-referencing threat vectors…",
  "Evaluating exploitability…",
  "Scoring blast radius…",
  "Consulting threat intelligence…",
  "Building mitigation plan…",
]

function AnalysisLoader({ step }: { step: number }) {
  const [thinkIdx, setThinkIdx] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setThinkIdx(i => (i + 1) % THINKING_MSGS.length), 1800)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="analysis-loader">
      {/* Spinner */}
      <div className="loader-spinner">
        <div className="spinner-outer" />
        <div className="spinner-inner" />
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ zIndex: 1 }}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      </div>

      {/* Steps list */}
      <div className="loader-steps">
        <p className="loader-title">AI Security Analysis</p>
        {STEPS.map((text, i) => {
          const state = i < step ? "done" : i === step ? "active" : "pending"
          return (
            <div key={i} className={`loader-step loader-step--${state}`}>
              <span className="step-dot">
                {state === "done"   && <DoneIcon />}
                {state === "active" && <ActiveIcon />}
                {state === "pending"&& <PendingIcon />}
              </span>
              <span className="step-text">{text}</span>
            </div>
          )
        })}
      </div>

      {/* Progress + thinking message */}
      <div className="loader-progress">
        <div className="loader-progress-track">
          <div
            className="loader-progress-fill"
            style={{ width: `${Math.round((step / (STEPS.length - 1)) * 100)}%` }}
          />
        </div>
        <span className="loader-progress-pct">
          {Math.round((step / (STEPS.length - 1)) * 100)}%
        </span>
        <span className="loader-thinking-msg">
          {THINKING_MSGS[thinkIdx]}
        </span>
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
    <span style={{
      display: "inline-block", width: 8, height: 8,
      borderRadius: "50%", background: "#38bdf8",
      boxShadow: "0 0 6px #38bdf8",
      animation: "active-pulse 1s ease-in-out infinite",
    }} />
  )
}
function PendingIcon() {
  return (
    <span style={{
      display: "inline-block", width: 7, height: 7,
      borderRadius: "50%", border: "1.5px solid #1e3a52",
    }} />
  )
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
        <div style={{ background: "rgba(255,255,255,.025)", borderRadius: 10, padding: "10px 12px" }}>
          <div style={{ fontSize: ".62rem", color: "#334155", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600, marginBottom: 5 }}>Overall System Risk</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{
              width: 8, height: 8, borderRadius: "50%", background: overallRisk.color,
              boxShadow: `0 0 6px ${overallRisk.color}`, flexShrink: 0,
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
        <div style={{ background: "rgba(255,255,255,.025)", borderRadius: 10, padding: "10px 12px" }}>
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
        <div style={{ background: "rgba(255,255,255,.025)", borderRadius: 10, padding: "10px 12px" }}>
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
        <span className="tts-count">{threats.length} threat{threats.length !== 1 ? "s" : ""} detected</span>
      </div>
      <div className="tts-grid">
        {bySeverity.map(({ level, meta, items }) => (
          <div
            key={level}
            className="tts-card"
            style={{ borderColor: meta.border, background: meta.bg }}
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
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

          return (
            <div
              key={i}
              style={{
                borderRadius: 12,
                border: `1px solid ${isOpen ? meta.border : "rgba(30,41,59,.8)"}`,
                background: isOpen ? meta.bg : "rgba(10,15,28,.7)",
                overflow: "hidden",
                transition: "border-color .18s, background .18s",
              }}
            >
              {/* ── Collapsed header row ── */}
              <button
                onClick={() => setOpenIdx(isOpen ? null : i)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 12,
                  padding: "11px 16px", background: "transparent", border: "none",
                  cursor: "pointer", textAlign: "left",
                }}
              >
                {/* Rank */}
                <span style={{ fontSize: ".62rem", fontWeight: 800, color: "#1e3a52", width: 18, flexShrink: 0 }}>
                  #{i + 1}
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
                <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ height: 1, background: "rgba(255,255,255,.04)", marginBottom: 2 }} />

                  {/* Three-column grid */}
                  <div className="tdd-detail-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>

                    {/* Why this threat */}
                    <div style={{ background: "rgba(255,255,255,.025)", borderRadius: 10, padding: "12px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2.2" strokeLinecap="round">
                          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                        <span style={{ fontSize: ".62rem", fontWeight: 700, color: "#818cf8", textTransform: "uppercase", letterSpacing: ".07em" }}>
                          Why This Threat
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: ".76rem", color: "#94a3b8", lineHeight: 1.6 }}>
                        {whyText}
                      </p>
                    </div>

                    {/* Attack impact */}
                    <div style={{ background: "rgba(255,255,255,.025)", borderRadius: 10, padding: "12px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={meta.color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                        </svg>
                        <span style={{ fontSize: ".62rem", fontWeight: 700, color: meta.color, textTransform: "uppercase", letterSpacing: ".07em" }}>
                          Attack Impact
                        </span>
                      </div>
                      {attackImpact.length > 0 ? (
                        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 5 }}>
                          {attackImpact.map((item, j) => (
                            <li key={j} style={{ display: "flex", gap: 7, alignItems: "flex-start" }}>
                              <span style={{ width: 4, height: 4, borderRadius: "50%", background: meta.color, flexShrink: 0, marginTop: 6 }} />
                              <span style={{ fontSize: ".74rem", color: "#94a3b8", lineHeight: 1.55 }}>{item}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p style={{ margin: 0, fontSize: ".74rem", color: "#334155" }}>No impact details available.</p>
                      )}
                    </div>

                    {/* Developer mitigations */}
                    <div style={{ background: "rgba(255,255,255,.025)", borderRadius: 10, padding: "12px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        <span style={{ fontSize: ".62rem", fontWeight: 700, color: "#22c55e", textTransform: "uppercase", letterSpacing: ".07em" }}>
                          Developer Mitigations
                        </span>
                      </div>
                      {mitigSteps.length > 0 ? (
                        <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
                          {mitigSteps.map((step, j) => (
                            <li key={j} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                              <span style={{
                                fontSize: ".58rem", fontWeight: 800, color: "#22c55e",
                                background: "rgba(34,197,94,.1)", border: "1px solid rgba(34,197,94,.2)",
                                borderRadius: 4, padding: "1px 5px", flexShrink: 0, marginTop: 2,
                                minWidth: 18, textAlign: "center",
                              }}>
                                {j + 1}
                              </span>
                              <span style={{ fontSize: ".74rem", color: "#94a3b8", lineHeight: 1.55 }}>{step}</span>
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <p style={{ margin: 0, fontSize: ".74rem", color: "#334155" }}>
                          {r.mitigation || "Apply security best practices."}
                        </p>
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
   MAIN PAGE
───────────────────────────────────────────────────────── */
export default function Dashboard() {
  const [description, setDescription] = useState("")
  const [results, setResults]         = useState<any[]>([])
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState("")
  const [step, setStep]               = useState(0)
  const stepRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const analyzeSystem = async () => {
    if (!description.trim()) { setError("Please enter a system description."); return }
    setError(""); setLoading(true); setStep(0)
    stepRef.current = setInterval(
      () => setStep(s => Math.min(s + 1, STEPS.length - 1)),
      Math.floor(700 + Math.random() * 400),  // slight variance feels more natural
    )
    try {
      const res = await axios.post("http://localhost:8000/analysis/", { system_description: description })
      setResults(res.data.analysis ?? [])
    } catch {
      setError("Failed to connect to backend. Ensure backend is running on :8000.")
    } finally {
      if (stepRef.current) clearInterval(stepRef.current)
      setLoading(false); setStep(0)
    }
  }

  const exportPDF = async () => {
    const input = document.getElementById("report")
    if (!input) return
    const canvas = await html2canvas(input)
    const imgData = canvas.toDataURL("image/png")
    const pdf = new jsPDF("p", "mm", "a4")
    pdf.addImage(imgData, "PNG", 10, 10, 190, 100)
    pdf.save("tara_report.pdf")
  }

  const critical = results.filter(r => r.risk_level?.toLowerCase() === "critical").length
  const high     = results.filter(r => r.risk_level?.toLowerCase() === "high").length
  const medium   = results.filter(r => r.risk_level?.toLowerCase() === "medium").length
  const low      = results.filter(r => r.risk_level?.toLowerCase() === "low").length
  const total    = results.length || 1

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
            <p>Describe your architecture and run AI-powered threat analysis.</p>
          </div>
          <div className={`status-pill${loading ? " status-busy" : results.length ? " status-done" : ""}`}>
            {loading ? "Analyzing…" : results.length ? `${results.length} threats found` : "Ready"}
          </div>
        </div>

        {/* ── Analysis input ── */}
        <section className="analysis-panel">
          <div className="panel-head">
            <h2>System Threat Analysis</h2>
            <p className="muted-text">Describe your architecture — API, database, auth layer, cloud services, etc.</p>
          </div>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="analysis-textarea"
            placeholder="e.g. A REST API with JWT auth, MySQL database and Redis cache deployed on AWS..."
            rows={4}
          />
          <div className="analysis-actions">
            <button onClick={analyzeSystem} disabled={loading} className="action-btn analyze-btn">
              {loading ? "Analyzing…" : "⚡ Analyze System"}
            </button>
            <button onClick={exportPDF} disabled={!results.length} className="action-btn export-btn">
              📄 Export PDF
            </button>
          </div>
          {error && <div className="error-text">⚠ {error}</div>}
        </section>

        {/* ── Loading animation ── */}
        {loading && <AnalysisLoader step={step} />}

        {/* ── Results or empty state ── */}
        {!loading && results.length > 0 && (
          <div style={{ animation: "fade-up .35s ease both" }}>
            <AIInsights threats={results} />
            <Top3Threats threats={results} />
            <TopThreatSummary threats={results} />
          </div>
        )}

        {!loading && (
          results.length === 0
            ? <EmptyState onChipClick={setDescription} />
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
                        { key: "critical", count: critical, color: "#ef4444" },
                        { key: "high",     count: high,     color: "#f97316" },
                        { key: "medium",   count: medium,   color: "#f59e0b" },
                        { key: "low",      count: low,      color: "#38bdf8" },
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
                    <span className="panel-head-sub">{results.length} threats analysed</span>
                  </div>

                  {/* Severity count row */}
                  <div className="sev-count-row">
                    {[
                      { label: "Critical", count: critical, color: "#ef4444" },
                      { label: "High",     count: high,     color: "#f97316" },
                      { label: "Medium",   count: medium,   color: "#f59e0b" },
                      { label: "Low",      count: low,      color: "#38bdf8" },
                    ].map(({ label, count, color }) => (
                      <div key={label} className="sev-count-item" style={{ borderColor: `${color}22`, background: `${color}0a` }}>
                        <span className="sev-count-num" style={{ color }}>{count}</span>
                        <span className="sev-count-label">{label}</span>
                      </div>
                    ))}
                  </div>

                  <RiskChart data={chartData} />

                  <div className="bars">
                    {[
                      { label: "Critical", count: critical, color: "#ef4444" },
                      { label: "High",     count: high,     color: "#f97316" },
                      { label: "Medium",   count: medium,   color: "#f59e0b" },
                      { label: "Low",      count: low,      color: "#38bdf8" },
                    ].map(({ label, count, color }) => (
                      <div key={label} className="bar-row">
                        <span className="bar-label" style={{ color: count > 0 ? color : undefined }}>
                          {label}
                          <span className="bar-count">{count}</span>
                        </span>
                        <div className="bar-track">
                          <div
                            className="bar-fill"
                            style={{
                              width: `${Math.max(count > 0 ? 3 : 0, (count / total) * 100)}%`,
                              background: `linear-gradient(90deg, ${color}66, ${color})`,
                              boxShadow: count > 0 ? `0 0 10px ${color}44` : "none",
                            }}
                          />
                        </div>
                        <span className="bar-pct" style={{ color: count > 0 ? color : "#1e293b" }}>
                          {Math.round((count / total) * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="risk-summary-strip">
                    <div className="rss-item">
                      <span className="rss-label">Total</span>
                      <span className="rss-val">{results.length}</span>
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
