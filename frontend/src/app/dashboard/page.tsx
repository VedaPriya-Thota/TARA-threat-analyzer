"use client"

import { useState } from "react"
import axios from "axios"
import Sidebar from "../components/Sidebar"
import RiskChart from "../components/RiskChart"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"

export default function Dashboard() {
  const [description, setDescription] = useState("")
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const analyzeSystem = async () => {
    if (!description.trim()) {
      setError("Please enter a system description.")
      return
    }
    setError("")
    setLoading(true)
    try {
      const res = await axios.post("http://localhost:8000/analysis/", { system_description: description })
      setResults(res.data.analysis ?? [])
    } catch (err) {
      setError("Failed to connect to backend. Ensure backend is running on :8000.")
    } finally {
      setLoading(false)
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

  const high = results.filter((r) => r.risk_level?.toLowerCase() === "high").length
  const medium = results.filter((r) => r.risk_level?.toLowerCase() === "medium").length
  const low = results.filter((r) => r.risk_level?.toLowerCase() === "low").length
  const chartData = [
    { name: "High", value: high },
    { name: "Medium", value: medium },
    { name: "Low", value: low }
  ]

  return (
    <div className="dashboard-shell">
      <Sidebar />
      <div className="dashboard-main">
        <div className="dashboard-header">
          <div>
            <h1>TARA Threat Dashboard</h1>
            <p>Describe your architecture and run threat analysis to view risk and mitigation details.</p>
          </div>
          <div className="status-pill">
            {loading ? "Analyzing..." : "Ready"}
          </div>
        </div>

        <section className="analysis-panel">
          <div className="panel-head">
            <h2>System Threat Analysis</h2>
            <p className="muted-text">Enter your system description and click Analyze.</p>
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="analysis-textarea"
            placeholder="System description..."
          />
          <div className="analysis-actions">
            <button onClick={analyzeSystem} className="action-btn analyze-btn">Analyze System</button>
            <button onClick={exportPDF} className="action-btn export-btn">Export PDF</button>
          </div>
          {error && <div className="error-text">{error}</div>}
        </section>

        <div className="result-grid">
          <section id="report" className="panel report-panel">
            <div className="panel-head"><h2>Threat Report</h2></div>
            <div className="table-wrap">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Threat</th>
                    <th>Category</th>
                    <th>STRIDE</th>
                    <th>Risk</th>
                    <th>Score</th>
                    <th>Mitigation</th>
                  </tr>
                </thead>
                <tbody>
                  {results.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="empty-row"> {/* ✅ changed 5 → 6 */}
                        No analysis yet. Run system analysis.
                      </td>
                    </tr>
                  ) : (
                    results.map((r, i) => (
                      <tr key={`${r.threat}-${i}`}>
                        <td>{r.threat}</td>
                        <td>{r.category}</td>

                        {/* ✅ STRIDE COLUMN */}
                        <td>
                          <span className={`stride-pill ${r.stride?.toLowerCase().replaceAll(" ", "-")}`}>
                            {r.stride}
                          </span>
                        </td>

                        <td>
                          <span className={`risk-pill ${r.risk_level?.toLowerCase()}`}>
                          {r.risk_level}
                          </span>
                        </td>

                        <td>{r.risk_score}</td>
                        <td>{r.mitigation}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel risk-panel">
            <div className="panel-head"><h2>Risk Visualization</h2></div>
            <RiskChart data={chartData} />
            <div className="bars">
              <div className="bar-row"><span>HIGH ({high})</span><span className="bar high" style={{ width: `${Math.max(12, high * 26)}%` }} /></div>
              <div className="bar-row"><span>MEDIUM ({medium})</span><span className="bar medium" style={{ width: `${Math.max(12, medium * 26)}%` }} /></div>
              <div className="bar-row"><span>LOW ({low})</span><span className="bar low" style={{ width: `${Math.max(12, low * 26)}%` }} /></div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}