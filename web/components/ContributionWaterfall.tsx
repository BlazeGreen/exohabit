import type { Contribution } from "@/lib/types";
import { DIMENSION_LABEL } from "@/lib/format";

/**
 * Exact decomposition of the score: because the model is a weighted linear sum
 * of bounded sub-scores, "why this score" is not an approximation of a black
 * box — it IS the model. Each bar is weight_i * (subscore_i - neutral) * 100.
 */
export default function ContributionWaterfall({ contributions }: { contributions: Contribution[] }) {
  const max = Math.max(1, ...contributions.map((c) => Math.abs(c.push)));
  return (
    <div className="flex flex-col gap-3.5">
      {contributions.map((c) => {
        const positive = c.push >= 0;
        const widthPct = (Math.abs(c.push) / max) * 100;
        return (
          <div key={c.dimension}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-text-dim">
                {DIMENSION_LABEL[c.dimension] ?? c.dimension}
                {c.imputed && <span className="ml-1.5 text-amber">imputed</span>}
              </span>
              <span className={`num ${positive ? "text-cyan" : "text-red"}`}>
                {positive ? "+" : ""}
                {c.push.toFixed(1)}
              </span>
            </div>
            <div className="relative h-1.5 rounded-full bg-white/[0.06]">
              <div className="absolute left-1/2 top-0 h-full w-px bg-white/20" />
              <div
                className="absolute top-0 h-full rounded-full"
                style={{
                  left: positive ? "50%" : `${50 - widthPct / 2}%`,
                  width: `${widthPct / 2}%`,
                  background: positive ? "var(--cyan)" : "var(--red)",
                  boxShadow: `0 0 8px ${positive ? "var(--cyan)" : "var(--red)"}60`,
                }}
              />
            </div>
          </div>
        );
      })}
      <p className="mt-1 text-[0.7rem] text-text-faint">
        Push = weight × (sub-score − 0.5) × 100, relative to a neutral (0.5) planet on every
        dimension. This is the exact model, not an approximation of a trained black box.
      </p>
    </div>
  );
}
