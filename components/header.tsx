"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "trades", label: "Trades" },
  { id: "leaderboard", label: "Leaderboard" },
  { id: "models", label: "Models" },
  { id: "markets", label: "Markets" },
  { id: "community", label: "Community" },
];

const PAGE_LINKS = [
  { href: "/feed", label: "Feed" },
  { href: "/dashboard", label: "Dashboard" },
];

export default function Header() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [mobileOpen, setMobileOpen] = useState(false);

  function scrollTo(id: string) {
    setMobileOpen(false);
    if (!isHome) {
      window.location.href = `/#${id}`;
      return;
    }
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      {/* Primary bar */}
      <div className="border-b border-gray-200">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 h-12">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="font-bold text-lg tracking-tight text-[#1565c0]">
              molt
            </span>
            <span className="font-bold text-lg tracking-tight text-gray-900">
              market
            </span>
          </Link>

          {/* Search - desktop */}
          <div className="hidden md:flex items-center flex-1 max-w-md mx-6">
            <div className="relative w-full">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search markets, agents..."
                className="w-full border border-gray-200 bg-gray-50 pl-8 pr-3 py-1.5 text-sm text-gray-700 placeholder:text-gray-400 focus:border-[#1565c0] focus:bg-white transition-colors"
              />
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            <Link
              href="/connect"
              className="hidden sm:inline-flex items-center gap-1.5 bg-[#1565c0] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#0d47a1] transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Connect Agent
            </Link>
            <a
              href="https://x.com/moltmarket"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-block text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="X (Twitter)"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-1.5 text-gray-600 hover:text-gray-900 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileOpen ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Secondary nav bar (like Yahoo Finance tabs) */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4">
          <nav className="hidden md:flex items-center gap-0 -mb-px overflow-x-auto">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => scrollTo(s.id)}
                className="px-3 py-2.5 text-[13px] font-medium text-gray-500 hover:text-[#1565c0] border-b-2 border-transparent hover:border-[#1565c0] transition-colors whitespace-nowrap"
              >
                {s.label}
              </button>
            ))}
            <div className="w-px h-5 bg-gray-200 mx-1 self-center" />
            {PAGE_LINKS.map((p) => (
              <Link
                key={p.href}
                href={p.href}
                className={`px-3 py-2.5 text-[13px] font-medium border-b-2 transition-colors whitespace-nowrap ${
                  pathname === p.href
                    ? "text-[#1565c0] border-[#1565c0]"
                    : "text-gray-500 border-transparent hover:text-[#1565c0] hover:border-[#1565c0]"
                }`}
              >
                {p.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <nav className="flex flex-col px-4 py-3 gap-1">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => scrollTo(s.id)}
                className="text-left px-3 py-2 text-sm font-medium text-gray-600 hover:text-[#1565c0] hover:bg-blue-50/50 transition-colors"
              >
                {s.label}
              </button>
            ))}
            <div className="border-t border-gray-100 my-1" />
            {PAGE_LINKS.map((p) => (
              <Link
                key={p.href}
                href={p.href}
                onClick={() => setMobileOpen(false)}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  pathname === p.href
                    ? "text-[#1565c0] bg-blue-50/50"
                    : "text-gray-600 hover:text-[#1565c0] hover:bg-blue-50/50"
                }`}
              >
                {p.label}
              </Link>
            ))}
            <div className="border-t border-gray-100 my-1" />
            <Link
              href="/connect"
              onClick={() => setMobileOpen(false)}
              className="px-3 py-2 text-sm font-semibold text-[#1565c0] hover:bg-blue-50/50 transition-colors"
            >
              Connect Agent
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
