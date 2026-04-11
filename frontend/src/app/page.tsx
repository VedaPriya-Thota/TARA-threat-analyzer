"use client"

import { useRouter } from "next/navigation"

export default function Home() {

  const router = useRouter()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-8 text-white bg-gradient-to-br from-[#020617] via-[#0f172a] to-[#020617] relative overflow-hidden">

      {/* background glow */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/20 blur-[120px]"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-green-500/20 blur-[120px]"></div>

      <h1 className="text-5xl font-bold mb-6 text-center bg-gradient-to-r from-cyan-400 to-green-400 bg-clip-text text-transparent">
        TARA Threat Analyzer
      </h1>

      <p className="max-w-3xl text-lg text-gray-300 text-center mb-12">
        TARA (Threat Analysis and Risk Assessment) is an AI-powered cybersecurity
        assistant that analyzes system architectures and identifies potential
        threats before they become real vulnerabilities.
      </p>

      <div className="grid md:grid-cols-3 gap-8 max-w-6xl">

        {/* Card 1 */}
        <div className="p-[1px] rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500">
          <div className="bg-slate-900/80 backdrop-blur-lg rounded-2xl p-8 h-full">
            <h3 className="text-xl font-semibold mb-3 text-cyan-400">
              Threat Detection
            </h3>
            <p className="text-gray-400">
              Automatically identify vulnerabilities like SQL Injection,
              Authentication attacks, API abuse and more.
            </p>
          </div>
        </div>

        {/* Card 2 */}
        <div className="p-[1px] rounded-2xl bg-gradient-to-r from-green-400 to-cyan-400">
          <div className="bg-slate-900/80 backdrop-blur-lg rounded-2xl p-8 h-full">
            <h3 className="text-xl font-semibold mb-3 text-green-400">
              Risk Scoring
            </h3>
            <p className="text-gray-400">
              AI calculates risk levels and prioritizes threats based on
              severity and exploitability.
            </p>
          </div>
        </div>

        {/* Card 3 */}
        <div className="p-[1px] rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500">
          <div className="bg-slate-900/80 backdrop-blur-lg rounded-2xl p-8 h-full">
            <h3 className="text-xl font-semibold mb-3 text-purple-400">
              Mitigation Guidance
            </h3>
            <p className="text-gray-400">
              Get recommended mitigation strategies to secure your system
              architecture.
            </p>
          </div>
        </div>

      </div>

      <button
        onClick={() => router.push("/dashboard")}
        className="mt-14 px-10 py-4 rounded-xl bg-gradient-to-r from-green-400 to-emerald-500 font-semibold text-lg hover:scale-105 transition shadow-[0_0_25px_rgba(34,197,94,0.6)]"
      >
        Try TARA Analyzer
      </button>

    </div>
  )
}