"use client"

import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"

/* ── Typing effect ── */
function useTyping(words: string[], speed = 65, pause = 2000) {
  const [display, setDisplay] = useState("")
  const [wIdx, setWIdx]       = useState(0)
  const [cIdx, setCIdx]       = useState(0)
  const [del,  setDel]        = useState(false)

  useEffect(() => {
    const word  = words[wIdx]
    const delay = del ? speed / 2.2 : cIdx === word.length ? pause : speed
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

  return { display, isDeleting: del }
}

/* ── Lightweight canvas particle field ── */
function ParticleCanvas() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx    = canvas.getContext("2d")
    if (!ctx)    return

    let raf: number
    const W = canvas.offsetWidth
    const H = canvas.offsetHeight
    canvas.width  = W
    canvas.height = H

    type Pt = { x: number; y: number; r: number; vx: number; vy: number; o: number; vo: number }
    const count = Math.min(55, Math.floor((W * H) / 14000))
    const pts: Pt[] = Array.from({ length: count }, () => ({
      x:  Math.random() * W,
      y:  Math.random() * H,
      r:  0.6 + Math.random() * 1.2,
      vx: (Math.random() - .5) * 0.18,
      vy: (Math.random() - .5) * 0.15,
      o:  0.12 + Math.random() * 0.3,
      vo: (Math.random() - .5) * 0.003,
    }))

    const draw = () => {
      ctx.clearRect(0, 0, W, H)
      pts.forEach(p => {
        p.x  += p.vx; if (p.x < 0) p.x = W; if (p.x > W) p.x = 0
        p.y  += p.vy; if (p.y < 0) p.y = H; if (p.y > H) p.y = 0
        p.o  += p.vo
        if (p.o < 0.06 || p.o > 0.42) p.vo *= -1
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(34,211,238,${p.o.toFixed(2)})`
        ctx.fill()
      })

      // draw faint connecting lines for nearby particles
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x
          const dy = pts[i].y - pts[j].y
          const d  = Math.sqrt(dx * dx + dy * dy)
          if (d < 110) {
            ctx.beginPath()
            ctx.moveTo(pts[i].x, pts[i].y)
            ctx.lineTo(pts[j].x, pts[j].y)
            ctx.strokeStyle = `rgba(34,211,238,${((1 - d / 110) * 0.06).toFixed(3)})`
            ctx.lineWidth   = 0.6
            ctx.stroke()
          }
        }
      }
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <canvas
      ref={ref}
      style={{
        position: "absolute", inset: 0,
        width: "100%", height: "100%",
        pointerEvents: "none", opacity: .55,
      }}
    />
  )
}

const FEATURES = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <circle cx="12" cy="16" r=".6" fill="currentColor"/>
      </svg>
    ),
    accent:     "#22d3ee",
    accentRgb:  "34,211,238",
    iconBg:     "rgba(34,211,238,.08)",
    iconBorder: "rgba(34,211,238,.18)",
    gradBorder: "linear-gradient(135deg,#0e7490,#0284c7)",
    title: "Threat Detection",
    body:  "Automatically surface SQL injection, auth bypass, API abuse, and privilege escalation — mapped to attack vectors before adversaries exploit them.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
    accent:     "#4ade80",
    accentRgb:  "74,222,128",
    iconBg:     "rgba(74,222,128,.08)",
    iconBorder: "rgba(74,222,128,.18)",
    gradBorder: "linear-gradient(135deg,#166534,#0e7490)",
    title: "AI Risk Scoring",
    body:  "LLM-powered analysis calculates risk scores and prioritises threats by severity, exploitability, and blast radius — so you fix what matters first.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/>
      </svg>
    ),
    accent:     "#a78bfa",
    accentRgb:  "167,139,250",
    iconBg:     "rgba(167,139,250,.08)",
    iconBorder: "rgba(167,139,250,.18)",
    gradBorder: "linear-gradient(135deg,#4c1d95,#be185d)",
    title: "STRIDE Classification",
    body:  "Every threat is mapped to the STRIDE framework with targeted mitigations — giving your team a structured, actionable security report.",
  },
]

const SCAN_WORDS = ["REST APIs", "cloud infrastructure", "IoT firmware", "microservices", "auth layers", "database schemas"]

/* ── Feature card (isolated so hover state is per-card) ── */
function FeatureCard({ f, delay }: { f: typeof FEATURES[number]; delay: number }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      className="lp-feat-card"
      style={{ animationDelay: `${delay}s` }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* gradient border via box-shadow inset + pseudo — simulated with wrapper */}
      <div
        className="lp-feat-inner"
        style={{
          borderColor: hovered ? `rgba(${f.accentRgb},.35)` : "rgba(255,255,255,.06)",
          boxShadow: hovered
            ? `0 0 0 1px rgba(${f.accentRgb},.15), 0 16px 40px rgba(0,0,0,.4), 0 0 32px rgba(${f.accentRgb},.06)`
            : "0 2px 12px rgba(0,0,0,.25)",
          transform: hovered ? "translateY(-5px)" : "translateY(0)",
        }}
      >
        {/* top accent line */}
        <div
          className="lp-feat-top-line"
          style={{
            background: f.gradBorder,
            opacity: hovered ? 1 : 0,
          }}
        />

        {/* Icon ring */}
        <div
          className="lp-feat-icon"
          style={{
            color: f.accent,
            background: f.iconBg,
            border: `1px solid ${f.iconBorder}`,
            boxShadow: hovered ? `0 0 20px rgba(${f.accentRgb},.22)` : "none",
            transform: hovered ? "scale(1.08)" : "scale(1)",
          }}
        >
          {f.icon}
        </div>

        <h3 className="lp-feat-title" style={{ color: f.accent }}>{f.title}</h3>
        <p className="lp-feat-body">{f.body}</p>

        {/* Arrow reveal on hover */}
        <div className="lp-feat-arrow" style={{ opacity: hovered ? .7 : 0, transform: hovered ? "translateX(0)" : "translateX(-6px)", color: f.accent }}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="2" y1="8" x2="14" y2="8"/><polyline points="9,3 14,8 9,13"/>
          </svg>
          <span style={{ fontSize: ".72rem", fontWeight: 700 }}>Learn more</span>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const router = useRouter()
  const { display: typing } = useTyping(SCAN_WORDS)
  const [ctaHovered, setCtaHovered] = useState(false)

  return (
    <div className="lp-root" style={{ background: "radial-gradient(ellipse at 60% 0%, #0f172a 0%, #020617 55%)" }}>

      {/* ── Background layer ── */}
      <div className="lp-bg-layer" aria-hidden>
        {/* Particle canvas */}
        <ParticleCanvas />

        {/* Drifting dot grid */}
        <div className="lp-grid-drift" />

        {/* Two slow ambient glows */}
        <div className="lp-ambient lp-ambient--tl" />
        <div className="lp-ambient lp-ambient--br" />
        <div className="lp-ambient lp-ambient--mid" />

        {/* Scan line */}
        <div className="lp-scanline" />
      </div>

      {/* ── Nav ── */}
      <header className="lp-nav-bar">
        <div className="lp-nav-brand">
          <span className="lp-nav-dot" />
          <span className="lp-nav-name">TARA</span>
          <span className="lp-nav-badge">v2.0</span>
        </div>
      </header>

      {/* ── Hero ── */}
      <main className="lp-hero-section">

        {/* Eyebrow */}
        <div className="lp-eyebrow">
          <span className="lp-eyebrow-dot" />
          AI-Powered Threat Analysis &amp; Risk Assessment
        </div>

        {/* Headline */}
        <h1 className="lp-headline">
          <span className="lp-headline-line1">Detect Threats Before</span>
          <br />
          <span className="lp-headline-accent">Attackers Do</span>
        </h1>

        {/* Sub-line */}
        <p className="lp-subline">
          TARA ingests your system architecture and uses large language models to surface
          attack vectors, STRIDE classifications, and prioritised mitigations — in seconds.
        </p>

        {/* Scanning indicator */}
        <div className="lp-scan-strip">
          <span className="lp-scan-label">Scanning</span>
          <span className="lp-scan-sep">›</span>
          <span className="lp-scan-target">
            {typing || "\u00A0"}
            <span className="lp-cursor" />
          </span>
        </div>

        {/* Primary CTA */}
        <button
          className={`lp-cta-btn${ctaHovered ? " lp-cta-btn--hovered" : ""}`}
          onClick={() => router.push("/dashboard")}
          onMouseEnter={() => setCtaHovered(true)}
          onMouseLeave={() => setCtaHovered(false)}
        >
          {/* Sheen sweep */}
          <span className="lp-cta-sheen" />
          {/* Glow ring (behind button) */}
          <span className="lp-cta-glow-ring" style={{ opacity: ctaHovered ? 1 : 0 }} />
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, position: "relative", zIndex: 1 }}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          <span style={{ position: "relative", zIndex: 1 }}>Launch Threat Analyzer</span>
        </button>

        <p className="lp-cta-caption">No setup required · LLaMA 3.3-70B powered · STRIDE aligned</p>

      </main>

      {/* ── Feature cards ── */}
      <section className="lp-cards-grid">
        {FEATURES.map((f, i) => (
          <FeatureCard key={f.title} f={f} delay={0.55 + i * 0.12} />
        ))}
      </section>

      {/* ── Bottom strip ── */}
      <div className="lp-bottom">
        <p className="lp-bottom-text">Ready to secure your architecture?</p>
      </div>

    </div>
  )
}
