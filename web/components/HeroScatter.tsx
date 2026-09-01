"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { IndexRow } from "@/lib/types";
import { bandColor, bandKey } from "@/lib/format";

const W = 960;
const H = 460;
const PAD = { l: 46, r: 20, t: 20, b: 40 };

const xScale = (r: number) => {
  const lo = Math.log10(0.3);
  const hi = Math.log10(20);
  const t = (Math.log10(Math.max(0.3, Math.min(20, r))) - lo) / (hi - lo);
  return PAD.l + t * (W - PAD.l - PAD.r);
};
const yScale = (t: number) => {
  const lo = Math.log10(50);
  const hi = Math.log10(3000);
  const v = (Math.log10(Math.max(50, Math.min(3000, t))) - lo) / (hi - lo);
  return H - PAD.b - v * (H - PAD.t - PAD.b);
};

export default function HeroScatter() {
  const [rows, setRows] = useState<IndexRow[] | null>(null);
  const [hover, setHover] = useState<IndexRow | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/data/index.json").then((r) => r.json()).then(setRows).catch(() => setRows([]));
  }, []);

  const sample = useMemo(() => {
    if (!rows) return [];
    const withVals = rows.filter((r) => r.radius_earth != null && r.eq_temp_k != null);
    const hi = withVals.filter((r) => r.score >= 60);
    const rest = withVals.filter((r) => r.score < 60);
    const step = Math.max(1, Math.floor(rest.length / 1200));
    const thinned = rest.filter((_, i) => i % step === 0);
    return [...thinned, ...hi]; // draw high-potential last so they sit on top
  }, [rows]);

  return (
    <div className="panel relative overflow-hidden p-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: "auto" }}>
        {/* HZ temperature band */}
        <rect
          x={PAD.l}
          y={yScale(320)}
          width={W - PAD.l - PAD.r}
          height={yScale(200) - yScale(320)}
          fill="var(--cyan)"
          opacity={0.06}
        />
        <line x1={PAD.l} x2={W - PAD.r} y1={yScale(255)} y2={yScale(255)} stroke="var(--cyan)" strokeOpacity={0.25} strokeDasharray="3 4" />

        {/* axes */}
        <line x1={PAD.l} y1={H - PAD.b} x2={W - PAD.r} y2={H - PAD.b} stroke="var(--border)" />
        <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={H - PAD.b} stroke="var(--border)" />
        {[0.5, 1, 2, 5, 10, 20].map((r) => (
          <text key={r} x={xScale(r)} y={H - PAD.b + 16} textAnchor="middle" fontSize="10" fill="var(--text-faint)" fontFamily="var(--font-geist-mono)">
            {r}
          </text>
        ))}
        {[100, 200, 300, 500, 1000, 2000].map((t) => (
          <text key={t} x={PAD.l - 8} y={yScale(t) + 3} textAnchor="end" fontSize="10" fill="var(--text-faint)" fontFamily="var(--font-geist-mono)">
            {t}
          </text>
        ))}
        <text x={(W + PAD.l - PAD.r) / 2} y={H - 4} textAnchor="middle" fontSize="10" fill="var(--text-faint)" letterSpacing="1">
          PLANET RADIUS (R⊕, log scale)
        </text>
        <text x={14} y={H / 2} textAnchor="middle" fontSize="10" fill="var(--text-faint)" letterSpacing="1" transform={`rotate(-90 14 ${H / 2})`}>
          EQUILIBRIUM TEMP (K, log scale)
        </text>

        {sample.map((p) => {
          const color = bandColor[bandKey(p.band)];
          const r = 2 + (p.score / 100) * 4.5;
          return (
            <circle
              key={p.id}
              cx={xScale(p.radius_earth!)}
              cy={yScale(p.eq_temp_k!)}
              r={hover?.id === p.id ? r + 2 : r}
              fill={color}
              fillOpacity={p.score >= 60 ? 0.9 : 0.35}
              stroke={hover?.id === p.id ? "white" : "none"}
              strokeWidth={1}
              className="cursor-pointer transition-[r]"
              onMouseEnter={() => setHover(p)}
              onMouseLeave={() => setHover((h) => (h?.id === p.id ? null : h))}
              onClick={() => router.push(`/planets/${p.id}`)}
            />
          );
        })}
      </svg>
      {hover && (
        <div className="pointer-events-none absolute left-4 top-4 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-2 text-xs shadow-xl">
          <div className="font-medium text-text">{hover.name}</div>
          <div className="num text-text-dim">
            {hover.radius_earth?.toFixed(2)} R⊕ · {hover.eq_temp_k?.toFixed(0)} K · score {hover.score.toFixed(0)}
          </div>
        </div>
      )}
      {!rows && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="label-eyebrow animate-pulse">loading catalogue…</span>
        </div>
      )}
    </div>
  );
}
