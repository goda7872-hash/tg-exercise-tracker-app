"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function ProgressChart({ data, unit }: { data: { week: number; value: number }[]; unit: string }) {
  if (!data.length) return <p className="text-tg-text-secondary text-sm">No data logged yet.</p>;
  const rows = data.map((d) => ({ name: `W${d.week}`, value: d.value }));
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#333333" strokeDasharray="3 3" />
          <XAxis dataKey="name" stroke="#a0a0a0" fontSize={12} />
          <YAxis stroke="#a0a0a0" fontSize={12} domain={["auto", "auto"]} />
          <Tooltip
            contentStyle={{ background: "#121212", border: "1px solid #333333", borderRadius: 8 }}
            formatter={(v: number) => [`${v} ${unit}`.trim(), "Value"]}
          />
          <Line type="monotone" dataKey="value" stroke="#ff6b35" strokeWidth={2} dot={{ r: 4, fill: "#ff6b35" }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
