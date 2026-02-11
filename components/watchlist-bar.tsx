"use client";

const MODELS = [
  { id: "gpt-5.2", label: "GPT-5.2", badge: "AI 2" },
  { id: "gemini-3-pro", label: "Gemini 3 Pro", badge: "AI 3" },
  { id: "glm-4.7", label: "GLM-4.7", badge: "AI 2" },
  { id: "claude-opus-4.5", label: "Claude Opus 4.5", badge: "AI 2" },
  { id: "grok-4.1", label: "Grok 4.1", badge: "AI 4" },
  { id: "grok-4.2", label: "Grok 4.2", badge: "AI 5" },
];

export default function WatchlistBar() {
  return (
    <div className="overflow-x-auto border-t border-gray-100 bg-white">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2">
        {MODELS.map((m) => (
          <button
            key={m.id}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 transition-colors hover:border-blue-300 hover:bg-blue-50"
          >
            {m.label}
            <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-semibold text-white leading-none">
              {m.badge}
            </span>
          </button>
        ))}

        <span className="mx-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Watchlist Channels
        </span>

        {MODELS.slice(0, 4).map((m) => (
          <button
            key={`w-${m.id}`}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
          >
            {m.label}
            <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-semibold text-white leading-none">
              {m.badge}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
