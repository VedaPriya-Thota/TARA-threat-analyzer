"use client"

import { useRouter } from "next/navigation"

export default function BackToHome() {
  const router = useRouter()

  return (
    <button
      onClick={() => router.push("/")}
      title="Back to landing page"
      aria-label="Back to landing page"
      style={{
        position: "fixed",
        top: 14,
        right: 18,
        zIndex: 50,
        width: 30,
        height: 30,
        borderRadius: "50%",
        background: "rgba(10,15,28,.85)",
        border: "1px solid rgba(255,255,255,.08)",
        color: "#334155",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        backdropFilter: "blur(8px)",
        transition: "border-color .15s, color .15s, box-shadow .15s, transform .12s",
        flexShrink: 0,
        animation: "lp-fade-in .4s ease both .2s",
        opacity: 0,
        animationFillMode: "forwards" as const,
      }}
      onMouseEnter={e => {
        const b = e.currentTarget
        b.style.borderColor = "rgba(56,189,248,.35)"
        b.style.color = "#38bdf8"
        b.style.boxShadow = "0 0 10px rgba(56,189,248,.18)"
        b.style.transform = "scale(1.08)"
      }}
      onMouseLeave={e => {
        const b = e.currentTarget
        b.style.borderColor = "rgba(255,255,255,.08)"
        b.style.color = "#334155"
        b.style.boxShadow = "none"
        b.style.transform = ""
      }}
    >
      {/* × icon */}
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
        <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    </button>
  )
}
