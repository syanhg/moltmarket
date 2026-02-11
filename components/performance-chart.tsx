"use client";

import { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { PerformanceSeries } from "@/lib/types";

interface Props {
  series: PerformanceSeries[];
}

type Period = "24H" | "7D" | "30D" | "ALL";

const PERIODS: { key: Period; label: string }[] = [
  { key: "24H", label: "24H" },
  { key: "7D", label: "7D" },
  { key: "30D", label: "30D" },
  { key: "ALL", label: "All" },
];

function periodCutoff(period: Period): number {
  const now = Date.now() / 1000;
  switch (period) {
    case "24H":
      return now - 86400;
    case "7D":
      return now - 7 * 86400;
    case "30D":
      return now - 30 * 86400;
    case "ALL":
      return 0;
  }
}

export default function PerformanceChart({ series }: Props) {
  const [period, setPeriod] = useState<Period>("ALL");

  const { data, seriesFiltered } = useMemo(() => {
    if (!series.length) return { data: [], seriesFiltered: [] };

    const cutoff = periodCutoff(period);
    const filtered = series.map((s) => ({
      ...s,
      data: s.data.filter((pt) => pt.timestamp >= cutoff),
    })).filter((s) => s.data.length > 0);

    const timeMap = new Map<number, Record<string, number>>();
    for (const s of filtered) {
      for (const pt of s.data) {
        const key = Math.round(pt.timestamp);
        if (!timeMap.has(key)) timeMap.set(key, { timestamp: key });
        timeMap.get(key)![s.agent_id] = pt.value;
      }
    }
    const dataArr = Array.from(timeMap.values()).sort(
      (a, b) => a.timestamp - b.timestamp
    );

    return { data: dataArr, seriesFiltered: filtered };
  }, [series, period]);

  if (!series.length) return null;

  const formatTime = (ts: number) => {
    const d = new Date(ts * 1000);
    if (period === "24H") {
      return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
    }
    return `${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getDate().toString().padStart(2, "0")}`;
  };

  const formatValue = (v: number) => `$${v.toLocaleString()}`;

  return (
    <div>
      {/* Period selectors (Yahoo Finance style) */}
      <div className="flex items-center gap-0 mb-4 border-b border-gray-100 pb-3">
        <div className="flex items-center bg-gray-100 p-0.5">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-3 py-1 text-xs font-semibold transition-colors ${
                period === p.key
                  ? "bg-white text-[#1565c0] shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-3 text-[11px] text-gray-400">
          <span className="flex items-center gap-1">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
            Mountain
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={340}>
        <AreaChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <defs>
            {seriesFiltered.map((s) => (
              <linearGradient key={s.agent_id} id={`grad-${s.agent_id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={s.color} stopOpacity={0.15} />
                <stop offset="95%" stopColor={s.color} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
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
          />
          <Tooltip
            labelFormatter={(ts) => {
              const d = new Date(Number(ts) * 1000);
              return d.toLocaleString();
            }}
            formatter={(value: number) => [`$${value.toLocaleString()}`, ""]}
            contentStyle={{
              fontSize: 12,
              borderRadius: 0,
              border: "1px solid #e2e5e8",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
            iconType="plainline"
            iconSize={12}
          />
          {seriesFiltered.map((s) => (
            <Area
              key={s.agent_id}
              type="monotone"
              dataKey={s.agent_id}
              name={s.agent_name}
              stroke={s.color}
              strokeWidth={1.5}
              fill={`url(#grad-${s.agent_id})`}
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0 }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
