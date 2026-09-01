"use client";
import { useMemo, useState } from "react";
import Link from "next/link";

export interface SystemPlanet {
  id: string;
  name: string;
  semiMajorAu: number | null;
  radiusEarth: number | null;
  isTarget: boolean;
  inConservativeHz: boolean;
}

function starColor(teff: number | null): string {
  if (teff == null) return "#fff6e0";
  if (teff >= 10000) return "#9db4ff";
  if (teff >= 7500) return "#c9d9ff";
  if (teff >= 6000) return "#fff4e8";
  if (teff >= 5200) return "#ffe9b3";
  if (teff >= 3700) return "#ffbf7a";
  return "#ff8a65";
}

const SIZE = 560;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R_MIN = 46;
const R_MAX = SIZE / 2 - 40;

export default function SystemView2D({
  planets,
  starName,
  starTeff,
  starRadiusSun,
  hzConservativeAu,
  hzOptimisticAu,
}: {
  planets: SystemPlanet[];
  starName?: string;
  starTeff: number | null;
  starRadiusSun: number | null;
  hzConservativeAu: [number, number] | null;
  hzOptimisticAu: [number, number] | null;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const withOrbit = planets.filter((p) => p.semiMajorAu != null && p.semiMajorAu > 0);

  const { rScale, maxA } = useMemo(() => {
    const as = withOrbit.map((p) => p.semiMajorAu!);
    const hzMax = hzOptimisticAu?.[1] ?? hzConservativeAu?.[1] ?? 0;
    const maxA = Math.max(0.05, ...as, hzMax * 1.15);
    const minA = Math.min(...as.filter((a) => a > 0), maxA / 50);
    const logMin = Math.log10(Math.max(minA, maxA / 200));
    const logMax = Math.log10(maxA);
    return {
      maxA,
      rScale: (a: number) => {
        const t = (Math.log10(Math.max(a, maxA / 200)) - logMin) / (logMax - logMin || 1);
        return R_MIN + Math.max(0, Math.min(1, t)) * (R_MAX - R_MIN);
      },
    };
  }, [withOrbit, hzConservativeAu, hzOptimisticAu]);

  const color = starColor(starTeff);
  const starR = 10 + Math.min(16, (starRadiusSun ?? 1) * 8);

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full" style={{ height: "auto", maxHeight: 560 }}>
        <defs>
          <radialGradient id="starGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={color} stopOpacity="0.9" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* optimistic + conservative HZ rings */}
        {hzOptimisticAu && (
          <circle cx={CX} cy={CY} r={rScale(hzOptimisticAu[1])} fill="none" stroke="var(--amber)" strokeOpacity={0.35} strokeWidth={rScale(hzOptimisticAu[0]) - rScale(hzOptimisticAu[1])} />
        )}
        {hzConservativeAu && (
          <circle cx={CX} cy={CY} r={rScale(hzConservativeAu[1])} fill="none" stroke="var(--cyan)" strokeOpacity={0.28} strokeWidth={rScale(hzConservativeAu[0]) - rScale(hzConservativeAu[1])} />
        )}

        {/* orbit paths */}
        {withOrbit.map((p) => (
          <circle key={p.id} cx={CX} cy={CY} r={rScale(p.semiMajorAu!)} fill="none" stroke="var(--border-strong)" strokeWidth={1} strokeDasharray={p.isTarget ? "0" : "2 3"} />
        ))}

        {/* star */}
        <circle cx={CX} cy={CY} r={starR * 3} fill="url(#starGlow)" />
        <circle cx={CX} cy={CY} r={starR} fill={color} />
        {starName && (
          <text
            x={CX}
            y={CY + starR + 16}
            textAnchor="middle"
            fontSize="12"
            fontWeight={600}
            fill="var(--text)"
          >
            ★ {starName}
          </text>
        )}

        {/* planets */}
        {withOrbit.map((p, i) => {
          const angle = (i / withOrbit.length) * Math.PI * 2 + Math.PI / 5;
          const r = rScale(p.semiMajorAu!);
          const px = CX + r * Math.cos(angle);
          const py = CY + r * Math.sin(angle);
          const pr = 4 + Math.min(10, (p.radiusEarth ?? 1) * 3.2);
          const isSel = selected === p.id || p.isTarget;
          return (
            <g key={p.id} className="cursor-pointer" onMouseEnter={() => setSelected(p.id)} onMouseLeave={() => setSelected(null)}>
              <circle
                cx={px}
                cy={py}
                r={pr}
                fill={p.isTarget ? "white" : p.inConservativeHz ? "var(--cyan)" : "var(--text-dim)"}
                stroke={p.isTarget ? "var(--cyan)" : "none"}
                strokeWidth={2}
                style={{ filter: isSel ? `drop-shadow(0 0 8px ${p.isTarget ? "#fff" : "var(--cyan)"})` : undefined }}
              />
              <text x={px} y={py - pr - 8} textAnchor="middle" fontSize="11" fill={isSel ? "var(--text)" : "var(--text-faint)"} fontWeight={p.isTarget ? 600 : 400}>
                {p.name.replace(/^.*\s/, "")}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="mt-1 text-center text-[0.65rem] text-text-faint">
        Illustrative — orbital distances on a log scale for readability, not to true astronomical
        scale. Planet order at a given radius is not necessarily true azimuthal position.
      </p>
      {withOrbit.some((p) => !p.isTarget) && (
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {withOrbit.map((p) => (
            <Link
              key={p.id}
              href={`/planets/${p.id}`}
              className={`rounded-full border px-2.5 py-1 text-xs ${p.isTarget ? "border-cyan/40 text-cyan" : "border-[var(--border)] text-text-dim hover:text-text"}`}
            >
              {p.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
