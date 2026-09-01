import { bandColor, bandKey } from "@/lib/format";
import CountUp from "./CountUp";

const SIZES = {
  lg: { box: 176, stroke: 10, font: "text-5xl" },
  md: { box: 120, stroke: 8, font: "text-3xl" },
  sm: { box: 84, stroke: 6, font: "text-xl" },
} as const;

export default function ScoreDial({
  score,
  band,
  size = "lg",
  animate = true,
}: {
  score: number;
  band: string;
  size?: keyof typeof SIZES;
  animate?: boolean;
}) {
  const { box, stroke, font } = SIZES[size];
  const r = (box - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score)) / 100;
  const color = bandColor[bandKey(band)];

  return (
    <div className="relative shrink-0" style={{ width: box, height: box }}>
      <svg width={box} height={box} viewBox={`0 0 ${box} ${box}`} className="-rotate-90">
        <circle cx={box / 2} cy={box / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle
          cx={box / 2}
          cy={box / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{
            filter: `drop-shadow(0 0 6px ${color}80)`,
            transition: "stroke-dashoffset 1s cubic-bezier(.16,1,.3,1)",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`num font-semibold text-text ${font}`}>
          {animate ? <CountUp value={score} decimals={1} /> : score.toFixed(1)}
        </span>
        {size !== "sm" && <span className="label-eyebrow -mt-0.5">/ 100</span>}
      </div>
    </div>
  );
}
