// ─────────────────────────────────────────────────────────────────────────────
// layout.tsx — Root layout for the entire Next.js application
//
// This file wraps every page in TARA with a shared HTML shell.
// Responsibilities:
//   - Loads and applies the Geist Sans and Geist Mono Google Fonts via
//     CSS variables (--font-geist-sans, --font-geist-mono)
//   - Sets the default page <title> and <meta description> via Next.js Metadata
//   - Renders the <html> and <body> tags that all pages share
//   - The {children} slot is where each individual page (dashboard, reports,
//     history, settings, landing) gets rendered
// ─────────────────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// Load Geist Sans — used as the primary body/UI font
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Load Geist Mono — used for code/monospace elements (e.g. risk scores)
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Default metadata shown in the browser tab and search engines
export const metadata: Metadata = {
  title: "TARA — Threat Analysis & Risk Assessment",
  description: "AI-powered threat modeling using STRIDE and LLM analysis",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* Apply font variables and antialiasing to the entire app */}
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
