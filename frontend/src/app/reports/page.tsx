"use client";

import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import BackToHome from "../components/BackToHome";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid
} from "recharts";
import {
  AlertTriangle, ShieldAlert, Target, ShieldCheck, Download, AlertCircle, TrendingUp, Cpu,
  CheckCircle2, ChevronDown
} from "lucide-react";

export default function ReportsPage() {
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openStride, setOpenStride] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        const res = await fetch("http://127.0.0.1:8000/analysis/history");
        const data = await res.json();
        console.log("Report data:", data);
        if (Array.isArray(data) && data.length > 0) {
          setReportData(data);
        } else {
          setReportData([]);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to generate report. Check backend.");
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, []);

  const totalThreats = reportData.length;
  const riskCounts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
  let totalScore = 0;
  let totalConfidence = 0;
  let highestRiskThreat = reportData[0];
  const strideFreq: Record<string, number> = {};
  const mitigationsSet = new Set<string>();

  reportData.forEach((threat) => {
    const rl = threat.risk_level === "Critical" ? "Critical" :
               threat.risk_level === "High" ? "High" :
               threat.risk_level === "Medium" ? "Medium" : "Low";
    riskCounts[rl]++;
    totalScore += threat.risk_score || 0;
    totalConfidence += threat.confidence || 0;
    if (!highestRiskThreat || threat.risk_score > highestRiskThreat.risk_score) {
      highestRiskThreat = threat;
    }
    const stride = threat.stride || "Unknown";
    strideFreq[stride] = (strideFreq[stride] || 0) + 1;
    if (threat.mitigation) mitigationsSet.add(threat.mitigation);
  });

  const avgRisk = totalThreats > 0 ? (totalScore / totalThreats) : 0;
  const avgConfidence = totalThreats > 0 ? (totalConfidence / totalThreats) : 0;
  const mostCommonStride = Object.entries(strideFreq).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";
  const overallRiskLevel = avgRisk > 15 ? "High" : avgRisk >= 8 ? "Medium" : "Low";

  const overallRiskStyle = overallRiskLevel === "High"
    ? { color: "#f97316", bg: "rgba(249,115,22,.1)", border: "rgba(249,115,22,.25)" }
    : overallRiskLevel === "Medium"
    ? { color: "#f59e0b", bg: "rgba(245,158,11,.1)", border: "rgba(245,158,11,.25)" }
    : { color: "#22c55e", bg: "rgba(34,197,94,.1)",  border: "rgba(34,197,94,.25)"  };

  const latestSystemDesc = totalThreats > 0 ? reportData[reportData.length - 1].system_description : "N/A";

  const chartData = [
    { name: "Critical", threats: riskCounts.Critical, color: "#ef4444" },
    { name: "High",     threats: riskCounts.High,     color: "#f97316" },
    { name: "Medium",   threats: riskCounts.Medium,   color: "#eab308" },
    { name: "Low",      threats: riskCounts.Low,       color: "#22c55e" },
  ];

  const getRiskBadge = (level: string) => {
    switch (level?.toLowerCase()) {
      case "critical": return <span style={{background:"rgba(239,68,68,.12)",color:"#ef4444",border:"1px solid rgba(239,68,68,.25)"}} className="px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap">Critical</span>;
      case "high":     return <span style={{background:"rgba(249,115,22,.12)",color:"#f97316",border:"1px solid rgba(249,115,22,.25)"}} className="px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap">High</span>;
      case "medium":   return <span style={{background:"rgba(245,158,11,.12)",color:"#f59e0b",border:"1px solid rgba(245,158,11,.25)"}} className="px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap">Medium</span>;
      case "low":      return <span style={{background:"rgba(34,197,94,.12)", color:"#22c55e",border:"1px solid rgba(34,197,94,.25)}"}} className="px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap">Low</span>;
      default:         return <span className="bg-slate-700/50 text-slate-400 px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap">{level || "Unknown"}</span>;
    }
  };

  const handleDownloadPdf = () => { window.print(); };

  /* ── Summary card config ── */
  const SUMMARY_CARDS = [
    { label: "Critical", count: riskCounts.Critical, Icon: AlertTriangle, color: "#ef4444", bg: "rgba(239,68,68,.08)", border: "rgba(239,68,68,.18)", glow: "rgba(239,68,68,.06)" },
    { label: "High",     count: riskCounts.High,     Icon: ShieldAlert,   color: "#f97316", bg: "rgba(249,115,22,.08)", border: "rgba(249,115,22,.18)", glow: "rgba(249,115,22,.06)" },
    { label: "Medium",   count: riskCounts.Medium,   Icon: Target,        color: "#f59e0b", bg: "rgba(245,158,11,.08)", border: "rgba(245,158,11,.18)", glow: "rgba(245,158,11,.06)" },
    { label: "Low",      count: riskCounts.Low,       Icon: ShieldCheck,   color: "#22c55e", bg: "rgba(34,197,94,.08)",  border: "rgba(34,197,94,.18)",  glow: "rgba(34,197,94,.06)"  },
  ];

  return (
    <div
      className="flex min-h-screen text-slate-200 font-sans"
      style={{ background: "radial-gradient(ellipse at 80% 0%, rgba(30,42,88,.5) 0%, #050712 55%)" }}
    >
      <BackToHome />
      <Sidebar />

      <main className="flex-1 p-8 lg:p-12 overflow-x-hidden">
        <div className="max-w-7xl mx-auto space-y-8" id="report-container">

          {loading ? (
            <div className="flex flex-col items-center justify-center p-20 min-h-[50vh]">
              <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="mt-4 text-slate-400 font-medium">Analyzing intelligence...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center p-20 rounded-2xl" style={{ background: "rgba(10,15,28,.85)", border: "1px solid rgba(30,41,59,.9)" }}>
              <AlertCircle className="w-12 h-12 text-red-400 mb-4 opacity-50" />
              <p className="font-medium text-lg text-red-400">{error}</p>
            </div>
          ) : totalThreats === 0 ? (
            <div className="flex flex-col items-center justify-center p-20 rounded-2xl" style={{ background: "rgba(10,15,28,.85)", border: "1px solid rgba(30,41,59,.9)" }}>
              <ShieldCheck className="w-12 h-12 text-slate-500 mb-4 opacity-50" />
              <p className="font-medium text-lg text-slate-500">No analysis data available.</p>
            </div>
          ) : (
            <>
              {/* ── SECTION 1: HEADER ── */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-5 pb-6" style={{ borderBottom: "1px solid rgba(30,41,59,.8)" }}>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#818cf8", boxShadow: "0 0 6px #818cf8", display: "inline-block" }} />
                    <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">Security Report</span>
                  </div>
                  <h1 className="text-3xl font-black tracking-tight bg-clip-text text-transparent"
                    style={{ backgroundImage: "linear-gradient(135deg, #818cf8, #c084fc)" }}>
                    Security Threat Report
                  </h1>
                  <p className="text-slate-400 mt-1.5 text-sm">
                    System: <span className="text-slate-200 font-semibold">{latestSystemDesc}</span>
                  </p>
                  <p className="text-slate-600 text-xs mt-0.5">Generated: {new Date().toLocaleString()}</p>
                </div>

                <button
                  onClick={handleDownloadPdf}
                  className="flex items-center gap-2.5 font-semibold text-sm text-white transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap"
                  style={{
                    background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                    padding: "10px 20px",
                    borderRadius: 10,
                    border: "1px solid rgba(129,140,248,.3)",
                    boxShadow: "0 0 20px rgba(79,70,229,.25), 0 4px 12px rgba(0,0,0,.3)",
                  }}
                >
                  <Download size={16} />
                  Download PDF
                </button>
              </div>

              {/* ── CRITICAL ALERT BANNER ── */}
              {highestRiskThreat && highestRiskThreat.risk_level === "Critical" && (
                <div style={{
                  background: "rgba(239,68,68,.07)",
                  border: "1px solid rgba(239,68,68,.3)",
                  borderLeft: "3px solid #ef4444",
                  borderRadius: 12,
                  padding: "16px 20px",
                }}>
                  <div className="flex items-start gap-3">
                    <div style={{ background: "rgba(239,68,68,.15)", borderRadius: 8, padding: 7, flexShrink: 0, marginTop: 1 }}>
                      <AlertTriangle size={16} style={{ color: "#ef4444" }} />
                    </div>
                    <div>
                      <h3 className="font-bold text-base" style={{ color: "#f87171" }}>Critical Threat Detected</h3>
                      <p className="text-sm mt-1 leading-relaxed" style={{ color: "rgba(254,202,202,.75)" }}>
                        <span className="font-semibold text-white">{highestRiskThreat.threat}</span>
                        {" "}introduces severe risk (Score: <span className="font-bold text-red-300">{highestRiskThreat.risk_score}</span>). Immediate mitigation required.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ── SECTION 2: RISK SUMMARY CARDS ── */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {SUMMARY_CARDS.map(({ label, count, Icon, color, bg, border, glow }) => (
                  <div
                    key={label}
                    className="relative overflow-hidden rounded-2xl transition-all duration-200 hover:-translate-y-0.5 group"
                    style={{ background: "rgba(10,15,28,.9)", border: `1px solid ${border}`, padding: "20px 22px" }}
                  >
                    {/* Corner accent */}
                    <div className="absolute top-0 right-0 w-20 h-20 rounded-bl-full transition-transform duration-300 group-hover:scale-110"
                      style={{ background: glow, marginTop: -16, marginRight: -16 }} />
                    {/* Icon */}
                    <div className="mb-3 relative" style={{ display: "inline-flex", padding: 8, borderRadius: 10, background: `${color}14`, border: `1px solid ${color}22` }}>
                      <Icon size={18} style={{ color }} />
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "#475569" }}>{label}</p>
                    <p className="text-3xl font-black" style={{ color: count > 0 ? color : "#1e293b" }}>{count}</p>
                    <p className="text-xs mt-1" style={{ color: "#1e3a52" }}>
                      {count === 0 ? "None detected" : `${Math.round((count / totalThreats) * 100)}% of total`}
                    </p>
                  </div>
                ))}
              </div>

              {/* ── SECTION 3+5: CHART + AI INSIGHTS ── */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Risk Distribution Chart */}
                <div className="lg:col-span-2 rounded-2xl" style={{ background: "rgba(10,15,28,.9)", border: "1px solid rgba(30,41,59,.9)", padding: "22px 24px" }}>
                  <div className="flex items-center gap-2 mb-6">
                    <div style={{ background: "rgba(99,102,241,.15)", padding: 7, borderRadius: 9, display: "inline-flex" }}>
                      <TrendingUp size={16} style={{ color: "#818cf8" }} />
                    </div>
                    <h3 className="font-bold text-base text-slate-200">Risk Distribution</h3>
                    <span className="ml-auto text-xs font-medium px-2.5 py-1 rounded-full"
                      style={{ color: "#475569", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.05)" }}>
                      {totalThreats} threats
                    </span>
                  </div>
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 8, right: 4, left: -18, bottom: 0 }} barCategoryGap="35%">
                        <CartesianGrid vertical={false} stroke="rgba(255,255,255,.04)" strokeDasharray="3 0" />
                        <XAxis dataKey="name" stroke="transparent" tick={{ fill: "#475569", fontSize: 11, fontWeight: 600 }} tickLine={false} axisLine={false} />
                        <YAxis stroke="transparent" tick={{ fill: "#334155", fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} width={22} />
                        <Tooltip
                          cursor={{ fill: "rgba(255,255,255,.025)", radius: 4 }}
                          contentStyle={{ backgroundColor: "rgba(7,11,22,.97)", border: "1px solid rgba(51,65,85,.6)", borderRadius: 10, fontSize: 12 }}
                          itemStyle={{ color: "#e2e8f0", fontWeight: 700 }}
                          labelStyle={{ color: "#64748b", fontWeight: 600 }}
                        />
                        <Bar dataKey="threats" radius={[6, 6, 0, 0]} maxBarSize={52}>
                          {chartData.map((entry, i) => (
                            <Cell
                              key={i}
                              fill={entry.color}
                              opacity={entry.threats === 0 ? 0.2 : 1}
                              style={entry.threats > 0 ? { filter: `drop-shadow(0 2px 6px ${entry.color}44)` } : undefined}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* AI Insights */}
                <div className="rounded-2xl flex flex-col gap-0" style={{ background: "rgba(10,15,28,.9)", border: "1px solid rgba(30,41,59,.9)", padding: "22px 24px" }}>
                  <div className="flex items-center gap-2 mb-6">
                    <div style={{ background: "rgba(192,132,252,.12)", padding: 7, borderRadius: 9, display: "inline-flex" }}>
                      <Cpu size={16} style={{ color: "#c084fc" }} />
                    </div>
                    <h3 className="font-bold text-base text-slate-200">AI Insights</h3>
                  </div>

                  <div className="flex flex-col gap-4">
                    {/* Overall Risk */}
                    <div style={{ background: `${overallRiskStyle.bg}`, border: `1px solid ${overallRiskStyle.border}`, borderRadius: 10, padding: "12px 14px" }}>
                      <p className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "#334155" }}>Overall System Risk</p>
                      <div className="flex items-center gap-2">
                        <span style={{
                          width: 8, height: 8, borderRadius: "50%",
                          background: overallRiskStyle.color,
                          boxShadow: `0 0 6px ${overallRiskStyle.color}`,
                          flexShrink: 0, display: "inline-block",
                        }} />
                        <span className="text-xl font-black" style={{ color: overallRiskStyle.color }}>{overallRiskLevel}</span>
                      </div>
                      <p className="text-xs mt-1" style={{ color: "#475569" }}>Avg score: <span style={{ color: overallRiskStyle.color, fontWeight: 700 }}>{avgRisk.toFixed(1)}</span></p>
                    </div>

                    {/* Most Common Vector */}
                    <div style={{ background: "rgba(255,255,255,.025)", borderRadius: 10, padding: "12px 14px" }}>
                      <p className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "#334155" }}>Most Common Vector</p>
                      <p className="text-base font-bold" style={{ color: "#a5b4fc" }}>{mostCommonStride}</p>
                      <p className="text-xs mt-0.5" style={{ color: "#334155" }}>{strideFreq[mostCommonStride] || 0} occurrence{(strideFreq[mostCommonStride] || 0) !== 1 ? "s" : ""}</p>
                    </div>

                    {/* Avg AI Confidence */}
                    <div style={{ background: "rgba(255,255,255,.025)", borderRadius: 10, padding: "12px 14px" }}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#334155" }}>Avg AI Confidence</p>
                        <span className="text-sm font-black" style={{ color: "#c084fc" }}>{Math.round(avgConfidence)}%</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,.06)" }}>
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(avgConfidence, 100)}%`,
                            background: "linear-gradient(90deg, #7c3aed, #c084fc)",
                            boxShadow: "0 0 8px rgba(192,132,252,.4)",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── SECTION 4: THREAT TABLE ── */}
              <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(10,15,28,.9)", border: "1px solid rgba(30,41,59,.9)" }}>
                <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid rgba(30,41,59,.8)" }}>
                  <div className="flex items-center gap-2">
                    <div style={{ background: "rgba(99,102,241,.12)", padding: 6, borderRadius: 8, display: "inline-flex" }}>
                      <ShieldAlert size={14} style={{ color: "#818cf8" }} />
                    </div>
                    <h3 className="font-bold text-base text-slate-200">Identified Threats</h3>
                  </div>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ color: "#475569", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.05)" }}>
                    {totalThreats} total
                  </span>
                </div>
                <div className="overflow-x-auto" style={{ maxHeight: 400 }}>
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 z-10" style={{ background: "rgba(5,7,18,.97)", backdropFilter: "blur(8px)" }}>
                      <tr>
                        {["Threat", "STRIDE", "Likelihood", "Impact", "Score", "Risk Level", "Conf."].map(h => (
                          <th key={h} className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: "#334155", borderBottom: "1px solid rgba(30,41,59,.8)" }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.map((h, i) => (
                        <tr
                          key={i}
                          className="transition-colors"
                          style={{ borderBottom: "1px solid rgba(255,255,255,.03)" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "rgba(99,102,241,.04)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                        >
                          <td className="px-5 py-3.5 font-semibold text-slate-200 max-w-[220px] truncate" title={h.threat}>{h.threat}</td>
                          <td className="px-5 py-3.5">
                            <span className="text-xs font-semibold px-2 py-1 rounded-md" style={{ color: "#a5b4fc", background: "rgba(99,102,241,.1)", border: "1px solid rgba(99,102,241,.2)" }}>
                              {h.stride}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-sm" style={{ color: "#475569" }}>{h.likelihood}</td>
                          <td className="px-5 py-3.5 text-sm" style={{ color: "#475569" }}>{h.impact}</td>
                          <td className="px-5 py-3.5 text-center font-mono font-bold text-sm" style={{ color: "#818cf8" }}>{h.risk_score}</td>
                          <td className="px-5 py-3.5"><div className="flex justify-center">{getRiskBadge(h.risk_level)}</div></td>
                          <td className="px-5 py-3.5 text-center text-xs font-semibold" style={{ color: "#334155" }}>{h.confidence || "N/A"}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── SECTION 6: MITIGATION PLAN ── */}
              {(() => {
                const riskOrder: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
                const levelColor: Record<string, string> = {
                  Critical: "#ef4444", High: "#f97316", Medium: "#f59e0b", Low: "#22c55e",
                };

                // STRIDE category display config
                const strideConfig: Record<string, { label: string; short: string; color: string; bg: string; border: string }> = {
                  Spoofing:             { label: "Spoofing",              short: "S", color: "#f472b6", bg: "rgba(244,114,182,.08)", border: "rgba(244,114,182,.2)" },
                  Tampering:            { label: "Tampering",             short: "T", color: "#fb923c", bg: "rgba(251,146,60,.08)",  border: "rgba(251,146,60,.2)"  },
                  Repudiation:          { label: "Repudiation",           short: "R", color: "#a78bfa", bg: "rgba(167,139,250,.08)", border: "rgba(167,139,250,.2)" },
                  "Information Disclosure": { label: "Information Disclosure", short: "I", color: "#38bdf8", bg: "rgba(56,189,248,.08)",  border: "rgba(56,189,248,.2)"  },
                  "Denial of Service":  { label: "Denial of Service",     short: "D", color: "#f87171", bg: "rgba(248,113,113,.08)", border: "rgba(248,113,113,.2)" },
                  "Elevation of Privilege": { label: "Elevation of Privilege", short: "E", color: "#facc15", bg: "rgba(250,204,21,.08)",  border: "rgba(250,204,21,.2)"  },
                };

                // Group by STRIDE, within each group sort by risk severity
                const grouped: Record<string, typeof reportData> = {};
                reportData
                  .filter(t => t.mitigation)
                  .forEach(t => {
                    const key = t.stride || "Unknown";
                    if (!grouped[key]) grouped[key] = [];
                    grouped[key].push(t);
                  });
                Object.values(grouped).forEach(arr =>
                  arr.sort((a, b) => (riskOrder[a.risk_level] ?? 4) - (riskOrder[b.risk_level] ?? 4))
                );

                // Order groups by STRIDE canonical order
                const strideOrder = ["Spoofing","Tampering","Repudiation","Information Disclosure","Denial of Service","Elevation of Privilege"];
                const sortedGroups = Object.keys(grouped).sort(
                  (a, b) => (strideOrder.indexOf(a) ?? 99) - (strideOrder.indexOf(b) ?? 99)
                );

                const totalActions = reportData.filter(t => t.mitigation).length;

                return (
                  <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(10,15,28,.9)", border: "1px solid rgba(30,41,59,.9)" }}>
                    {/* Header */}
                    <div className="flex items-center gap-2.5 px-6 py-4" style={{ borderBottom: "1px solid rgba(30,41,59,.8)" }}>
                      <div style={{ background: "rgba(34,197,94,.1)", padding: 7, borderRadius: 9, display: "inline-flex" }}>
                        <ShieldCheck size={16} style={{ color: "#22c55e" }} />
                      </div>
                      <h3 className="font-bold text-base text-slate-200">Mitigation Plan</h3>
                      {/* STRIDE group pills */}
                      <div className="hidden md:flex items-center gap-1.5 ml-4 flex-wrap">
                        {sortedGroups.map(g => {
                          const cfg = strideConfig[g];
                          return cfg ? (
                            <span key={g} className="text-xs font-bold px-2 py-0.5 rounded-full"
                              style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                              {cfg.short} · {grouped[g].length}
                            </span>
                          ) : null;
                        })}
                      </div>
                      <span className="ml-auto text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0"
                        style={{ color: "#475569", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.05)" }}>
                        {totalActions} action{totalActions !== 1 ? "s" : ""}
                      </span>
                    </div>

                    {/* Groups */}
                    <div className="divide-y" style={{ borderColor: "rgba(30,41,59,.6)" }}>
                      {sortedGroups.map(strideKey => {
                        const cfg = strideConfig[strideKey] || { label: strideKey, color: "#94a3b8", bg: "rgba(148,163,184,.06)", border: "rgba(148,163,184,.15)" };
                        const threats = grouped[strideKey];
                        const isOpen = !!openStride[strideKey];
                        return (
                          <div key={strideKey}>
                            {/* Accordion toggle header */}
                            <button
                              onClick={() => setOpenStride(prev => ({ ...prev, [strideKey]: !prev[strideKey] }))}
                              className="w-full flex items-center gap-3 px-6 py-3.5 transition-colors duration-150 text-left"
                              style={{ background: isOpen ? cfg.bg : "transparent", borderBottom: isOpen ? `1px solid ${cfg.border}` : "none" }}
                              onMouseEnter={e => { if (!isOpen) (e.currentTarget as HTMLElement).style.background = `${cfg.bg}`; }}
                              onMouseLeave={e => { if (!isOpen) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                            >
                              <div className="w-5 h-5 rounded flex items-center justify-center text-xs font-black flex-shrink-0"
                                style={{ background: `${cfg.color}20`, color: cfg.color, border: `1px solid ${cfg.color}30` }}>
                                {cfg.label[0]}
                              </div>
                              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: cfg.color }}>
                                {cfg.label}
                              </span>
                              <span className="text-xs font-medium ml-1" style={{ color: `${cfg.color}60` }}>
                                — {threats.length} threat{threats.length !== 1 ? "s" : ""}
                              </span>
                              <ChevronDown
                                size={14}
                                className="ml-auto flex-shrink-0 transition-transform duration-200"
                                style={{ color: cfg.color, opacity: 0.6, transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                              />
                            </button>

                            {/* Collapsible rows */}
                            {isOpen && (
                              <table className="w-full text-sm">
                                <tbody>
                                  {threats.map((t, idx) => {
                                    const rColor = levelColor[t.risk_level] || "#94a3b8";
                                    const isLast = idx === threats.length - 1;
                                    return (
                                      <tr
                                        key={idx}
                                        style={{ borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,.04)" }}
                                        onMouseEnter={e => (e.currentTarget.style.background = "rgba(99,102,241,.04)")}
                                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                                      >
                                        {/* Risk badge */}
                                        <td className="px-6 py-3.5 whitespace-nowrap" style={{ width: 110 }}>
                                          <div className="flex items-center gap-1.5">
                                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: rColor, boxShadow: `0 0 4px ${rColor}`, flexShrink: 0, display: "inline-block" }} />
                                            <span className="text-xs font-bold" style={{ color: rColor }}>{t.risk_level}</span>
                                          </div>
                                        </td>

                                        {/* Threat */}
                                        <td className="px-4 py-3.5" style={{ width: "28%" }}>
                                          <span className="text-sm font-semibold text-slate-200 leading-snug" title={t.threat}>
                                            {t.threat}
                                          </span>
                                        </td>

                                        {/* Arrow separator */}
                                        <td className="py-3.5 text-center" style={{ width: 28, color: "#1e293b" }}>→</td>

                                        {/* Mitigation */}
                                        <td className="px-4 py-3.5">
                                          <div className="flex items-start gap-2">
                                            <CheckCircle2 size={13} style={{ color: "#22c55e", flexShrink: 0, marginTop: 2, opacity: 0.8 }} />
                                            <span className="text-sm leading-relaxed" style={{ color: "#94a3b8" }}>
                                              {t.mitigation}
                                            </span>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

            </>
          )}
        </div>
      </main>
    </div>
  );
}
