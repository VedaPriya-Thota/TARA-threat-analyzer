"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"

const NAV = [
  { href: "/dashboard", label: "Dashboard",      icon: "🛡️" },
  { href: "/history",   label: "Threat History", icon: "📜" },
  { href: "/reports",   label: "Reports",         icon: "📊" },
  { href: "/settings",  label: "Settings",        icon: "⚙️" },
]

export default function Sidebar() {
  const path = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  // Close mobile drawer on route change
  useEffect(() => { setMobileOpen(false) }, [path])

  // Close mobile drawer when clicking outside
  useEffect(() => {
    if (!mobileOpen) return
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest(".sidebar") && !target.closest(".sidebar-toggle")) {
        setMobileOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [mobileOpen])

  return (
    <>
      {/* Hamburger — mobile only */}
      <button
        className="sidebar-toggle"
        onClick={() => setMobileOpen(o => !o)}
        aria-label={mobileOpen ? "Close menu" : "Open menu"}
      >
        {mobileOpen ? (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="2" y1="2" x2="14" y2="14"/>
            <line x1="14" y1="2" x2="2" y2="14"/>
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="2" y1="4"  x2="14" y2="4"/>
            <line x1="2" y1="8"  x2="14" y2="8"/>
            <line x1="2" y1="12" x2="14" y2="12"/>
          </svg>
        )}
      </button>

      {/* Backdrop — mobile only */}
      {mobileOpen && <div className="sidebar-backdrop" onClick={() => setMobileOpen(false)} />}

      <aside className={`sidebar${mobileOpen ? " sidebar--open" : ""}${collapsed ? " sidebar--collapsed" : ""}`}>
        {/* Desktop collapse toggle */}
        <button
          className="sidebar-collapse-btn"
          onClick={() => setCollapsed(c => !c)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg
            width="14" height="14" viewBox="0 0 14 14" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: collapsed ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.25s" }}
          >
            <polyline points="9,2 4,7 9,12" />
          </svg>
        </button>

        <div className="brand">
          <div className="dot" />
          <span className="brand-label">TARA</span>
        </div>
        <nav className="nav">
          {NAV.map(({ href, label, icon }) => (
            <Link key={href} href={href} className={`nav-item${path === href ? " active" : ""}`} title={collapsed ? label : undefined}>
              <span className="nav-icon">{icon}</span>
              <span className="nav-label">{label}</span>
            </Link>
          ))}
        </nav>
      </aside>
    </>
  )
}
