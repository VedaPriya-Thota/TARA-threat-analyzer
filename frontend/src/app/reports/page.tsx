"use client";

import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell 
} from "recharts";
import { 
  AlertTriangle, ShieldAlert, Target, ShieldCheck, Download, AlertCircle, TrendingUp, Cpu
} from "lucide-react";

export default function ReportsPage() {
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Compute Metrics if we have data
  const totalThreats = reportData.length;
  
  // Risk Counts
  const riskCounts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
  let totalScore = 0;
  let totalConfidence = 0;
  
  // Trackers for AI Insights
  let highestRiskThreat = reportData[0];
  const strideFreq: Record<string, number> = {};
  const mitigationsSet = new Set<string>();

  reportData.forEach((threat) => {
    // Counts
    const rl = threat.risk_level === "Critical" ? "Critical" :
               threat.risk_level === "High" ? "High" :
               threat.risk_level === "Medium" ? "Medium" : "Low";
    riskCounts[rl]++;
    
    // Averages
    totalScore += threat.risk_score || 0;
    totalConfidence += threat.confidence || 0;

    // Highest Risk tracking
    if (!highestRiskThreat || threat.risk_score > highestRiskThreat.risk_score) {
      highestRiskThreat = threat;
    }

    // STRIDE Freq
    const stride = threat.stride || "Unknown";
    strideFreq[stride] = (strideFreq[stride] || 0) + 1;

    // Mitigations
    if (threat.mitigation) {
      mitigationsSet.add(threat.mitigation);
    }
  });

  const avgRisk = totalThreats > 0 ? (totalScore / totalThreats) : 0;
  const avgConfidence = totalThreats > 0 ? (totalConfidence / totalThreats) : 0;
  
  const mostCommonStride = Object.entries(strideFreq).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";
  
  const overallRiskLevel = avgRisk > 15 ? "High" : avgRisk >= 8 ? "Medium" : "Low";
  const overallRiskColor = overallRiskLevel === "High" ? "text-orange-500" :
                           overallRiskLevel === "Medium" ? "text-yellow-500" : "text-green-500";

  // System context
  const latestSystemDesc = totalThreats > 0 ? reportData[reportData.length - 1].system_description : "N/A";

  // Chart Formatting
  const chartData = [
    { name: "Critical", threats: riskCounts.Critical, color: "#ef4444" },
    { name: "High", threats: riskCounts.High, color: "#f97316" },
    { name: "Medium", threats: riskCounts.Medium, color: "#eab308" },
    { name: "Low", threats: riskCounts.Low, color: "#22c55e" },
  ];

  const getRiskBadge = (level: string) => {
    switch (level?.toLowerCase()) {
      case "critical": return <span className="bg-red-500/20 text-red-500 px-2 py-1 rounded-md text-xs font-semibold whitespace-nowrap">Critical</span>;
      case "high": return <span className="bg-orange-500/20 text-orange-500 px-2 py-1 rounded-md text-xs font-semibold whitespace-nowrap">High</span>;
      case "medium": return <span className="bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded-md text-xs font-semibold whitespace-nowrap">Medium</span>;
      case "low": return <span className="bg-green-500/20 text-green-500 px-2 py-1 rounded-md text-xs font-semibold whitespace-nowrap">Low</span>;
      default: return <span className="bg-gray-500/20 text-gray-400 px-2 py-1 rounded-md text-xs font-semibold whitespace-nowrap">{level || "Unknown"}</span>;
    }
  };

  const handleDownloadPdf = () => {
    // Placeholder trigger for PDF export (jspdf mapping available here)
    window.print(); 
  };

  return (
    <div className="flex bg-slate-950 min-h-screen text-slate-200 font-sans">
      <Sidebar />

      <main className="flex-1 p-8 lg:p-12 overflow-x-hidden">
        <div className="max-w-7xl mx-auto space-y-8" id="report-container">
          
          {loading ? (
            <div className="flex flex-col items-center justify-center p-20 min-h-[50vh]">
              <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-slate-400 font-medium">Analyzing intelligence...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center p-20 bg-slate-900 border border-slate-800 rounded-2xl">
              <AlertCircle className="w-12 h-12 text-red-400 mb-4 opacity-50" />
              <p className="font-medium text-lg text-red-400">{error}</p>
            </div>
          ) : totalThreats === 0 ? (
            <div className="flex flex-col items-center justify-center p-20 bg-slate-900 border border-slate-800 rounded-2xl">
              <ShieldCheck className="w-12 h-12 text-slate-500 mb-4 opacity-50" />
              <p className="font-medium text-lg text-slate-500">No analysis data available.</p>
            </div>
          ) : (
            <>
              {/* SECTION 1: HEADER */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-800 pb-6">
                <div>
                  <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
                    Security Threat Report
                  </h1>
                  <p className="text-slate-400 mt-2 text-lg">System: <span className="text-slate-200 font-semibold">{latestSystemDesc}</span></p>
                  <p className="text-slate-500 text-sm mt-1">Generated: {new Date().toLocaleString()}</p>
                </div>
                <button 
                  onClick={handleDownloadPdf}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition shadow-xl shadow-indigo-900/20 font-medium"
                >
                  <Download size={18} /> Download PDF
                </button>
              </div>

              {/* BONUS: Most Critical Alert Box */}
              {highestRiskThreat && highestRiskThreat.risk_level === "Critical" && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5 flex items-start gap-4">
                  <AlertTriangle className="text-red-500 mt-1 shrink-0" />
                  <div>
                    <h3 className="text-red-400 font-bold text-lg">Critical Threat Detected</h3>
                    <p className="text-red-200/80 mt-1">
                      <span className="font-semibold text-white">{highestRiskThreat.threat}</span> introduces severe risk (Score: {highestRiskThreat.risk_score}). Immediate mitigation required.
                    </p>
                  </div>
                </div>
              )}

              {/* SECTION 2: RISK SUMMARY CARDS */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                  <AlertTriangle className="text-red-500 mb-3" size={24} />
                  <p className="text-slate-400 text-sm font-medium">Critical</p>
                  <p className="text-3xl font-bold text-slate-100 mt-1">{riskCounts.Critical}</p>
                </div>
                
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-orange-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                  <ShieldAlert className="text-orange-500 mb-3" size={24} />
                  <p className="text-slate-400 text-sm font-medium">High</p>
                  <p className="text-3xl font-bold text-slate-100 mt-1">{riskCounts.High}</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-yellow-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                  <Target className="text-yellow-500 mb-3" size={24} />
                  <p className="text-slate-400 text-sm font-medium">Medium</p>
                  <p className="text-3xl font-bold text-slate-100 mt-1">{riskCounts.Medium}</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-green-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                  <ShieldCheck className="text-green-500 mb-3" size={24} />
                  <p className="text-slate-400 text-sm font-medium">Low</p>
                  <p className="text-3xl font-bold text-slate-100 mt-1">{riskCounts.Low}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* SECTION 3: RISK VISUALIZATION */}
                <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-slate-200 mb-6 flex items-center gap-2">
                    <TrendingUp size={20} className="text-indigo-400"/>
                    Risk Distribution
                  </h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip 
                          cursor={{fill: '#1e293b'}} 
                          contentStyle={{backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px'}}
                          itemStyle={{color: '#f8fafc', fontWeight: 'bold'}}
                        />
                        <Bar dataKey="threats" radius={[4, 4, 0, 0]} maxBarSize={60}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* SECTION 5: AI INSIGHTS */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-200 mb-6 flex items-center gap-2">
                      <Cpu size={20} className="text-purple-400"/>
                      AI Insights
                    </h3>
                    
                    <div className="space-y-5">
                      <div>
                        <p className="text-slate-500 text-sm font-medium">Overall System Risk</p>
                        <p className={`text-2xl font-bold mt-1 ${overallRiskColor}`}>{overallRiskLevel}</p>
                        <p className="text-slate-400 text-xs mt-1">Avg Score: {avgRisk.toFixed(1)}</p>
                      </div>

                      <div className="h-px w-full bg-slate-800"></div>

                      <div>
                        <p className="text-slate-500 text-sm font-medium">Most Common Vector</p>
                        <p className="text-indigo-300 text-lg font-semibold mt-1">{mostCommonStride}</p>
                      </div>

                      <div className="h-px w-full bg-slate-800"></div>
                      
                      {/* BONUS: Confidence Score */}
                      <div>
                        <p className="text-slate-500 text-sm font-medium">Avg AI Confidence</p>
                        <div className="flex items-center gap-3 mt-2">
                          <div className="h-2 flex-1 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-purple-500 rounded-full" style={{width: `${Math.min(avgConfidence, 100)}%`}}></div>
                          </div>
                          <span className="text-purple-300 font-bold">{Math.round(avgConfidence)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 4: THREAT TABLE */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-slate-800">
                  <h3 className="text-lg font-semibold text-slate-200">Identified Threats</h3>
                </div>
                <div className="overflow-x-auto max-h-[400px]">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-950/80 sticky top-0 backdrop-blur-sm z-10 text-slate-400 uppercase font-semibold text-xs tracking-wider">
                      <tr>
                        <th className="px-6 py-4">Threat</th>
                        <th className="px-6 py-4">STRIDE</th>
                        <th className="px-6 py-4">Likelihood</th>
                        <th className="px-6 py-4">Impact</th>
                        <th className="px-6 py-4 text-center">Score</th>
                        <th className="px-6 py-4 text-center">Risk Level</th>
                        <th className="px-6 py-4 text-center">Conf.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {reportData.map((h, i) => (
                        <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-6 py-4 text-slate-200 truncate max-w-[250px]" title={h.threat}>
                            {h.threat}
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-slate-300 text-xs">{h.stride}</span>
                          </td>
                          <td className="px-6 py-4 text-slate-400">{h.likelihood}</td>
                          <td className="px-6 py-4 text-slate-400">{h.impact}</td>
                          <td className="px-6 py-4 text-center font-mono text-indigo-300">
                            {h.risk_score}
                          </td>
                          <td className="px-6 py-4 flex justify-center">
                            {getRiskBadge(h.risk_level)}
                          </td>
                          <td className="px-6 py-4 text-slate-500 text-xs text-center">
                            {h.confidence || "N/A"}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SECTION 6: RECOMMENDATIONS */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-slate-200 mb-6 flex items-center gap-2">
                  <ShieldCheck size={20} className="text-green-400"/>
                  Consolidated Mitigation Plan
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Array.from(mitigationsSet).map((mitigation, idx) => (
                    <div key={idx} className="flex items-start gap-3 bg-slate-950 p-4 rounded-lg border border-slate-800/50">
                      <div className="mt-0.5 bg-green-500/20 p-1 rounded">
                        <ShieldCheck size={14} className="text-green-500" />
                      </div>
                      <p className="text-slate-300 text-sm leading-relaxed">{mitigation}</p>
                    </div>
                  ))}
                </div>
              </div>

            </>
          )}
        </div>
      </main>
    </div>
  );
}
