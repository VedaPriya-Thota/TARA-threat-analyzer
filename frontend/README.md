# TARA Frontend

Next.js 16 frontend for the TARA Threat Analyzer.

## Stack

| Package | Version | Purpose |
|---|---|---|
| Next.js | 16.1.6 | React framework (App Router, `"use client"`) |
| React | 19.2.3 | UI library |
| TypeScript | 5 | Type safety |
| Tailwind CSS | 4 | Utility-first styling (PostCSS plugin) |
| Recharts | 3.8.0 | Risk distribution bar chart |
| axios | 1.13.6 | API calls to FastAPI backend |
| lucide-react | 0.577.0 | Icon set |
| jsPDF | 4.2.0 | PDF generation |
| html2canvas | 1.4.1 | DOM-to-canvas for PDF export |

## Setup

```bash
npm install
npm run dev       # development — http://localhost:3000
npm run build     # production build
npm run start     # serve production build
```

## Pages

| Route | File | Description |
|---|---|---|
| `/` | `app/page.tsx` | Landing page |
| `/dashboard` | `app/dashboard/page.tsx` | Main threat analysis UI |
| `/history` | `app/history/page.tsx` | All past analyses |
| `/reports` | `app/reports/page.tsx` | Aggregated report + chart |
| `/settings` | `app/settings/page.tsx` | Config and system status |

## Key Components

| Component | Description |
|---|---|
| `Sidebar.tsx` | Navigation sidebar with mobile hamburger toggle |
| `BackToHome.tsx` | Fixed × button returning to landing page |
| `RiskChart.tsx` | Recharts bar chart with glow and labels |
| `TabContext.tsx` | React context for open/closable workspace tabs |
| `WorkspaceShell.tsx` | Wraps app routes, renders TabBar |

## Environment

The frontend calls the backend at `http://localhost:8000` (hardcoded in page files). Change the base URL there if your backend runs on a different host or port.

## Styling

All custom CSS lives in `src/app/globals.css` — sidebar, dashboard panels, badges, animations, and responsive breakpoints. Tailwind utility classes handle layout and typography on the landing and settings pages.
