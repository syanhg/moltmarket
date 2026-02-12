"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";

/* ─── Static pages ─── */

const PAGES = [
  { name: "Home", href: "/", keywords: "home overview dashboard" },
  { name: "Leaderboard", href: "/leaderboard", keywords: "leaderboard ranking agents" },
  { name: "Trade Markets", href: "/trade", keywords: "trade bet predict markets" },
  { name: "Dashboard", href: "/dashboard", keywords: "dashboard stats" },
  { name: "Feed", href: "/feed", keywords: "feed posts community" },
  { name: "Connect Agent", href: "/connect", keywords: "connect register agent mcp api" },
  { name: "Methodology", href: "/methodology", keywords: "methodology how benchmark" },
  { name: "Your Account", href: "/account", keywords: "account profile settings" },
  { name: "Submit Post", href: "/submit", keywords: "submit post write" },
  { name: "Sign In", href: "/login", keywords: "sign in login auth" },
];

/* ─── Types ─── */

interface MarketItem {
  condition_id?: string;
  question?: string;
  tokens?: Array<{ outcome?: string; price?: number }>;
  image?: string;
}

interface AgentItem {
  id: string;
  name: string;
  description?: string;
  color?: string;
}

/* ─── Icons ─── */

function PageIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-gray-400">
      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <polyline points="13 2 13 9 20 9" />
    </svg>
  );
}

function MarketIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-gray-400">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

function AgentIcon({ color }: { color?: string }) {
  return (
    <span
      className="h-3 w-3 rounded-full shrink-0 border border-gray-200"
      style={{ backgroundColor: color || "#6b7280" }}
    />
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-gray-400">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

/* ─── Main component ─── */

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [markets, setMarkets] = useState<MarketItem[]>([]);
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const fetched = useRef(false);
  const router = useRouter();

  // Cmd+K / Ctrl+K listener
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // Fetch data lazily on first open
  useEffect(() => {
    if (!open || fetched.current) return;
    fetched.current = true;

    Promise.allSettled([
      fetch("/api/markets?limit=50").then((r) => r.json()),
      fetch("/api/agents/list").then((r) => r.json()),
    ]).then(([mResult, aResult]) => {
      if (mResult.status === "fulfilled" && Array.isArray(mResult.value))
        setMarkets(mResult.value);
      if (aResult.status === "fulfilled" && Array.isArray(aResult.value))
        setAgents(aResult.value);
    });
  }, [open]);

  const navigate = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={() => setOpen(false)}
      />

      {/* Dialog */}
      <div className="relative mx-auto mt-[min(20vh,120px)] max-w-xl w-[calc(100%-2rem)]">
        <Command
          className="bg-white border border-gray-200 shadow-2xl overflow-hidden"
          label="Command palette"
        >
          {/* Input */}
          <div className="flex items-center gap-2.5 px-4 border-b border-gray-100">
            <SearchIcon />
            <Command.Input
              placeholder="Search markets, agents, pages..."
              className="flex-1 py-3.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none bg-transparent"
              autoFocus
            />
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-medium text-gray-400 bg-gray-100 border border-gray-200">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <Command.List className="max-h-[min(60vh,400px)] overflow-y-auto p-2">
            <Command.Empty className="py-10 text-center text-sm text-gray-400">
              No results found.
            </Command.Empty>

            {/* Pages */}
            <Command.Group
              heading="Pages"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-gray-400"
            >
              {PAGES.map((p) => (
                <Command.Item
                  key={p.href}
                  value={`${p.name} ${p.keywords}`}
                  onSelect={() => navigate(p.href)}
                  className="flex items-center gap-2.5 px-2.5 py-2 text-sm text-gray-700 rounded cursor-pointer data-[selected=true]:bg-[#1565c0]/5 data-[selected=true]:text-[#1565c0]"
                >
                  <PageIcon />
                  {p.name}
                </Command.Item>
              ))}
            </Command.Group>

            {/* Markets */}
            {markets.length > 0 && (
              <Command.Group
                heading="Markets"
                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-gray-400"
              >
                {markets.map((m, i) => {
                  const q = m.question ?? "Unknown market";
                  const cid = m.condition_id ?? String(i);
                  const yes = m.tokens?.find(
                    (t) => t.outcome?.toLowerCase() === "yes"
                  );
                  const pct =
                    yes?.price != null
                      ? `${(yes.price * 100).toFixed(0)}%`
                      : "";
                  return (
                    <Command.Item
                      key={cid}
                      value={q}
                      onSelect={() => navigate("/trade")}
                      className="flex items-center gap-2.5 px-2.5 py-2 text-sm text-gray-700 rounded cursor-pointer data-[selected=true]:bg-[#1565c0]/5 data-[selected=true]:text-[#1565c0]"
                    >
                      {m.image ? (
                        <img
                          src={m.image as string}
                          alt=""
                          className="h-4 w-4 shrink-0 object-cover rounded-sm"
                        />
                      ) : (
                        <MarketIcon />
                      )}
                      <span className="truncate flex-1">{q}</span>
                      {pct && (
                        <span className="text-xs font-mono font-bold text-green-600 shrink-0">
                          {pct}
                        </span>
                      )}
                    </Command.Item>
                  );
                })}
              </Command.Group>
            )}

            {/* Agents */}
            {agents.length > 0 && (
              <Command.Group
                heading="Agents"
                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-gray-400"
              >
                {agents.map((a) => (
                  <Command.Item
                    key={a.id}
                    value={`${a.name} ${a.description ?? ""}`}
                    onSelect={() => navigate(`/agents/${a.name}`)}
                    className="flex items-center gap-2.5 px-2.5 py-2 text-sm text-gray-700 rounded cursor-pointer data-[selected=true]:bg-[#1565c0]/5 data-[selected=true]:text-[#1565c0]"
                  >
                    <AgentIcon color={a.color} />
                    <span className="font-medium">{a.name}</span>
                    {a.description && (
                      <span className="text-xs text-gray-400 truncate flex-1">
                        {a.description}
                      </span>
                    )}
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2">
            <div className="flex items-center gap-3 text-[10px] text-gray-400">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-200 font-mono">↑↓</kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-200 font-mono">↵</kbd>
                Open
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-200 font-mono">esc</kbd>
                Close
              </span>
            </div>
            <span className="text-[10px] text-gray-300 font-mono">
              ⌘K
            </span>
          </div>
        </Command>
      </div>
    </div>
  );
}

/** Export open trigger for header search to call */
export function useCommandPalette() {
  return {
    open: () => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "k",
          metaKey: true,
          bubbles: true,
        })
      );
    },
  };
}
