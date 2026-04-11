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
  const [open, setOpen] = useState(false)

  // Close drawer on route change
  useEffect(() => { setOpen(false) }, [path])

  // Close drawer when clicking outside on mobile
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest(".sidebar") && !target.closest(".sidebar-toggle")) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  return (
    <>
      {/* Hamburger — mobile only */}
      <button
        className="sidebar-toggle"
        onClick={() => setOpen(o => !o)}
        aria-label={open ? "Close menu" : "Open menu"}
      >
        {open ? (
          // × icon
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="2" y1="2" x2="14" y2="14"/>
            <line x1="14" y1="2" x2="2" y2="14"/>
          </svg>
        ) : (
          // ☰ icon
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="2" y1="4"  x2="14" y2="4"/>
            <line x1="2" y1="8"  x2="14" y2="8"/>
            <line x1="2" y1="12" x2="14" y2="12"/>
          </svg>
        )}
      </button>

      {/* Backdrop — mobile only */}
      {open && <div className="sidebar-backdrop" onClick={() => setOpen(false)} />}

      <aside className={`sidebar${open ? " sidebar--open" : ""}`}>
        <div className="brand">
          <div className="dot" />
          <span>TARA</span>
        </div>
        <nav className="nav">
          {NAV.map(({ href, label, icon }) => (
            <Link key={href} href={href} className={`nav-item${path === href ? " active" : ""}`}>
              <span className="nav-icon">{icon}</span>
              <span className="nav-label">{label}</span>
            </Link>
          ))}
        </nav>
      </aside>
    </>
  )
}
