"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { PerformanceSeries } from "@/lib/types";

interface Props {
  series: PerformanceSeries[];
}

/* ─── Custom tooltip matching the reference design ─── */

function CustomTooltip({
  active,
  payload,
  label,
  visibleSeries,
}: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; color: string; name: string }>;
  label?: number;
  visibleSeries: PerformanceSeries[];
}) {
  if (!active || !payload?.length || !label) return null;

  const d = new Date(Number(label) * 1000);
  const dateStr = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Sort by value descending
  const sorted = [...payload]
    .filter((p) => p.value != null)
    .sort((a, b) => b.value - a.value);

  return (
    <div className="bg-white border border-gray-200 shadow-lg px-4 py-3 min-w-[220px]">
      <p className="text-[11px] text-gray-500 font-medium mb-2">{dateStr}</p>
      <div className="space-y-1.5">
        {sorted.map((entry) => {
          const s = visibleSeries.find((vs) => vs.agent_id === entry.dataKey);
          return (
            <div key={entry.dataKey} className="flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-xs text-gray-700 truncate flex-1">
                {s?.agent_name ?? entry.name}
              </span>
              <span className="text-xs font-bold font-mono text-gray-900">
                ${entry.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Filter dropdown ─── */

function FilterDropdown({
  series,
  visible,
  onToggle,
}: {
  series: PerformanceSeries[];
  visible: Set<string>;
  onToggle: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
        Filter
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-200 shadow-lg w-56 max-h-64 overflow-y-auto">
          <div className="px-3 py-2 border-b border-gray-100">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              Show / Hide Models
            </span>
          </div>
          {series.map((s) => (
            <label
              key={s.agent_id}
              className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={visible.has(s.agent_id)}
                onChange={() => onToggle(s.agent_id)}
                className="h-3.5 w-3.5 rounded border-gray-300 text-[#1565c0] focus:ring-[#1565c0]"
              />
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: s.color }}
              />
              <span className="text-xs text-gray-700 truncate">{s.agent_name}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Main chart ─── */

export default function PerformanceChart({ series }: Props) {
  const [visible, setVisible] = useState<Set<string>>(
    () => new Set(series.map((s) => s.agent_id))
  );

  // Sync when series changes (e.g. new agent appears)
  useEffect(() => {
    setVisible((prev) => {
      const next = new Set(prev);
      for (const s of series) {
        if (!next.has(s.agent_id) && prev.size === 0) next.add(s.agent_id);
        // Auto-add new agents only if no filter has been applied
      }
      // Ensure we always show at least the ones that still exist
      for (const id of next) {
        if (!series.find((s) => s.agent_id === id)) next.delete(id);
      }
      return next;
    });
  }, [series]);

  const toggleAgent = (id: string) => {
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        // Don't allow hiding all
        if (next.size > 1) next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const { data, visibleSeries } = useMemo(() => {
    if (!series.length) return { data: [], visibleSeries: [] };

    const filtered = series.filter((s) => visible.has(s.agent_id));

    // Merge all series data points into unified timeline
    const timeMap = new Map<number, Record<string, number>>();
    for (const s of filtered) {
      for (const pt of s.data) {
        const key = Math.round(pt.timestamp);
        if (!timeMap.has(key)) timeMap.set(key, { timestamp: key });
        timeMap.get(key)![s.agent_id] = pt.value;
      }
    }

    // Forward-fill missing values so lines are continuous
    const dataArr = Array.from(timeMap.values()).sort(
      (a, b) => a.timestamp - b.timestamp
    );
    const lastKnown: Record<string, number> = {};
    for (const row of dataArr) {
      for (const s of filtered) {
        if (row[s.agent_id] != null) {
          lastKnown[s.agent_id] = row[s.agent_id] as number;
        } else if (lastKnown[s.agent_id] != null) {
          row[s.agent_id] = lastKnown[s.agent_id];
        }
      }
    }

    return { data: dataArr, visibleSeries: filtered };
  }, [series, visible]);

  if (!series.length) return null;

  const formatTime = (ts: number) => {
    const d = new Date(ts * 1000);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  const formatValue = (v: number) =>
    `$${v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <div>
      {/* Header with filter */}
      <div className="flex items-center justify-between mb-4">
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {visibleSeries.map((s) => (
            <button
              key={s.agent_id}
              onClick={() => toggleAgent(s.agent_id)}
              className="flex items-center gap-1.5 group"
            >
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: s.color }}
              />
              <span className="text-[11px] text-gray-600 group-hover:text-gray-900 transition-colors truncate max-w-[120px]">
                {s.agent_name}
              </span>
            </button>
          ))}
        </div>

        <FilterDropdown
          series={series}
          visible={visible}
          onToggle={toggleAgent}
        />
      </div>

      <ResponsiveContainer width="100%" height={340}>
        <LineChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#f0f0f0"
            vertical={false}
          />
          <XAxis
            dataKey="timestamp"
            tickFormatter={formatTime}
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            axisLine={{ stroke: "#e5e7eb" }}
            tickLine={false}
            minTickGap={60}
          />
          <YAxis
            tickFormatter={formatValue}
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            axisLine={false}
            tickLine={false}
            width={72}
            domain={["auto", "auto"]}
          />
          <Tooltip
            content={
              <CustomTooltip visibleSeries={visibleSeries} />
            }
            cursor={{ stroke: "#d1d5db", strokeDasharray: "4 4" }}
          />
          {visibleSeries.map((s) => (
            <Line
              key={s.agent_id}
              type="monotone"
              dataKey={s.agent_id}
              name={s.agent_name}
              stroke={s.color}
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0, fill: s.color }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
