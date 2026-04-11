"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
  LabelList,
} from "recharts"

const BAR_COLORS: Record<string, { fill: string; glow: string; dim: string }> = {
  Critical: { fill: "#ef4444", glow: "rgba(239,68,68,.25)",  dim: "rgba(239,68,68,.12)" },
  High:     { fill: "#f97316", glow: "rgba(249,115,22,.25)", dim: "rgba(249,115,22,.12)" },
  Medium:   { fill: "#f59e0b", glow: "rgba(245,158,11,.25)", dim: "rgba(245,158,11,.12)" },
  Low:      { fill: "#38bdf8", glow: "rgba(56,189,248,.25)", dim: "rgba(56,189,248,.12)" },
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  const meta = BAR_COLORS[label]
  const count = payload[0].value
  return (
    <div style={{
      background: "rgba(7,11,22,.97)",
      border: `1px solid ${meta?.fill ?? "#334155"}44`,
      borderRadius: 10,
      padding: "10px 16px",
      fontSize: ".78rem",
      color: "#e2e8f0",
      boxShadow: `0 8px 32px rgba(0,0,0,.5), 0 0 0 1px rgba(255,255,255,.03)`,
      backdropFilter: "blur(8px)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span style={{
          display: "inline-block", width: 8, height: 8, borderRadius: "50%",
          background: meta?.fill ?? "#94a3b8",
          boxShadow: `0 0 6px ${meta?.fill}`,
        }} />
        <span style={{ color: meta?.fill ?? "#94a3b8", fontWeight: 700, fontSize: ".82rem" }}>{label}</span>
      </div>
      <div style={{ color: "#94a3b8" }}>
        <span style={{ color: "#e2e8f0", fontWeight: 700 }}>{count}</span>{" "}
        {count === 1 ? "threat" : "threats"}
      </div>
    </div>
  )
}

const CustomLabel = ({ x, y, width, value, name }: any) => {
  if (!value) return null
  const meta = BAR_COLORS[name]
  return (
    <text
      x={x + width / 2}
      y={y - 6}
      textAnchor="middle"
      fontSize={11}
      fontWeight={700}
      fill={meta?.fill ?? "#94a3b8"}
    >
      {value}
    </text>
  )
}

export default function RiskChart({ data }: any) {
  const hasData = data?.some((d: any) => d.value > 0)

  return (
    <div className="risk-chart-wrapper">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart
          data={data}
          margin={{ top: 20, right: 8, left: -18, bottom: 4 }}
          barCategoryGap="35%"
        >
          <CartesianGrid
            vertical={false}
            stroke="rgba(255,255,255,.04)"
            strokeDasharray="3 0"
          />
          <XAxis
            dataKey="name"
            stroke="transparent"
            tick={{ fill: "#475569", fontSize: 11, fontWeight: 600 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="transparent"
            tick={{ fill: "#334155", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            width={24}
          />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,.025)", radius: 4 }}
            content={<CustomTooltip />}
          />
          <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={44}>
            <LabelList content={<CustomLabel />} />
            {data?.map((entry: any, i: number) => {
              const meta = BAR_COLORS[entry.name]
              return (
                <Cell
                  key={i}
                  fill={entry.value === 0 ? (meta?.dim ?? "#1e293b") : (meta?.fill ?? "#64748b")}
                  opacity={entry.value === 0 ? 0.5 : 1}
                  style={entry.value > 0 ? { filter: `drop-shadow(0 2px 6px ${meta?.glow})` } : undefined}
                />
              )
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="chart-legend">
        {data?.map((entry: any) => {
          const meta = BAR_COLORS[entry.name]
          return (
            <div key={entry.name} className="chart-legend-item" style={{ opacity: entry.value === 0 ? 0.35 : 1 }}>
              <span className="chart-legend-dot" style={{ background: meta?.fill, boxShadow: entry.value > 0 ? `0 0 5px ${meta?.fill}` : "none" }} />
              <span className="chart-legend-name">{entry.name}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
