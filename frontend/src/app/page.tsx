"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

/* ── Typing effect ── */
function useTyping(words: string[], speed = 60, pause = 1800) {
  const [display, setDisplay] = useState("")
  const [wIdx, setWIdx] = useState(0)
  const [cIdx, setCIdx] = useState(0)
  const [del, setDel] = useState(false)

  useEffect(() => {
    const word = words[wIdx]
    const delay = del ? speed / 2 : cIdx === word.length ? pause : speed
    const t = setTimeout(() => {
      if (!del && cIdx < word.length) {
        setDisplay(word.slice(0, cIdx + 1)); setCIdx(c => c + 1)
      } else if (!del && cIdx === word.length) {
        setDel(true)
      } else if (del && cIdx > 0) {
        setDisplay(word.slice(0, cIdx - 1)); setCIdx(c => c - 1)
      } else {
        setDel(false); setWIdx(i => (i + 1) % words.length)
      }
    }, delay)
    return () => clearTimeout(t)
  }, [cIdx, del, wIdx, words, speed, pause])

  return display
}

const FEATURES = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <circle cx="12" cy="16" r=".6" fill="currentColor"/>
      </svg>
    ),
    color: "text-cyan-400",
    iconBg: "bg-cyan-500/10 border border-cyan-500/20",
    gradBorder: "bg-gradient-to-r from-cyan-500 to-blue-500",
    title: "Threat Detection",
    body: "Automatically surface SQL injection, auth bypass, API abuse, and privilege escalation — mapped to attack vectors before adversaries exploit them.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
    color: "text-green-400",
    iconBg: "bg-green-500/10 border border-green-500/20",
    gradBorder: "bg-gradient-to-r from-green-400 to-cyan-400",
    title: "AI Risk Scoring",
    body: "LLM-powered analysis calculates risk scores and prioritizes threats by severity, exploitability, and blast radius — so you fix what matters first.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/>
      </svg>
    ),
    color: "text-purple-400",
    iconBg: "bg-purple-500/10 border border-purple-500/20",
    gradBorder: "bg-gradient-to-r from-purple-500 to-pink-500",
    title: "STRIDE Classification",
    body: "Every threat is mapped to the STRIDE framework with targeted mitigations — giving your team a structured, actionable security report.",
  },
]

const SCAN_WORDS = ["REST APIs", "cloud infrastructure", "IoT firmware", "microservices", "auth layers", "database schemas"]

export default function Home() {
  const router = useRouter()
  const typing = useTyping(SCAN_WORDS)

  return (
    <div
      className="min-h-screen flex flex-col items-center text-white relative overflow-hidden"
      style={{ background: "radial-gradient(ellipse at 60% 0%, #0f172a 0%, #020617 55%)" }}
    >

      {/* Ambient glows */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(34,211,238,.07) 0%, transparent 70%)", filter: "blur(60px)" }} />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(74,222,128,.06) 0%, transparent 70%)", filter: "blur(60px)" }} />

      {/* Subtle dot grid */}
      <div className="absolute inset-0 pointer-events-none opacity-30"
        style={{ backgroundImage: "radial-gradient(circle, rgba(148,163,184,.12) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />

      {/* Nav */}
      <header className="relative z-10 w-full max-w-5xl flex items-center px-8 py-6">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400" style={{ boxShadow: "0 0 8px #22d3ee" }} />
          <span className="font-bold text-sm tracking-widest text-slate-200">TARA</span>
          <span className="text-xs font-semibold text-slate-600 bg-slate-800/60 border border-slate-700/50 rounded-full px-2 py-0.5">v2.0</span>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex flex-col items-center text-center px-6 pt-12 pb-16 max-w-3xl w-full">

        {/* Eyebrow pill */}
        <div className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-cyan-400 bg-cyan-500/8 border border-cyan-500/20 rounded-full px-4 py-2 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" style={{ boxShadow: "0 0 6px #22d3ee" }} />
          AI-Powered Threat Analysis &amp; Risk Assessment
        </div>

        <h1 className="text-5xl md:text-6xl font-black leading-[1.08] tracking-tight mb-6">
          Detect Threats Before
          <br />
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: "linear-gradient(135deg, #22d3ee, #4ade80)", filter: "drop-shadow(0 0 24px rgba(34,211,238,.35))" }}
          >
            Attackers Do
          </span>
        </h1>

        <p className="text-lg text-slate-400 leading-relaxed max-w-xl mb-8">
          TARA ingests your system architecture and uses large language models to surface
          attack vectors, STRIDE classifications, and prioritised mitigations — in seconds.
        </p>

        {/* Typing indicator */}
        <div className="flex items-center gap-3 mb-10 font-mono text-sm">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-600">Scanning</span>
          <span className="text-cyan-400 font-semibold min-w-[160px] text-left">
            {typing}
            <span
              className="inline-block w-0.5 h-4 bg-cyan-400 ml-0.5 align-middle rounded-sm"
              style={{ animation: "lp-cursor-blink .75s step-end infinite" }}
            />
          </span>
        </div>

        {/* Primary CTA */}
        <button
          onClick={() => router.push("/dashboard")}
          className="relative overflow-hidden flex items-center gap-3 text-white font-bold text-lg px-10 py-4 rounded-xl transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] active:scale-[.99]"
          style={{
            background: "linear-gradient(135deg, #0e7490, #059669)",
            boxShadow: "0 0 32px rgba(34,211,238,.22), 0 4px 20px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.1)",
            border: "1px solid rgba(34,211,238,.25)",
          }}
        >
          {/* shine sweep */}
          <span
            className="absolute inset-y-0 w-16 pointer-events-none"
            style={{
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,.15), transparent)",
              animation: "lp-shine 3.5s ease-in-out infinite 1s",
            }}
          />
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          Launch Threat Analyzer
        </button>

        <p className="mt-4 text-xs text-slate-600 tracking-wide">
          No setup required · LLaMA 3.3-70B powered · STRIDE aligned
        </p>

      </main>

      {/* Feature cards */}
      <section className="relative z-10 grid md:grid-cols-3 gap-6 max-w-5xl w-full px-6 pb-16">
        {FEATURES.map((f, i) => (
          <div key={f.title} className={`p-px rounded-2xl ${f.gradBorder}`}
            style={{ animation: "lp-card-in .55s ease both", animationDelay: `${i * 0.1}s`, opacity: 0, animationFillMode: "forwards" }}>
            <div className="bg-slate-900/90 backdrop-blur-sm rounded-2xl p-8 h-full flex flex-col gap-4 hover:bg-slate-900/70 transition-all duration-200 group"
              style={{ transition: "background .2s, transform .2s, box-shadow .2s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 12px 40px rgba(0,0,0,.35)" }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ""; (e.currentTarget as HTMLDivElement).style.boxShadow = "" }}>
              {/* Icon */}
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${f.color} ${f.iconBg} flex-shrink-0`}>
                {f.icon}
              </div>
              {/* Title */}
              <h3 className={`text-lg font-bold ${f.color}`}>{f.title}</h3>
              {/* Body */}
              <p className="text-slate-400 text-sm leading-relaxed flex-1">{f.body}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Bottom strip */}
      <div className="relative z-10 flex items-center justify-center py-12 px-6 w-full max-w-5xl border-t border-slate-800/60">
        <p className="text-slate-500 font-semibold text-base">Ready to secure your architecture?</p>
      </div>

    </div>
  )
}
