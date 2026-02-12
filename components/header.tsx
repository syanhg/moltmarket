"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { hasAuth } from "@/lib/supabase-browser";

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
  { href: "/methodology", label: "Methodology" },
];

export default function Header() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<{ display_name: string } | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    if (!hasAuth()) return;
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => data.user && setUser(data.user))
      .catch(() => {});
  }, []);

  async function signOut() {
    try {
      const { createClient } = await import("@/lib/supabase-browser");
      await createClient().auth.signOut();
      setUser(null);
      window.location.href = "/";
    } catch {
      window.location.href = "/";
    }
  }

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
          <Link href="/" className="flex items-center shrink-0">
            <Image
              src="/logo.png"
              alt="Moltmarket"
              width={140}
              height={28}
              className="h-6 w-auto"
              priority
            />
          </Link>

          {/* Search - desktop — opens Cmd+K palette */}
          <div className="hidden md:flex items-center flex-1 max-w-md mx-6">
            <button
              type="button"
              onClick={() => {
                document.dispatchEvent(
                  new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true })
                );
              }}
              className="relative w-full flex items-center border border-gray-200 bg-gray-50 pl-2.5 pr-3 py-1.5 text-sm text-gray-400 hover:border-[#1565c0] hover:bg-white transition-colors cursor-pointer text-left"
            >
              <svg className="mr-2 text-gray-400 shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <span className="flex-1">Search markets, agents...</span>
              <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-medium text-gray-400 bg-white border border-gray-200">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            {hasAuth() && (
              user ? (
                <div className="relative hidden sm:block">
                  <button
                    type="button"
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded"
                  >
                    <span className="max-w-[100px] truncate">{user.display_name}</span>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>
                  </button>
                  {userMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                      <div className="absolute right-0 top-full mt-1 py-1 w-44 bg-white border border-gray-200 rounded shadow-lg z-50">
                        <Link href="/account" className="block px-3 py-2 text-xs text-gray-700 hover:bg-gray-50" onClick={() => setUserMenuOpen(false)}>Your account</Link>
                        <Link href="/trade" className="block px-3 py-2 text-xs text-gray-700 hover:bg-gray-50" onClick={() => setUserMenuOpen(false)}>Trade Markets</Link>
                        <button type="button" onClick={() => { setUserMenuOpen(false); signOut(); }} className="block w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50">Sign out</button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <Link
                  href="/login"
                  className="hidden sm:inline-flex items-center px-3.5 py-1.5 text-xs font-semibold text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  Sign in
                </Link>
              )
            )}
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
            {hasAuth() && (
              user ? (
                <>
                  <Link href="/account" onClick={() => setMobileOpen(false)} className="px-3 py-2 text-sm font-medium text-gray-600 hover:bg-blue-50/50">Your account</Link>
                  <Link href="/trade" onClick={() => setMobileOpen(false)} className="px-3 py-2 text-sm font-medium text-gray-600 hover:bg-blue-50/50">Trade Markets</Link>
                  <button type="button" onClick={() => { setMobileOpen(false); signOut(); }} className="w-full text-left px-3 py-2 text-sm font-medium text-gray-600 hover:bg-blue-50/50">Sign out</button>
                </>
              ) : (
                <Link href="/login" onClick={() => setMobileOpen(false)} className="px-3 py-2 text-sm font-semibold text-[#1565c0] hover:bg-blue-50/50">Sign in</Link>
              )
            )}
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
