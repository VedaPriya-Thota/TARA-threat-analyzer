"use client";

import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";

export default function HistoryPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        console.log("Fetching history from http://127.0.0.1:8000/analysis/history...");
        const res = await fetch("http://127.0.0.1:8000/analysis/history");
        const data = await res.json();
        
        console.log("History API response:", data);
        
        // Sort by risk_score descending
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

  const getRiskBadge = (level: string) => {
    switch (level?.toLowerCase()) {
      case "critical":
        return <span className="bg-red-500/20 text-red-500 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap border border-red-500/30">Critical</span>;
      case "high":
        return <span className="bg-orange-500/20 text-orange-500 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap border border-orange-500/30">High</span>;
      case "medium":
        return <span className="bg-yellow-500/20 text-yellow-500 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap border border-yellow-500/30">Medium</span>;
      case "low":
        return <span className="bg-green-500/20 text-green-500 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap border border-green-500/30">Low</span>;
      default:
        return <span className="bg-gray-500/20 text-gray-400 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap">{level || "Unknown"}</span>;
    }
  };

  return (
    <div className="flex bg-slate-950 min-h-screen text-white font-sans selection:bg-indigo-500/30">
      <Sidebar />

      <div className="flex-1 p-8 lg:p-12 overflow-x-auto">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
              Threat History
            </h1>
            <p className="text-slate-400 mt-2">Review previous threat intelligence scans.</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-20">
                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-slate-400 font-medium">Loading history...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center p-20 text-red-400">
                <svg className="w-12 h-12 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="font-medium text-lg">{error}</p>
                <button 
                  onClick={() => window.location.reload()} 
                  className="mt-6 px-6 py-2 bg-slate-800 hover:bg-slate-700 transition-colors rounded-lg text-sm text-slate-300"
                >
                  Retry
                </button>
              </div>
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-20 text-slate-500">
                <svg className="w-12 h-12 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-lg">No threat history available.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-950/50 text-slate-400 uppercase font-semibold text-xs tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="px-6 py-4">System Description</th>
                      <th className="px-6 py-4">Threat</th>
                      <th className="px-6 py-4">STRIDE</th>
                      <th className="px-6 py-4">Likelihood</th>
                      <th className="px-6 py-4">Impact</th>
                      <th className="px-6 py-4 text-center">Score</th>
                      <th className="px-6 py-4 text-center">Risk Level</th>
                      <th className="px-6 py-4 text-center">Conf.</th>
                      <th className="px-6 py-4">Mitigation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {history.map((h, i) => (
                      <tr key={i} className="hover:bg-slate-800/20 transition-colors group">
                        <td className="px-6 py-4 text-slate-300 font-medium truncate max-w-[200px]" title={h.system_description}>
                          {h.system_description}
                        </td>
                        <td className="px-6 py-4 text-red-200 truncate max-w-[250px]" title={h.threat}>
                          {h.threat}
                        </td>
                        <td className="px-6 py-4">
                          <span className="bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md text-xs border border-slate-700">
                            {h.stride}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-400">{h.likelihood}</td>
                        <td className="px-6 py-4 text-slate-400">{h.impact}</td>
                        <td className="px-6 py-4 text-center">
                          <span className="font-mono text-indigo-300 font-medium">{h.risk_score}</span>
                        </td>
                        <td className="px-6 py-4 flex justify-center">
                          {getRiskBadge(h.risk_level)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-slate-400 text-xs">
                            {h.confidence ? `${h.confidence}%` : "N/A"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-400 truncate max-w-[300px]" title={h.mitigation}>
                          {h.mitigation}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}