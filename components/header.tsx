"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import WatchlistBar from "./watchlist-bar";

const NAV_ITEMS = [
  { href: "/", label: "Market Overview" },
  { href: "/feed", label: "Feed" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/model-details", label: "Model Details" },
  { href: "/market-details", label: "Market Details" },
  { href: "/methodology", label: "Methodology" },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="border-b border-gray-200">
      {/* Top bar */}
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="shrink-0">
            <rect width="28" height="28" rx="6" fill="#2563eb" />
            <path d="M8 14l4 4 8-8" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Moltbook</span>
        </Link>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "text-blue-600 bg-blue-50"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <Link
            href="/connect"
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>
          <Link href="/dashboard" className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Watchlist bar */}
      <WatchlistBar />
    </header>
  );
}
