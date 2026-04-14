// ─────────────────────────────────────────────────────────────────────────────
// history/page.tsx — Threat History page
//
// Fetches all stored threat records from GET /analysis/history and organises
// them into per-session cards grouped by system_description.
//
// Features:
//   - SessionCard component: shows a collapsible summary card for each unique
//     analysis input, listing threat counts and severity breakdown
//   - Expandable threat table inside each card (sorted by risk score descending)
//   - Re-run button: navigates to /dashboard with the original description
//     pre-filled via query param (?q=...) so the user can re-analyse it
//   - Search bar: filters sessions and threats by keyword in real time
//   - Sort controls: sort sessions by Top Risk score, Most Threats, or A–Z
//
// Helper components (RiskBadge, StrideBadge, ConfBadge, ScoreCell) are defined
// at the top of the file to render individual threat table cells with
// consistent color-coded styling.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../components/Sidebar";
import BackToHome from "../components/BackToHome";

/* ─────────────────────────────────────────────────────────
   BADGE HELPERS
───────────────────────────────────────────────────────── */
const RISK_META: Record<string, { color: string; bg: string; border: string }> = {
  critical: { color: "#ef4444", bg: "rgba(239,68,68,.1)",   border: "rgba(239,68,68,.25)"  },
  high:     { color: "#f97316", bg: "rgba(249,115,22,.1)",  border: "rgba(249,115,22,.25)" },
  medium:   { color: "#f59e0b", bg: "rgba(245,158,11,.1)",  border: "rgba(245,158,11,.25)" },
  low:      { color: "#22c55e", bg: "rgba(34,197,94,.1)",   border: "rgba(34,197,94,.25)"  },
};

const STRIDE_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  spoofing:                { color: "#fb7185", bg: "rgba(244,63,94,.08)",   border: "rgba(244,63,94,.2)"   },
  tampering:               { color: "#fb923c", bg: "rgba(249,115,22,.08)",  border: "rgba(249,115,22,.2)"  },
  repudiation:             { color: "#c084fc", bg: "rgba(168,85,247,.08)",  border: "rgba(168,85,247,.2)"  },
  "information disclosure":{ color: "#60a5fa", bg: "rgba(59,130,246,.08)",  border: "rgba(59,130,246,.2)"  },
  "denial of service":     { color: "#f87171", bg: "rgba(239,68,68,.08)",   border: "rgba(239,68,68,.2)"   },
  "elevation of privilege":{ color: "#4ade80", bg: "rgba(34,197,94,.08)",   border: "rgba(34,197,94,.2)"   },
};

const SEV_ORDER = ["critical", "high", "medium", "low"];

function topLevel(threats: any[]): string {
  for (const s of SEV_ORDER) {
    if (threats.some(t => t.risk_level?.toLowerCase() === s)) return s;
  }
  return "low";
}

function RiskBadge({ level }: { level: string }) {
  const meta = RISK_META[level?.toLowerCase()] ?? { color: "#475569", bg: "rgba(255,255,255,.05)", border: "rgba(255,255,255,.08)" };
  return (
    <span style={{ fontSize: ".68rem", fontWeight: 700, color: meta.color, background: meta.bg, border: `1px solid ${meta.border}`, borderRadius: 999, padding: "3px 9px", whiteSpace: "nowrap" }}>
      {level || "Unknown"}
    </span>
  );
}

function StrideBadge({ value }: { value: string }) {
  const meta = STRIDE_COLORS[value?.toLowerCase()] ?? { color: "#94a3b8", bg: "rgba(148,163,184,.06)", border: "rgba(148,163,184,.15)" };
  return (
    <span style={{ fontSize: ".67rem", fontWeight: 700, color: meta.color, background: meta.bg, border: `1px solid ${meta.border}`, borderRadius: 6, padding: "3px 8px", whiteSpace: "nowrap" }}>
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

/* ─────────────────────────────────────────────────────────
   SESSION CARD  — one card per unique system_description
───────────────────────────────────────────────────────── */
function SessionCard({
  description, threats, index, onRerun,
}: {
  description: string;
  threats: any[];
  index: number;
  onRerun: (desc: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const topLvl   = topLevel(threats);
  const topMeta  = RISK_META[topLvl] ?? RISK_META.low;
  const avgScore = (threats.reduce((s, t) => s + (t.risk_score ?? 0), 0) / threats.length).toFixed(1);

  const counts = SEV_ORDER.map(s => ({
    level: s,
    meta: RISK_META[s],
    n: threats.filter(t => t.risk_level?.toLowerCase() === s).length,
  })).filter(c => c.n > 0);

  return (
    <div
      className="hist-session-card"
      style={{ animationDelay: `${index * 55}ms` }}
    >
      {/* ── Card header ── */}
      <div className="hist-session-head">
        {/* Left: input preview + meta */}
        <div className="hist-session-left">
          <div className="hist-session-desc" title={description}>
            {description.length > 120 ? description.slice(0, 118) + "…" : description}
          </div>
          <div className="hist-session-meta">
            <span className="hist-session-count">
              {threats.length} threat{threats.length !== 1 ? "s" : ""}
            </span>
            <span className="hist-session-sep">·</span>
            <span style={{ fontSize: ".72rem", color: "#334155" }}>
              Avg score {avgScore}
            </span>
            {counts.map(c => (
              <span key={c.level} style={{
                fontSize: ".67rem", fontWeight: 700, color: c.meta.color,
                background: c.meta.bg, border: `1px solid ${c.meta.border}`,
                borderRadius: 999, padding: "1px 7px",
              }}>
                {c.n} {c.level}
              </span>
            ))}
          </div>
        </div>

        {/* Right: actions */}
        <div className="hist-session-actions">
          <button
            className="hist-rerun-btn"
            onClick={() => onRerun(description)}
            title="Re-run this analysis on the Dashboard"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10"/>
              <path d="M3.51 15a9 9 0 1 0 .49-3.45"/>
            </svg>
            Re-run
          </button>

          <button
            className="hist-expand-btn"
            onClick={() => setExpanded(e => !e)}
            title={expanded ? "Collapse threats" : "Expand threats"}
          >
            <svg width="13" height="13" viewBox="0 0 12 12" fill="none"
              stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
              style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .2s" }}>
              <polyline points="2 4 6 8 10 4"/>
            </svg>
            {expanded ? "Hide" : "View"} threats
          </button>
        </div>
      </div>

      {/* ── Threat rows (collapsible) ── */}
      {expanded && (
        <div className="hist-threat-table-wrap">
          <table className="hist-threat-table">
            <thead>
              <tr>
                {["Threat", "STRIDE", "Risk", "Score", "Confidence", "Mitigation"].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...threats].sort((a, b) => (b.risk_score ?? 0) - (a.risk_score ?? 0)).map((t, i) => (
                <tr key={i} className="hist-threat-row">
                  <td className="hist-td-threat">
                    <div className="hist-threat-name">{t.threat}</div>
                    {t.category && <div className="hist-threat-cat">{t.category}</div>}
                  </td>
                  <td><StrideBadge value={t.stride} /></td>
                  <td><RiskBadge level={t.risk_level} /></td>
                  <td style={{ textAlign: "center" }}><ScoreCell score={t.risk_score ?? 0} /></td>
                  <td style={{ textAlign: "center" }}><ConfBadge value={t.confidence ?? null} /></td>
                  <td className="hist-td-mitigation">{t.mitigation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   PAGE
───────────────────────────────────────────────────────── */
export default function HistoryPage() {
  const router  = useRouter();
  const [history,  setHistory]  = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [search,   setSearch]   = useState("");
  const [sortBy,   setSortBy]   = useState<"score" | "threats" | "alpha">("score");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res  = await fetch("http://127.0.0.1:8000/analysis/history");
        const data = await res.json();
        setHistory(Array.isArray(data) ? data : []);
      } catch {
        setError("Failed to load threat history. Is the backend running?");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* Group flat rows → sessions keyed by system_description */
  const sessions = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const row of history) {
      const key = row.system_description ?? "Unknown input";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(row);
    }
    return Array.from(map.entries()).map(([desc, threats]) => ({ desc, threats }));
  }, [history]);

  /* Filter + sort sessions */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let out = q
      ? sessions.filter(s => s.desc.toLowerCase().includes(q) || s.threats.some((t: any) => t.threat?.toLowerCase().includes(q)))
      : sessions;

    if (sortBy === "score") {
      out = [...out].sort((a, b) => {
        const maxA = Math.max(...a.threats.map((t: any) => t.risk_score ?? 0));
        const maxB = Math.max(...b.threats.map((t: any) => t.risk_score ?? 0));
        return maxB - maxA;
      });
    } else if (sortBy === "threats") {
      out = [...out].sort((a, b) => b.threats.length - a.threats.length);
    } else {
      out = [...out].sort((a, b) => a.desc.localeCompare(b.desc));
    }
    return out;
  }, [sessions, search, sortBy]);

  const handleRerun = (desc: string) => {
    router.push(`/dashboard?q=${encodeURIComponent(desc)}`);
  };

  const totalThreats = history.length;

  return (
    <div
      className="flex min-h-screen font-sans"
      style={{ background: "radial-gradient(ellipse at 80% 0%, rgba(30,42,88,.5) 0%, #050712 55%)", color: "#e2e8f0" }}
    >
      <BackToHome />
      <Sidebar />

      <div className="flex-1 overflow-x-hidden" style={{ padding: "32px 40px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>

          {/* ── Page header ── */}
          <div className="page-header-section">
            <div className="page-header-eyebrow">
              <span className="page-header-eyebrow-dot" style={{ background: "#818cf8", boxShadow: "0 0 6px #818cf8", animation: "pulse-dot 2.4s ease-in-out infinite" }} />
              <span className="page-header-eyebrow-text" style={{ color: "#818cf8" }}>Intelligence Records</span>
            </div>
            <h1 className="page-header-title">Threat History</h1>
            <p className="page-header-sub">
              {sessions.length > 0
                ? `${sessions.length} past analysis session${sessions.length !== 1 ? "s" : ""} · ${totalThreats} total threats — click Re-run to load any session back into the dashboard.`
                : "All previous threat intelligence scans."}
            </p>
          </div>

          {/* ── Stats bar ── */}
          {!loading && !error && sessions.length > 0 && (() => {
            const critical = history.filter(t => t.risk_level?.toLowerCase() === "critical").length;
            const topStride = (() => {
              const freq: Record<string,number> = {};
              history.forEach(t => { if (t.stride) freq[t.stride] = (freq[t.stride] || 0) + 1; });
              return Object.entries(freq).sort((a,b) => b[1]-a[1])[0]?.[0] ?? "N/A";
            })();
            return (
              <div className="hist-stat-bar">
                <div className="hist-stat-pill">
                  <div className="hist-stat-icon" style={{ background: "rgba(129,140,248,.1)", border: "1px solid rgba(129,140,248,.18)", color: "#818cf8" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
                    </svg>
                  </div>
                  <div className="hist-stat-body">
                    <span className="hist-stat-num" style={{ color: "#818cf8" }}>{sessions.length}</span>
                    <span className="hist-stat-label">Sessions</span>
                  </div>
                </div>
                <div className="hist-stat-pill">
                  <div className="hist-stat-icon" style={{ background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.18)", color: "#f87171" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                  </div>
                  <div className="hist-stat-body">
                    <span className="hist-stat-num" style={{ color: "#f87171" }}>{totalThreats}</span>
                    <span className="hist-stat-label">Total Threats</span>
                  </div>
                </div>
                <div className="hist-stat-pill">
                  <div className="hist-stat-icon" style={{ background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.15)", color: "#ef4444" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                  </div>
                  <div className="hist-stat-body">
                    <span className="hist-stat-num" style={{ color: "#ef4444", fontSize: "1rem" }}>{critical}</span>
                    <span className="hist-stat-label">Critical Threats</span>
                  </div>
                </div>
                <div className="hist-stat-pill">
                  <div className="hist-stat-icon" style={{ background: "rgba(99,102,241,.08)", border: "1px solid rgba(99,102,241,.18)", color: "#818cf8" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                    </svg>
                  </div>
                  <div className="hist-stat-body">
                    <span className="hist-stat-num" style={{ color: "#a5b4fc", fontSize: ".85rem", fontWeight: 800 }}>{topStride}</span>
                    <span className="hist-stat-label">Top STRIDE Vector</span>
                  </div>
                </div>
              </div>
            );
          })()}

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
              <button onClick={() => window.location.reload()} className="hist-retry-btn">Retry</button>
            </div>
          )}

          {/* ── Empty ── */}
          {!loading && !error && sessions.length === 0 && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 24px", gap: 12 }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(30,58,82,.35)", border: "1px solid rgba(30,58,82,.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1e3a52" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <p style={{ color: "#334155", fontWeight: 600, fontSize: ".9rem" }}>No threat history yet</p>
              <p style={{ color: "#1e3a52", fontSize: ".78rem" }}>Run an analysis on the Dashboard to populate records here.</p>
              <button className="hist-rerun-btn" style={{ marginTop: 8 }} onClick={() => router.push("/dashboard")}>
                Go to Dashboard
              </button>
            </div>
          )}

          {/* ── Sessions list ── */}
          {!loading && !error && sessions.length > 0 && (
            <>
              {/* Toolbar */}
              <div className="hist-toolbar">
                {/* Search */}
                <div className="hist-search-wrap">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  <input
                    className="hist-search"
                    type="text"
                    placeholder="Search sessions or threats…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                  {search && (
                    <button className="hist-search-clear" onClick={() => setSearch("")} aria-label="Clear">
                      ×
                    </button>
                  )}
                </div>

                {/* Sort */}
                <div className="hist-sort-group">
                  <span className="hist-sort-label">Sort:</span>
                  {(["score", "threats", "alpha"] as const).map(opt => (
                    <button
                      key={opt}
                      className={`hist-sort-btn${sortBy === opt ? " active" : ""}`}
                      onClick={() => setSortBy(opt)}
                    >
                      {opt === "score" ? "Top Risk" : opt === "threats" ? "Most Threats" : "A–Z"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Result count when searching */}
              {search && (
                <p className="hist-filter-info">
                  {filtered.length} session{filtered.length !== 1 ? "s" : ""} matching <strong>"{search}"</strong>
                </p>
              )}

              {/* Session cards */}
              <div className="hist-sessions-list">
                {filtered.length === 0 ? (
                  <p style={{ color: "#334155", fontSize: ".85rem", padding: "32px 0", textAlign: "center" }}>
                    No sessions match your search.
                  </p>
                ) : (
                  filtered.map(({ desc, threats }, i) => (
                    <SessionCard
                      key={desc}
                      description={desc}
                      threats={threats}
                      index={i}
                      onRerun={handleRerun}
                    />
                  ))
                )}
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
