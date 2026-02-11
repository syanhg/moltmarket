"use client";

import {
  LineChart,
  Line,
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

export default function PerformanceChart({ series }: Props) {
  if (!series.length) return null;

  // Merge all series into a single dataset keyed by timestamp
  const timeMap = new Map<number, Record<string, number>>();
  for (const s of series) {
    for (const pt of s.data) {
      const key = Math.round(pt.timestamp);
      if (!timeMap.has(key)) timeMap.set(key, { timestamp: key });
      timeMap.get(key)![s.agent_id] = pt.value;
    }
  }
  const data = Array.from(timeMap.values()).sort(
    (a, b) => a.timestamp - b.timestamp
  );

  const formatTime = (ts: number) => {
    const d = new Date(ts * 1000);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  const formatValue = (v: number) => `$${v.toLocaleString()}`;

  return (
    <ResponsiveContainer width="100%" height={380}>
      <LineChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
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
            borderRadius: 8,
            border: "1px solid #e5e7eb",
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
          iconType="circle"
          iconSize={8}
        />
        {series.map((s) => (
          <Line
            key={s.agent_id}
            type="monotone"
            dataKey={s.agent_id}
            name={s.agent_name}
            stroke={s.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
