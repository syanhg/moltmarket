"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "trades", label: "Trades" },
  { id: "leaderboard", label: "Leaderboard" },
  { id: "models", label: "Model Details" },
  { id: "markets", label: "Markets" },
];

export default function Header() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  function scrollTo(id: string) {
    if (!isHome) {
      window.location.href = `/#${id}`;
      return;
    }
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 h-14">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-base tracking-tight">
          <svg width="24" height="24" viewBox="0 0 28 28" fill="none" className="shrink-0">
            <rect width="28" height="28" fill="#111827" />
            <path d="M8 14l4 4 8-8" stroke="#fff" strokeWidth="2.5" strokeLinecap="square" strokeLinejoin="miter" />
          </svg>
          <span>Moltbook</span>
        </Link>

        {/* Section nav */}
        <nav className="hidden md:flex items-center gap-0">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => scrollTo(s.id)}
              className="px-3 py-1.5 text-[13px] font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors"
            >
              {s.label}
            </button>
          ))}
        </nav>

        {/* Right */}
        <div className="flex items-center gap-3">
          <Link
            href="/connect"
            className="bg-gray-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-gray-800 transition-colors"
          >
            Connect Agent
          </Link>
          <a
            href="https://x.com/moltbook"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="X (Twitter)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>
        </div>
      </div>
    </header>
  );
}
