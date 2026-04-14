// ─────────────────────────────────────────────────────────────────────────────
// settings/page.tsx — Platform Settings page
//
// Allows users to configure TARA's analysis behaviour and view system status.
//
// Sections:
//   - AI Configuration    : displays the active LLM provider, model, and mode
//   - System Status       : pings the backend on load and shows live status dots
//                           for Backend Server, LLM Inference Node, and Database
//   - Risk Scoring Behavior : toggle between Dynamic (likelihood × impact) and
//                             Static (legacy string-based) scoring modes
//   - Analysis Parameters : slider to set max threats per analysis (1–10),
//                           toggle to show/hide AI confidence scores in reports
//   - Danger Zone         : button to permanently delete all threat history via
//                           DELETE /analysis/history
//
// State is persisted to localStorage so settings survive page refreshes.
// Toast notifications confirm successful actions or surface API errors.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import BackToHome from "../components/BackToHome";
import {
  Settings, Server, Cpu, Trash2, Shield, Activity, HardDrive, CheckCircle2
} from "lucide-react";

/* ── Reusable section card ── */
function SettingsCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={className}
      style={{
        background: "rgba(10,15,28,.9)",
        border: "1px solid rgba(30,41,59,.9)",
        borderRadius: 16,
        padding: "22px 24px",
        backdropFilter: "blur(8px)",
        transition: "border-color .2s, box-shadow .2s",
        animation: "fade-up .35s ease both",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(56,189,248,.12)"
        ;(e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 24px rgba(0,0,0,.3)"
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(30,41,59,.9)"
        ;(e.currentTarget as HTMLDivElement).style.boxShadow = ""
      }}
    >
      {children}
    </div>
  );
}

/* ── Section heading ── */
function SectionHeading({ icon, label, color }: { icon: React.ReactNode; color: string; label: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-5">
      <div style={{ background: `${color}14`, border: `1px solid ${color}22`, padding: "7px", borderRadius: 9, display: "inline-flex", color }}>
        {icon}
      </div>
      <h2 className="font-bold text-base text-slate-200">{label}</h2>
    </div>
  );
}

/* ── Info row (label + static value) ── */
function InfoRow({ label, children, last = false }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div
      className="flex items-center justify-between"
      style={{
        padding: "10px 0",
        borderBottom: last ? "none" : "1px solid rgba(255,255,255,.04)",
      }}
    >
      <span style={{ fontSize: ".82rem", color: "#475569", fontWeight: 500 }}>{label}</span>
      {children}
    </div>
  );
}

/* ── Status indicator ── */
function StatusDot({ status }: { status: string }) {
  const isUp = status.includes("Running") || status.includes("Connected") || status.includes("Active");
  const isChecking = status.includes("Checking");
  const color = isChecking ? "#f59e0b" : isUp ? "#22c55e" : "#ef4444";
  const label = isChecking ? status : isUp ? status.replace(/.*?(Running|Connected|Active)/, "$1") : status.replace(/.*?(Down|Disconnected)/, "$1");

  return (
    <div className="flex items-center gap-2">
      <span style={{
        width: 7, height: 7, borderRadius: "50%",
        background: color,
        boxShadow: `0 0 6px ${color}`,
        display: "inline-block",
        flexShrink: 0,
        animation: isChecking ? "active-pulse 1s ease-in-out infinite" : isUp ? "pulse-dot 2.4s ease-in-out infinite" : "none",
      }} />
      <span style={{ fontSize: ".8rem", fontWeight: 600, color }}>{isChecking ? "Checking…" : isUp ? label : label}</span>
    </div>
  );
}

export default function SettingsPage() {
  const [scoringMode, setScoringMode]       = useState<string>("Dynamic");
  const [maxThreats, setMaxThreats]         = useState<number>(5);
  const [showConfidence, setShowConfidence] = useState<boolean>(true);

  const [backendStatus, setBackendStatus] = useState<"Checking..." | "🟢 Running" | "🔴 Down">("Checking...");
  const [llmStatus, setLlmStatus]         = useState<"Checking..." | "🟢 Connected" | "🔴 Disconnected">("Checking...");

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setScoringMode(localStorage.getItem("tara_scoring_mode") || "Dynamic");
    setMaxThreats(localStorage.getItem("tara_max_threats") ? parseInt(localStorage.getItem("tara_max_threats")!) : 5);
    setShowConfidence(localStorage.getItem("tara_show_confidence") !== "false");

    const checkStatus = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/analysis/history", { method: "GET" });
        if (res.ok) { setBackendStatus("🟢 Running"); setLlmStatus("🟢 Connected"); }
        else         { setBackendStatus("🔴 Down");    setLlmStatus("🔴 Disconnected"); }
      } catch {
        setBackendStatus("🔴 Down");
        setLlmStatus("🔴 Disconnected");
      }
    };
    checkStatus();
  }, []);

  useEffect(() => {
    localStorage.setItem("tara_scoring_mode",    scoringMode);
    localStorage.setItem("tara_max_threats",     maxThreats.toString());
    localStorage.setItem("tara_show_confidence", showConfidence.toString());
  }, [scoringMode, maxThreats, showConfidence]);

  const showToast = (msg: string, isError = false) => {
    if (isError) { setErrorMsg(msg); setTimeout(() => setErrorMsg(null), 3000); }
    else         { setToastMsg(msg); setTimeout(() => setToastMsg(null), 3000); }
  };

  const clearHistory = async () => {
    if (!confirm("Are you sure you want to permanently delete all threat history?")) return;
    try {
      const res = await fetch("http://127.0.0.1:8000/analysis/history", { method: "DELETE" });
      if (res.ok) showToast("Threat history cleared successfully!");
      else        showToast("Action failed. Check backend.", true);
    } catch (e) {
      console.error(e);
      showToast("Action failed. Check backend.", true);
    }
  };

  /* slider fill percentage */
  const sliderPct = ((maxThreats - 1) / (10 - 1)) * 100;

  return (
    <div
      className="flex min-h-screen text-slate-200 font-sans relative"
      style={{ background: "radial-gradient(ellipse at 80% 0%, rgba(30,42,88,.5) 0%, #050712 55%)" }}
    >
      <BackToHome />
      <Sidebar />

      {/* ── Toasts ── */}
      {toastMsg && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl font-semibold text-sm"
          style={{ background: "rgba(34,197,94,.1)", border: "1px solid rgba(34,197,94,.35)", color: "#4ade80", boxShadow: "0 8px 24px rgba(0,0,0,.4)" }}>
          <CheckCircle2 size={16} />
          {toastMsg}
        </div>
      )}
      {errorMsg && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl font-semibold text-sm"
          style={{ background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.35)", color: "#f87171", boxShadow: "0 8px 24px rgba(0,0,0,.4)" }}>
          <Server size={16} />
          {errorMsg}
        </div>
      )}

      <main className="flex-1 p-8 lg:p-12 overflow-x-hidden">
        <div className="max-w-4xl mx-auto">

          {/* ── Page header ── */}
          <div className="page-header-section mb-8">
            <div className="page-header-eyebrow">
              <span className="page-header-eyebrow-dot" style={{ background: "#818cf8", boxShadow: "0 0 6px #818cf8", animation: "pulse-dot 2.4s ease-in-out infinite" }} />
              <span className="page-header-eyebrow-text" style={{ color: "#818cf8" }}>Configuration</span>
            </div>
            <h1 className="page-header-title">Platform Settings</h1>
            <p className="page-header-sub">Manage AI configurations, system thresholds, and analysis behaviour.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* ── AI Configuration ── */}
            <SettingsCard>
              <SectionHeading icon={<Cpu size={15} />} color="#c084fc" label="AI Configuration" />
              <InfoRow label="AI Provider">
                <span style={{ fontSize: ".78rem", fontWeight: 700, color: "#e2e8f0", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 7, padding: "3px 10px" }}>
                  GROQ
                </span>
              </InfoRow>
              <InfoRow label="Model">
                <span style={{ fontSize: ".73rem", fontWeight: 600, color: "#a5b4fc", background: "rgba(99,102,241,.1)", border: "1px solid rgba(99,102,241,.2)", borderRadius: 7, padding: "3px 10px", fontFamily: "ui-monospace, monospace" }}>
                  llama3-70b-versatile
                </span>
              </InfoRow>
              <InfoRow label="Mode" last>
                <span style={{ fontSize: ".78rem", fontWeight: 700, color: "#34d399", background: "rgba(52,211,153,.08)", border: "1px solid rgba(52,211,153,.2)", borderRadius: 7, padding: "3px 10px" }}>
                  Production
                </span>
              </InfoRow>
            </SettingsCard>

            {/* ── System Status ── */}
            <SettingsCard>
              <SectionHeading icon={<Activity size={15} />} color="#22c55e" label="System Status" />
              <InfoRow label="Backend Server">
                <StatusDot status={backendStatus} />
              </InfoRow>
              <InfoRow label="LLM Inference Node">
                <StatusDot status={llmStatus} />
              </InfoRow>
              <InfoRow label="Database Connection" last>
                <StatusDot status="🟢 Active" />
              </InfoRow>
            </SettingsCard>

            {/* ── Risk Scoring Behaviour ── */}
            <SettingsCard>
              <SectionHeading icon={<Shield size={15} />} color="#fb923c" label="Risk Scoring Behavior" />
              <div className="flex flex-col gap-3">
                {[
                  { value: "Dynamic", title: "Likelihood × Impact", desc: "Dynamic calculation factoring both metrics." },
                  { value: "Static",  title: "Static Baseline",     desc: "Legacy mapping based solely on AI risk string." },
                ].map(opt => {
                  const active = scoringMode === opt.value;
                  return (
                    <label
                      key={opt.value}
                      className="flex items-start gap-3 cursor-pointer rounded-xl transition-colors"
                      style={{
                        padding: "12px 14px",
                        background: active ? "rgba(99,102,241,.07)" : "rgba(255,255,255,.02)",
                        border: `1px solid ${active ? "rgba(99,102,241,.3)" : "rgba(255,255,255,.05)"}`,
                      }}
                    >
                      {/* Custom radio */}
                      <div
                        onClick={() => setScoringMode(opt.value)}
                        style={{
                          width: 16, height: 16, borderRadius: "50%", flexShrink: 0, marginTop: 2, cursor: "pointer",
                          border: `2px solid ${active ? "#818cf8" : "#1e293b"}`,
                          background: active ? "#818cf8" : "transparent",
                          boxShadow: active ? "0 0 8px rgba(129,140,248,.5)" : "none",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          transition: "all .15s",
                        }}
                      >
                        {active && <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#fff", display: "inline-block" }} />}
                      </div>
                      <div onClick={() => setScoringMode(opt.value)}>
                        <p style={{ fontSize: ".83rem", fontWeight: 600, color: active ? "#e2e8f0" : "#64748b", transition: "color .15s" }}>{opt.title}</p>
                        <p style={{ fontSize: ".72rem", color: "#334155", marginTop: 2, lineHeight: 1.4 }}>{opt.desc}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </SettingsCard>

            {/* ── Analysis Parameters ── */}
            <SettingsCard>
              <SectionHeading icon={<HardDrive size={15} />} color="#38bdf8" label="Analysis Parameters" />

              {/* Max threats slider */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-3">
                  <span style={{ fontSize: ".82rem", fontWeight: 500, color: "#94a3b8" }}>Maximum Threats to Generate</span>
                  <span style={{
                    fontSize: ".75rem", fontWeight: 800, color: "#818cf8",
                    background: "rgba(99,102,241,.1)", border: "1px solid rgba(99,102,241,.25)",
                    borderRadius: 6, padding: "2px 9px", fontFamily: "ui-monospace, monospace",
                  }}>
                    {maxThreats}
                  </span>
                </div>
                {/* Styled range track */}
                <div className="relative" style={{ height: 6 }}>
                  <div style={{ position: "absolute", inset: 0, borderRadius: 999, background: "rgba(255,255,255,.06)" }} />
                  <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: `${sliderPct}%`, borderRadius: 999, background: "linear-gradient(90deg, #4f46e5, #818cf8)", boxShadow: "0 0 8px rgba(129,140,248,.35)", transition: "width .1s" }} />
                  <input
                    type="range" min="1" max="10"
                    value={maxThreats}
                    onChange={e => setMaxThreats(parseInt(e.target.value))}
                    className="absolute inset-0 w-full opacity-0 cursor-pointer"
                    style={{ height: 6 }}
                  />
                </div>
                <div className="flex justify-between mt-1.5">
                  <span style={{ fontSize: ".65rem", color: "#1e3a52" }}>1</span>
                  <span style={{ fontSize: ".65rem", color: "#1e3a52" }}>10</span>
                </div>
              </div>

              {/* Show confidence toggle */}
              <div
                className="flex items-center justify-between rounded-xl"
                style={{ padding: "12px 14px", background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.05)", borderTop: "1px solid rgba(255,255,255,.05)" }}
              >
                <div>
                  <p style={{ fontSize: ".83rem", fontWeight: 600, color: "#94a3b8" }}>Show AI Confidence</p>
                  <p style={{ fontSize: ".72rem", color: "#334155", marginTop: 2 }}>Display percentage confidence in reports.</p>
                </div>
                {/* Toggle */}
                <button
                  onClick={() => setShowConfidence(v => !v)}
                  className={`settings-toggle-track ${showConfidence ? "settings-toggle-track--on" : "settings-toggle-track--off"}`}
                  style={{ border: "none" }}
                  aria-label="Toggle show confidence"
                >
                  <span className={`settings-toggle-knob ${showConfidence ? "settings-toggle-knob--on" : "settings-toggle-knob--off"}`} />
                </button>
              </div>
            </SettingsCard>

          </div>

          {/* ── Danger Zone ── */}
          <div
            className="mt-5 rounded-2xl"
            style={{ background: "rgba(239,68,68,.04)", border: "1px solid rgba(239,68,68,.18)", padding: "20px 24px" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <div style={{ background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.2)", padding: 7, borderRadius: 9, display: "inline-flex", color: "#ef4444" }}>
                <Trash2 size={15} />
              </div>
              <h2 className="font-bold text-base" style={{ color: "#f87171" }}>Danger Zone</h2>
            </div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <p style={{ fontSize: ".82rem", color: "#475569", lineHeight: 1.55, maxWidth: 460 }}>
                Permanently delete all threat history and reset the analytical dataset. This action cannot be undone.
              </p>
              <button
                onClick={clearHistory}
                className="action-btn"
                style={{
                  background: "rgba(239,68,68,.1)",
                  border: "1px solid rgba(239,68,68,.28)",
                  color: "#f87171",
                  boxShadow: "0 2px 12px rgba(239,68,68,.12)",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = "linear-gradient(135deg,#7f1d1d,#ef4444)";
                  (e.currentTarget as HTMLButtonElement).style.color = "#fff";
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 20px rgba(239,68,68,.4)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,.1)";
                  (e.currentTarget as HTMLButtonElement).style.color = "#f87171";
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 2px 12px rgba(239,68,68,.12)";
                }}
              >
                <Trash2 size={15} />
                Clear History
              </button>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
