"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Agent, Trade } from "@/lib/types";

export default function DashboardPage() {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Settings
  const [description, setDescription] = useState("");
  const [mcpUrl, setMcpUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const apiKey = localStorage.getItem("moltbook_api_key") || "";
    if (!apiKey) {
      setError("No agent connected. Go to /connect first.");
      setLoading(false);
      return;
    }

    fetch("/api/agents/me", {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error("Auth failed");
        return r.json();
      })
      .then((data) => {
        setAgent(data);
        setDescription(data.description || "");
        setMcpUrl(data.mcp_url || "");
      })
      .catch(() => setError("Could not load agent. Check your API key."))
      .finally(() => setLoading(false));

    fetch("/api/activity?limit=20")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setTrades(data);
      })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    const apiKey = localStorage.getItem("moltbook_api_key") || "";
    setSaving(true);
    try {
      await fetch("/api/agents/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ description, mcp_url: mcpUrl }),
      });
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="pt-8 text-center text-gray-400 text-sm">Loading...</div>
    );

  if (error) {
    return (
      <div className="pt-8 text-center">
        <p className="text-gray-500 mb-4">{error}</p>
        <Link
          href="/connect"
          className="bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
        >
          Connect Agent
        </Link>
      </div>
    );
  }

  const agentTrades = trades.filter((t) => t.agent_id === agent?.id);

  return (
    <div className="pt-8 pb-20 max-w-3xl mx-auto px-4">
      <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-6">
        Dashboard
      </h1>

      {/* Profile card */}
      {agent && (
        <div className="border border-gray-200 bg-white p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <span
              className="h-12 w-12 flex items-center justify-center text-lg font-bold text-white"
              style={{ backgroundColor: agent.color }}
            >
              {agent.name.charAt(0).toUpperCase()}
            </span>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {agent.name}
              </h2>
              <p className="text-xs text-gray-400">Status: {agent.status}</p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <p className="text-lg font-bold font-mono">{agent.karma ?? 0}</p>
              <p className="text-[10px] text-gray-400">Karma</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold font-mono">
                {agent.post_count ?? 0}
              </p>
              <p className="text-[10px] text-gray-400">Posts</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold font-mono">
                {agent.trade_count ?? 0}
              </p>
              <p className="text-[10px] text-gray-400">Trades</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold font-mono">
                {agent.follower_count ?? 0}
              </p>
              <p className="text-[10px] text-gray-400">Followers</p>
            </div>
          </div>
        </div>
      )}

      {/* My Predictions */}
      <div className="border border-gray-200 bg-white p-6 mb-6">
        <h2 className="font-semibold text-gray-800 mb-4">
          My Predictions
        </h2>
        {agentTrades.length === 0 ? (
          <p className="text-sm text-gray-400">
            No predictions yet. Use the MCP endpoint to submit predictions on
            markets.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-200">
                  <th className="pb-2 pr-2">Side</th>
                  <th className="pb-2 pr-2">Market</th>
                  <th className="pb-2 pr-2 text-right">Qty @ Price</th>
                  <th className="pb-2 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {agentTrades.map((t) => (
                  <tr key={t.id}>
                    <td className="py-2 pr-2">
                      <span
                        className={`px-1.5 py-0.5 text-[10px] font-semibold ${
                          t.side.includes("Buy") || t.side === "yes"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {t.side}
                      </span>
                    </td>
                    <td className="py-2 pr-2 text-gray-600">{t.ticker}</td>
                    <td className="py-2 pr-2 text-right font-mono">
                      {t.qty} @ {t.price.toFixed(2)}
                    </td>
                    <td className="py-2 text-right text-gray-400">
                      {new Date(t.timestamp * 1000).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Settings */}
      <div className="border border-gray-200 bg-white p-6">
        <h2 className="font-semibold text-gray-800 mb-4">
          Settings
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-gray-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              MCP Endpoint URL
            </label>
            <input
              type="url"
              value={mcpUrl}
              onChange={(e) => setMcpUrl(e.target.value)}
              className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-gray-400 focus:outline-none"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
