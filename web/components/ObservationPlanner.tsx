"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { IndexRow } from "@/lib/types";
import { fmt } from "@/lib/format";
import { BandBadge } from "./BandBadge";

const W = 900;
const H = 520;
const PAD = { l: 58, r: 24, t: 20, b: 46 };

// x = Habitability Potential (linear 0–100); y = TSM or ESM (log)
const xPos = (hp: number) => PAD.l + (Math.max(0, Math.min(100, hp)) / 100) * (W - PAD.l - PAD.r);
function yScaleFactory(lo: number, hi: number) {
  const l0 = Math.log10(lo);
  const l1 = Math.log10(hi);
  return (v: number) => {
    const t = (Math.log10(Math.max(lo, Math.min(hi, v))) - l0) / (l1 - l0);
    return H - PAD.b - t * (H - PAD.t - PAD.b);
  };
}

export default function ObservationPlanner({ hpThreshold }: { hpThreshold: number }) {
  const [rows, setRows] = useState<IndexRow[] | null>(null);
  const [metric, setMetric] = useState<"tsm" | "esm">("tsm");
  const [minHp, setMinHp] = useState(0);
  const [rockyOnly, setRockyOnly] = useState(false);
  const [hover, setHover] = useState<IndexRow | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/data/index.json").then((r) => r.json()).then(setRows).catch(() => setRows([]));
  }, []);

  const pts = useMemo(() => {
    if (!rows) return [];
    return rows.filter(
      (r) =>
        r.transiting &&
        r[metric] != null &&
        (r[metric] as number) > 0 &&
        r.score >= minHp &&
        (!rockyOnly || (r.radius_earth != null && r.radius_earth < 1.6))
    );
  }, [rows, metric, minHp, rockyOnly]);

  const yScale = useMemo(() => {
    const vals = pts.map((p) => p[metric] as number);
    const hi = Math.max(20, ...vals) * 1.4;
    return yScaleFactory(0.05, hi);
  }, [pts, metric]);

  // reference bars (Kempton thresholds); TSM 12 terrestrial, 90 larger. ESM ≈ 7.5
  const bars = metric === "tsm" ? [12, 90] : [7.5];

  const shortlist = useMemo(
    () =>
      [...pts]
        .filter((r) => r.score >= hpThreshold && r.tsm_tier === "strong")
        .sort((a, b) => (b[metric] as number) - (a[metric] as number)),
    [pts, hpThreshold, metric]
  );

  const meetBoth = pts.filter((r) => r.score >= hpThreshold && r.tsm_tier === "strong").length;

  return (
    <div>
      <div className="panel mb-4 flex flex-wrap items-center gap-4 p-4">
        <div className="inline-flex overflow-hidden rounded-full border border-[var(--border)] text-xs">
          {(["tsm", "esm"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={"px-3 py-1 " + (metric === m ? "bg-[var(--cyan-dim)] text-cyan" : "text-text-faint hover:text-text")}
            >
              {m === "tsm" ? "Transmission (TSM)" : "Emission (ESM)"}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs text-text-dim">
          Min potential
          <input type="range" min={0} max={90} step={5} value={minHp} onChange={(e) => setMinHp(+e.target.value)} className="accent-[var(--cyan)]" />
          <span className="num w-6">{minHp}</span>
        </label>
        <button
          onClick={() => setRockyOnly((v) => !v)}
          className={
            "rounded-full border px-3 py-1 text-xs " +
            (rockyOnly ? "border-cyan/40 bg-[var(--cyan-dim)] text-cyan" : "border-[var(--border)] text-text-dim hover:text-text")
          }
        >
          Rocky only (&lt; 1.6 R⊕)
        </button>
        <p className="label-eyebrow ml-auto">
          {rows === null ? "loading…" : `${pts.length.toLocaleString()} transiting · `}
          <span className="text-cyan">{meetBoth} meet both bars</span>
        </p>
      </div>

      <div className="panel relative overflow-hidden p-4">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: "auto" }}>
          {/* promising + reachable zone: HP >= threshold and above the
              lowest (terrestrial) feasibility bar */}
          <rect
            x={xPos(hpThreshold)}
            y={PAD.t}
            width={W - PAD.r - xPos(hpThreshold)}
            height={yScale(bars[0]) - PAD.t}
            fill="var(--cyan)"
            opacity={0.07}
          />

          {/* axes */}
          <line x1={PAD.l} y1={H - PAD.b} x2={W - PAD.r} y2={H - PAD.b} stroke="var(--border)" />
          <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={H - PAD.b} stroke="var(--border)" />

          {/* HP threshold line */}
          <line x1={xPos(hpThreshold)} y1={PAD.t} x2={xPos(hpThreshold)} y2={H - PAD.b} stroke="var(--cyan)" strokeOpacity={0.4} strokeDasharray="3 4" />
          <text x={xPos(hpThreshold) + 4} y={PAD.t + 10} fontSize="9" fill="var(--text-faint)">
            HP {hpThreshold}
          </text>

          {/* metric bars */}
          {bars.map((b) => (
            <g key={b}>
              <line x1={PAD.l} y1={yScale(b)} x2={W - PAD.r} y2={yScale(b)} stroke="var(--amber)" strokeOpacity={0.35} strokeDasharray="3 4" />
              <text x={W - PAD.r} y={yScale(b) - 3} textAnchor="end" fontSize="9" fill="var(--text-faint)">
                {metric.toUpperCase()} {b}
              </text>
            </g>
          ))}

          {[0, 25, 50, 75, 100].map((hp) => (
            <text key={hp} x={xPos(hp)} y={H - PAD.b + 15} textAnchor="middle" fontSize="10" fill="var(--text-faint)" fontFamily="var(--font-geist-mono)">
              {hp}
            </text>
          ))}
          {[0.1, 1, 10, 100, 1000].map((v) => (
            <text key={v} x={PAD.l - 8} y={yScale(v) + 3} textAnchor="end" fontSize="10" fill="var(--text-faint)" fontFamily="var(--font-geist-mono)">
              {v}
            </text>
          ))}
          <text x={(W + PAD.l - PAD.r) / 2} y={H - 6} textAnchor="middle" fontSize="10" fill="var(--text-faint)" letterSpacing="1">
            HABITABILITY POTENTIAL
          </text>
          <text x={16} y={H / 2} textAnchor="middle" fontSize="10" fill="var(--text-faint)" letterSpacing="1" transform={`rotate(-90 16 ${H / 2})`}>
            {metric === "tsm" ? "TSM (transmission, log)" : "ESM (emission, log)"}
          </text>

          {pts.map((p) => {
            const strong = p.tsm_tier === "strong";
            const inQuad = p.score >= hpThreshold && strong;
            return (
              <circle
                key={p.id}
                cx={xPos(p.score)}
                cy={yScale(p[metric] as number)}
                r={hover?.id === p.id ? 6 : inQuad ? 4.5 : 3}
                fill={inQuad ? "var(--cyan)" : strong ? "var(--amber)" : "var(--text-faint)"}
                fillOpacity={inQuad ? 1 : strong ? 0.7 : 0.35}
                stroke={hover?.id === p.id ? "white" : "none"}
                className="cursor-pointer"
                onMouseEnter={() => setHover(p)}
                onMouseLeave={() => setHover((h) => (h?.id === p.id ? null : h))}
                onClick={() => router.push(`/planets/${p.id}`)}
              />
            );
          })}
        </svg>
        {hover && (
          <div className="pointer-events-none absolute left-4 top-4 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-2 text-xs">
            <div className="font-medium text-text">{hover.name}</div>
            <div className="num text-text-dim">
              HP {hover.score.toFixed(0)} · {metric.toUpperCase()} {fmt(hover[metric] as number, 0)}
              {hover.radius_earth != null && ` · ${hover.radius_earth.toFixed(2)} R⊕`}
            </div>
          </div>
        )}
      </div>

      <div className="mt-6">
        <h2 className="font-display text-lg font-medium text-text">
          Promising &amp; reachable — {shortlist.length} worlds
        </h2>
        <p className="mt-1 text-sm text-text-dim">
          Habitability potential ≥ {hpThreshold} <span className="text-text-faint">and</span> a
          transmission metric above the recommended threshold for their size.
        </p>
        <div className="mt-4 overflow-hidden rounded-xl border border-[var(--border)]">
          {shortlist.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-text-faint">
              No worlds clear both bars with the current filters.
            </p>
          )}
          {shortlist.map((p, i) => (
            <Link
              key={p.id}
              href={`/planets/${p.id}`}
              className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3 last:border-0 hover:bg-white/[0.03]"
            >
              <span className="flex items-center gap-3">
                <span className="num w-6 text-xs text-text-faint">#{i + 1}</span>
                <span>
                  <span className="block text-sm text-text">{p.name}</span>
                  <span className="block text-xs text-text-faint">
                    {p.radius_earth != null ? `${p.radius_earth.toFixed(2)} R⊕` : "—"} ·{" "}
                    {p.eq_temp_k != null ? `${p.eq_temp_k.toFixed(0)} K` : "—"}
                  </span>
                </span>
              </span>
              <span className="flex items-center gap-3">
                <span className="num text-sm text-text-dim">HP {p.score.toFixed(0)}</span>
                <span className="num text-sm text-cyan">
                  {metric.toUpperCase()} {fmt(p[metric] as number, 0)}
                </span>
                <BandBadge band={p.band} size="sm" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
