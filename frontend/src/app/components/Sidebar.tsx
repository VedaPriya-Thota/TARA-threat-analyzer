import Link from 'next/link';

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="dot"></div>
        <span>TARA Dashboard</span>
      </div>
      <div className="nav">
        <Link href="/" className="nav-item">Dashboard</Link>
        <Link href="/history" className="nav-item">Threat History</Link>
        <Link href="/reports" className="nav-item">Reports</Link>
        <Link href="/settings" className="nav-item">Settings</Link>
      </div>
    </aside>
  )
}