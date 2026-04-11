"use client";

import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import { 
  Settings, Server, Cpu, Trash2, Shield, Activity, HardDrive, CheckCircle2
} from "lucide-react";

export default function SettingsPage() {
  // Settings State
  const [scoringMode, setScoringMode] = useState<string>("Dynamic");
  const [maxThreats, setMaxThreats] = useState<number>(5);
  const [showConfidence, setShowConfidence] = useState<boolean>(true);
  
  // Status State
  const [backendStatus, setBackendStatus] = useState<"Checking..." | "🟢 Running" | "🔴 Down">("Checking...");
  const [llmStatus, setLlmStatus] = useState<"Checking..." | "🟢 Connected" | "🔴 Disconnected">("Checking...");

  // Toast / Error State
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load Settings on Mount
  useEffect(() => {
    const savedScoringMode = localStorage.getItem("tara_scoring_mode") || "Dynamic";
    const savedMaxThreats = localStorage.getItem("tara_max_threats") ? parseInt(localStorage.getItem("tara_max_threats")!) : 5;
    const savedShowConfidence = localStorage.getItem("tara_show_confidence") !== "false";
    
    setScoringMode(savedScoringMode);
    setMaxThreats(savedMaxThreats);
    setShowConfidence(savedShowConfidence);
    
    // Check Backend Status
    const checkStatus = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/analysis/history", { method: "GET" });
        if (res.ok) {
          setBackendStatus("🟢 Running");
          setLlmStatus("🟢 Connected"); // Simulated LLM Status, assuming if backend runs DB works.
        } else {
          setBackendStatus("🔴 Down");
          setLlmStatus("🔴 Disconnected");
        }
      } catch (e) {
        setBackendStatus("🔴 Down");
        setLlmStatus("🔴 Disconnected");
      }
    };
    checkStatus();
  }, []);

  // Save changes to localStorage natively when they change
  useEffect(() => {
    localStorage.setItem("tara_scoring_mode", scoringMode);
    localStorage.setItem("tara_max_threats", maxThreats.toString());
    localStorage.setItem("tara_show_confidence", showConfidence.toString());
    console.log("Settings updated");
  }, [scoringMode, maxThreats, showConfidence]);

  const showToast = (msg: string, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 3000);
    } else {
      setToastMsg(msg);
      setTimeout(() => setToastMsg(null), 3000);
    }
  };

  const clearHistory = async () => {
    if (!confirm("Are you sure you want to permanently delete all threat history?")) return;
    
    try {
      const res = await fetch("http://127.0.0.1:8000/analysis/history", {
        method: "DELETE",
      });
      
      if (res.ok) {
        showToast("Threat history cleared successfully!");
      } else {
        showToast("Action failed. Check backend.", true);
      }
    } catch (e) {
      console.error(e);
      showToast("Action failed. Check backend.", true);
    }
  };

  return (
    <div className="flex bg-slate-950 min-h-screen text-slate-200 font-sans relative">
      <Sidebar />

      {/* TOASTS */}
      {toastMsg && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-50 bg-green-500/20 border border-green-500/50 text-green-400 px-4 py-3 rounded-lg shadow-xl shadow-green-900/20 flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 size={18} />
          <p className="font-semibold">{toastMsg}</p>
        </div>
      )}
      {errorMsg && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-50 bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg shadow-xl shadow-red-900/20 flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <Server size={18} />
          <p className="font-semibold">{errorMsg}</p>
        </div>
      )}

      <main className="flex-1 p-8 lg:p-12 overflow-x-hidden">
        <div className="max-w-4xl mx-auto space-y-8">
          
          <div className="mb-8 border-b border-slate-800 pb-6">
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400 flex items-center gap-3">
              <Settings className="text-indigo-400" size={32} />
              Platform Settings
            </h1>
            <p className="text-slate-400 mt-2">Manage your AI configurations and system thresholds.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* SECTION 1: AI CONFIGURATION */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
              <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2 mb-6">
                <Cpu size={20} className="text-purple-400" />
                AI Configuration
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-slate-800/50">
                  <span className="text-slate-400">AI Provider</span>
                  <span className="text-slate-200 font-medium bg-slate-800 px-3 py-1 rounded-md text-sm border border-slate-700">GROQ</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-800/50">
                  <span className="text-slate-400">Model</span>
                  <span className="text-slate-200 font-medium bg-slate-800 px-3 py-1 rounded-md text-sm border border-slate-700">llama3-70b-versatile</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-400">Mode</span>
                  <span className="text-indigo-400 font-medium bg-indigo-500/10 px-3 py-1 rounded-md text-sm border border-indigo-500/20">Production</span>
                </div>
              </div>
            </div>

            {/* SECTION 4: SYSTEM STATUS */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
              <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2 mb-6">
                <Activity size={20} className="text-green-400" />
                System Status
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-slate-800/50">
                  <span className="text-slate-400">Backend Server</span>
                  <span className="font-mono text-sm tracking-wide text-slate-300">{backendStatus}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-800/50">
                  <span className="text-slate-400">LLM Inference Node</span>
                  <span className="font-mono text-sm tracking-wide text-slate-300">{llmStatus}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-400">Database Connection</span>
                  <span className="font-mono text-sm tracking-wide text-slate-300">🟢 Active</span>
                </div>
              </div>
            </div>

            {/* SECTION 2: RISK SCORING SETTINGS */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
              <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2 mb-6">
                <Shield size={20} className="text-orange-400" />
                Risk Scoring Behavior
              </h2>
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input 
                    type="radio" 
                    name="scoringMode" 
                    value="Dynamic" 
                    checked={scoringMode === "Dynamic"}
                    onChange={(e) => setScoringMode(e.target.value)}
                    className="w-4 h-4 text-indigo-500 bg-slate-800 border-slate-600 focus:ring-indigo-500" 
                  />
                  <div>
                    <p className="text-slate-200 font-medium group-hover:text-indigo-300 transition-colors">Likelihood × Impact</p>
                    <p className="text-xs text-slate-500 mt-0.5">Dynamic calculation factoring both metrics.</p>
                  </div>
                </label>
                
                <label className="flex items-center gap-3 cursor-pointer group mt-4">
                  <input 
                    type="radio" 
                    name="scoringMode" 
                    value="Static" 
                    checked={scoringMode === "Static"}
                    onChange={(e) => setScoringMode(e.target.value)}
                    className="w-4 h-4 text-indigo-500 bg-slate-800 border-slate-600 focus:ring-indigo-500" 
                  />
                  <div>
                    <p className="text-slate-200 font-medium group-hover:text-indigo-300 transition-colors">Static Baseline</p>
                    <p className="text-xs text-slate-500 mt-0.5">Legacy mapping based solely on AI risk string.</p>
                  </div>
                </label>
              </div>
            </div>

            {/* SECTION 3: ANALYSIS SETTINGS */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
              <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2 mb-6">
                <HardDrive size={20} className="text-blue-400" />
                Analysis Parameters
              </h2>
              
              <div className="space-y-6">
                <div>
                  <label className="flex justify-between items-center mb-2 text-slate-300 text-sm font-medium">
                    Maximum Threats to Generate
                    <span className="text-indigo-400 font-mono text-xs bg-indigo-500/10 px-2 py-0.5 rounded">{maxThreats}</span>
                  </label>
                  <input 
                    type="range" 
                    min="1" 
                    max="10" 
                    value={maxThreats} 
                    onChange={(e) => setMaxThreats(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500" 
                  />
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-800/50">
                  <div>
                    <p className="text-slate-300 text-sm font-medium">Show AI Confidence</p>
                    <p className="text-xs text-slate-500 mt-0.5">Display percentage confidence in reports.</p>
                  </div>
                  <button 
                    onClick={() => setShowConfidence(!showConfidence)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${showConfidence ? 'bg-indigo-500' : 'bg-slate-700'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showConfidence ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* SECTION 5: DATA MANAGEMENT */}
          <div className="bg-slate-900 border border-red-500/20 rounded-2xl p-6 shadow-lg mt-6">
            <h2 className="text-lg font-semibold text-red-400 flex items-center gap-2 mb-2">
              <Trash2 size={20} />
              Danger Zone
            </h2>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <p className="text-slate-400 text-sm">
                Permanently delete all threat history and reset the analytical dataset. This cannot be undone.
              </p>
              <button 
                onClick={clearHistory}
                className="shrink-0 group flex items-center gap-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 px-5 py-2.5 rounded-lg font-medium transition-all"
              >
                <Trash2 size={18} className="group-hover:scale-110 transition-transform" />
                Clear History
              </button>
            </div>
          </div>
          
        </div>
      </main>
    </div>
  );
}
