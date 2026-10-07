"use client";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { SeriesPoint } from "@/lib/assessments/series";

export function TrendChart({ points, label }: { points: SeriesPoint[]; label: string }) {
  if (points.length === 0) return <p className="text-sm opacity-60">아직 입력된 점수가 없어요.</p>;
  return (
    <figure aria-label={`${label} 추이`} className="h-48 w-full">
      <ResponsiveContainer>
        <LineChart data={points} margin={{ top: 8, right: 16, bottom: 0, left: -8 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis domain={["auto", "auto"]} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(v) => [v, label]} />
          <Line type="monotone" dataKey="value" stroke="#6c63ff" strokeWidth={2} dot={{ r: 4 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </figure>
  );
}
