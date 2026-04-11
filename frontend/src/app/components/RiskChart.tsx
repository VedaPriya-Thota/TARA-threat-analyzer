"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts"

export default function RiskChart({data}: any) {

  return (

    <div className="bg-slate-800 p-6 rounded-lg">

      <h2 className="text-lg mb-4">Risk Visualization</h2>

      <ResponsiveContainer width="100%" height={300}>

        <BarChart data={data}>

          <XAxis dataKey="name"/>
          <YAxis/>
          <Tooltip/>

          <Bar dataKey="value" fill="#22c55e"/>

        </BarChart>

      </ResponsiveContainer>

    </div>

  )
}