"use client"

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar.tsx — Main navigation sidebar
// Redesigned with SVG icons, animated active indicators, tooltips when
// collapsed, version badge, and smoother transitions.
// ─────────────────────────────────────────────────────────────────────────────

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"

/* ── SVG icon set ── */
const Icons = {
  dashboard: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  history: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  reports: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="12" y2="17"/>
    </svg>
  ),
  settings: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  shield: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  chevronLeft: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9,2 4,7 9,12"/>
    </svg>
  ),
}

const NAV = [
  { href: "/dashboard", label: "Dashboard",      icon: Icons.dashboard, color: "#38bdf8" },
  { href: "/history",   label: "Threat History", icon: Icons.history,   color: "#a78bfa" },
  { href: "/reports",   label: "Reports",         icon: Icons.reports,   color: "#34d399" },
  { href: "/settings",  label: "Settings",        icon: Icons.settings,  color: "#f59e0b" },
]

export default function Sidebar() {
  const path = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => { setMobileOpen(false) }, [path])

  useEffect(() => {
    if (!mobileOpen) return
    const handler = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (!t.closest(".sidebar") && !t.closest(".sidebar-toggle")) setMobileOpen(false)
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
            <line x1="2" y1="2" x2="14" y2="14"/><line x1="14" y1="2" x2="2" y2="14"/>
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="2" y1="4"  x2="14" y2="4"/>
            <line x1="2" y1="8"  x2="14" y2="8"/>
            <line x1="2" y1="12" x2="14" y2="12"/>
          </svg>
        )}
      </button>

      {mobileOpen && <div className="sidebar-backdrop" onClick={() => setMobileOpen(false)} />}

      <aside className={`sidebar${mobileOpen ? " sidebar--open" : ""}${collapsed ? " sidebar--collapsed" : ""}`}>

        {/* Brand */}
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            {Icons.shield}
          </div>
          <div className="sidebar-brand-text">
            <span className="sidebar-brand-name">TARA</span>
            <span className="sidebar-brand-sub">Threat Analyzer</span>
          </div>
        </div>

        {/* Divider */}
        <div className="sidebar-divider" />

        {/* Nav section label */}
        {!collapsed && <span className="sidebar-section-label">Navigation</span>}

        {/* Nav links */}
        <nav className="nav">
          {NAV.map(({ href, label, icon, color }) => {
            const active = path === href
            return (
              <Link
                key={href}
                href={href}
                className={`nav-item${active ? " active" : ""}`}
                title={collapsed ? label : undefined}
                style={{ "--nav-accent": color } as React.CSSProperties}
              >
                {/* Active left bar */}
                {active && <span className="nav-active-bar" style={{ background: color }} />}

                {/* Icon wrapper */}
                <span className="nav-icon" style={{ color: active ? color : undefined }}>
                  {icon}
                </span>

                {/* Label */}
                <span className="nav-label">{label}</span>

                {/* Active dot on collapsed mode */}
                {active && collapsed && (
                  <span className="nav-collapsed-dot" style={{ background: color }} />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Divider */}
        <div className="sidebar-divider" />

        {/* Version badge */}
        {!collapsed && (
          <div className="sidebar-version">
            <span className="sidebar-version-dot" />
            <span className="sidebar-version-text">v1.0 · TARA</span>
          </div>
        )}

        {/* Collapse toggle — desktop only */}
        <button
          className="sidebar-collapse-btn"
          onClick={() => setCollapsed(c => !c)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand" : "Collapse"}
        >
          <span style={{ display: "inline-flex", transform: collapsed ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.25s" }}>
            {Icons.chevronLeft}
          </span>
          {!collapsed && <span style={{ fontSize: ".72rem", fontWeight: 600, marginLeft: 6 }}>Collapse</span>}
        </button>
      </aside>
    </>
  )
}
