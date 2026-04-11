"use client";

import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import BackToHome from "../components/BackToHome";

/* ── Badge helpers ── */
const RISK_META: Record<string, { color: string; bg: string; border: string }> = {
  critical: { color: "#ef4444", bg: "rgba(239,68,68,.1)",   border: "rgba(239,68,68,.25)"  },
  high:     { color: "#f97316", bg: "rgba(249,115,22,.1)",  border: "rgba(249,115,22,.25)" },
  medium:   { color: "#f59e0b", bg: "rgba(245,158,11,.1)",  border: "rgba(245,158,11,.25)" },
  low:      { color: "#22c55e", bg: "rgba(34,197,94,.1)",   border: "rgba(34,197,94,.25)"  },
};

function RiskBadge({ level }: { level: string }) {
  const key  = level?.toLowerCase() ?? "";
  const meta = RISK_META[key];
  if (!meta) return (
    <span style={{ fontSize: ".68rem", fontWeight: 700, color: "#475569", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 999, padding: "3px 9px", whiteSpace: "nowrap" }}>
      {level || "Unknown"}
    </span>
  );
  return (
    <span style={{ fontSize: ".68rem", fontWeight: 700, color: meta.color, background: meta.bg, border: `1px solid ${meta.border}`, borderRadius: 999, padding: "3px 9px", whiteSpace: "nowrap" }}>
      {level}
    </span>
  );
}

function StrideBadge({ value }: { value: string }) {
  const STRIDE_COLORS: Record<string, { color: string; bg: string; border: string }> = {
    spoofing:               { color: "#fb7185", bg: "rgba(244,63,94,.08)",   border: "rgba(244,63,94,.2)"   },
    tampering:              { color: "#fb923c", bg: "rgba(249,115,22,.08)",  border: "rgba(249,115,22,.2)"  },
    repudiation:            { color: "#c084fc", bg: "rgba(168,85,247,.08)",  border: "rgba(168,85,247,.2)"  },
    "information disclosure":{ color: "#60a5fa", bg: "rgba(59,130,246,.08)", border: "rgba(59,130,246,.2)"  },
    "denial of service":    { color: "#f87171", bg: "rgba(239,68,68,.08)",   border: "rgba(239,68,68,.2)"   },
    "elevation of privilege":{ color: "#4ade80", bg: "rgba(34,197,94,.08)",  border: "rgba(34,197,94,.2)"   },
  };
  const meta = STRIDE_COLORS[value?.toLowerCase()] ?? { color: "#94a3b8", bg: "rgba(148,163,184,.06)", border: "rgba(148,163,184,.15)" };
  return (
    <span style={{ fontSize: ".67rem", fontWeight: 700, color: meta.color, background: meta.bg, border: `1px solid ${meta.border}`, borderRadius: 6, padding: "3px 8px", whiteSpace: "nowrap", letterSpacing: ".01em" }}>
      {value}
    </span>
  );
}

function ConfBadge({ value }: { value: number | null }) {
  if (value == null) return <span style={{ fontSize: ".72rem", color: "#1e3a52" }}>—</span>;
  const color = value >= 75 ? "#22c55e" : value >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, minWidth: 44 }}>
      <span style={{ fontSize: ".75rem", fontWeight: 700, color }}>{value}%</span>
      <div style={{ width: 36, height: 3, borderRadius: 999, background: "rgba(255,255,255,.06)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${Math.min(value, 100)}%`, background: color, borderRadius: 999 }} />
      </div>
    </div>
  );
}

function ScoreCell({ score }: { score: number }) {
  const color = score >= 20 ? "#ef4444" : score >= 14 ? "#f97316" : score >= 8 ? "#f59e0b" : "#22c55e";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
      <span style={{ fontFamily: "ui-monospace, monospace", fontWeight: 800, fontSize: ".85rem", color }}>{score}</span>
      <div style={{ width: 32, height: 2, borderRadius: 999, background: "rgba(255,255,255,.06)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${Math.min((score / 25) * 100, 100)}%`, background: `linear-gradient(90deg, #22c55e, ${color})`, borderRadius: 999 }} />
      </div>
    </div>
  );
}

/* ── Column header config ── */
const COLS = [
  { key: "system",    label: "System",       align: "left"   },
  { key: "threat",    label: "Threat",       align: "left"   },
  { key: "stride",    label: "STRIDE",       align: "left"   },
  { key: "likelihood",label: "Likelihood",   align: "left"   },
  { key: "impact",    label: "Impact",       align: "left"   },
  { key: "score",     label: "Score",        align: "center" },
  { key: "risk",      label: "Risk Level",   align: "center" },
  { key: "conf",      label: "Confidence",   align: "center" },
  { key: "mitigation",label: "Mitigation",   align: "left"   },
] as const;

export default function HistoryPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        console.log("Fetching history from http://127.0.0.1:8000/analysis/history...");
        const res  = await fetch("http://127.0.0.1:8000/analysis/history");
        const data = await res.json();
        console.log("History API response:", data);
        if (Array.isArray(data)) {
          data.sort((a, b) => b.risk_score - a.risk_score);
          setHistory(data);
        } else {
          setHistory([]);
          console.error("Data is not an array:", data);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load threat history. Check backend.");
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  return (
    <div
      className="flex min-h-screen font-sans"
      style={{ background: "radial-gradient(ellipse at 80% 0%, rgba(30,42,88,.5) 0%, #050712 55%)", color: "#e2e8f0" }}
    >
      <BackToHome />
      <Sidebar />

      <div className="flex-1 overflow-x-hidden" style={{ padding: "32px 40px" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>

          {/* ── Page header ── */}
          <div style={{ marginBottom: 28, paddingBottom: 20, borderBottom: "1px solid rgba(30,41,59,.8)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#818cf8", boxShadow: "0 0 6px #818cf8", display: "inline-block" }} />
              <span style={{ fontSize: ".7rem", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#818cf8" }}>
                Intelligence Records
              </span>
            </div>
            <h1 style={{
              fontSize: "clamp(1.8rem, 3vw, 2.4rem)", fontWeight: 900, letterSpacing: "-.03em",
              background: "linear-gradient(135deg, #818cf8, #c084fc)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              backgroundClip: "text", margin: 0,
            }}>
              Threat History
            </h1>
            <p style={{ marginTop: 6, fontSize: ".85rem", color: "#475569" }}>
              All previous threat intelligence scans, sorted by risk score.
            </p>
          </div>

          {/* ── Main card ── */}
          <div style={{
            background: "rgba(10,15,28,.9)",
            border: "1px solid rgba(30,41,59,.9)",
            borderRadius: 16,
            overflow: "hidden",
            boxShadow: "0 8px 32px rgba(0,0,0,.3)",
          }}>

            {/* ── Loading ── */}
            {loading && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 24px", gap: 16 }}>
                <div style={{ width: 36, height: 36, border: "3px solid rgba(99,102,241,.2)", borderTopColor: "#818cf8", borderRadius: "50%", animation: "spin-cw .8s linear infinite" }} />
                <p style={{ color: "#475569", fontWeight: 500, fontSize: ".85rem" }}>Loading history…</p>
              </div>
            )}

            {/* ── Error ── */}
            {!loading && error && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 24px", gap: 12 }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: .5 }}>
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <p style={{ color: "#f87171", fontWeight: 600, fontSize: ".9rem" }}>{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  style={{ marginTop: 8, padding: "7px 20px", borderRadius: 8, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.04)", color: "#94a3b8", fontSize: ".8rem", cursor: "pointer" }}
                >
                  Retry
                </button>
              </div>
            )}

            {/* ── Empty ── */}
            {!loading && !error && history.length === 0 && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 24px", gap: 12 }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(30,58,82,.35)", border: "1px solid rgba(30,58,82,.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1e3a52" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                </div>
                <p style={{ color: "#334155", fontWeight: 600, fontSize: ".9rem" }}>No threat history available</p>
                <p style={{ color: "#1e3a52", fontSize: ".78rem" }}>Run an analysis on the Dashboard to populate records here.</p>
              </div>
            )}

            {/* ── Table ── */}
            {!loading && !error && history.length > 0 && (
              <>
                {/* Row count */}
                <div style={{ padding: "12px 20px", borderBottom: "1px solid rgba(30,41,59,.8)", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: ".72rem", fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: ".06em" }}>
                    {history.length} record{history.length !== 1 ? "s" : ""}
                  </span>
                  <span style={{ fontSize: ".68rem", color: "#1e3a52" }}>· sorted by risk score descending</span>
                </div>

                {/* Scrollable table wrapper */}
                <div style={{
                  overflowX: "auto",
                  overflowY: "auto",
                  maxHeight: "calc(100vh - 280px)",
                  scrollbarWidth: "thin",
                  scrollbarColor: "#1e293b transparent",
                }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".8rem", whiteSpace: "nowrap" }}>

                    {/* Sticky header */}
                    <thead style={{ position: "sticky", top: 0, zIndex: 10, background: "rgba(5,7,18,.97)", backdropFilter: "blur(8px)" }}>
                      <tr>
                        {COLS.map(col => (
                          <th
                            key={col.key}
                            style={{
                              padding: "10px 16px",
                              textAlign: col.align as any,
                              fontSize: ".63rem",
                              fontWeight: 700,
                              textTransform: "uppercase",
                              letterSpacing: ".07em",
                              color: "#334155",
                              borderBottom: "1px solid rgba(30,41,59,.9)",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {history.map((h, i) => (
                        <tr
                          key={i}
                          style={{ borderBottom: "1px solid rgba(255,255,255,.03)", transition: "background .12s" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "rgba(99,102,241,.04)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                        >
                          {/* System */}
                          <td style={{ padding: "11px 16px", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis" }}>
                            <span style={{ color: "#64748b", fontSize: ".76rem", fontWeight: 500 }} title={h.system_description}>
                              {h.system_description}
                            </span>
                          </td>

                          {/* Threat */}
                          <td style={{ padding: "11px 16px", maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis" }}>
                            <span style={{ color: "#cbd5e1", fontWeight: 600, fontSize: ".8rem" }} title={h.threat}>
                              {h.threat}
                            </span>
                          </td>

                          {/* STRIDE */}
                          <td style={{ padding: "11px 16px" }}>
                            <StrideBadge value={h.stride} />
                          </td>

                          {/* Likelihood */}
                          <td style={{ padding: "11px 16px", color: "#475569", fontSize: ".76rem" }}>
                            {h.likelihood}
                          </td>

                          {/* Impact */}
                          <td style={{ padding: "11px 16px", color: "#475569", fontSize: ".76rem" }}>
                            {h.impact}
                          </td>

                          {/* Score */}
                          <td style={{ padding: "11px 16px", textAlign: "center" }}>
                            <ScoreCell score={h.risk_score ?? 0} />
                          </td>

                          {/* Risk level */}
                          <td style={{ padding: "11px 16px", textAlign: "center" }}>
                            <RiskBadge level={h.risk_level} />
                          </td>

                          {/* Confidence */}
                          <td style={{ padding: "11px 16px", textAlign: "center" }}>
                            <ConfBadge value={h.confidence ?? null} />
                          </td>

                          {/* Mitigation */}
                          <td style={{ padding: "11px 16px", maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", color: "#334155", fontSize: ".74rem", lineHeight: 1.45 }} title={h.mitigation}>
                            {h.mitigation}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
