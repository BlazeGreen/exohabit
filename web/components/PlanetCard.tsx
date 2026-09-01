import Link from "next/link";
import type { IndexRow } from "@/lib/types";
import { fmt, fmtLy } from "@/lib/format";
import ScoreDial from "./ScoreDial";
import { BandBadge, ConfidencePill } from "./BandBadge";

export default function PlanetCard({ p, rank }: { p: IndexRow; rank?: number }) {
  return (
    <Link
      href={`/planets/${p.id}`}
      className="panel group relative flex flex-col gap-4 p-5 transition-all hover:border-[var(--border-strong)] hover:bg-white/[0.045]"
    >
      {rank != null && (
        <span className="num absolute right-4 top-4 text-xs text-text-faint">#{rank}</span>
      )}
      <div className="flex items-center gap-4">
        <ScoreDial score={p.score} band={p.band} size="sm" animate={false} />
        <div className="min-w-0">
          <h3 className="truncate font-display text-base font-medium text-text group-hover:text-cyan transition-colors">
            {p.name}
          </h3>
          <p className="truncate text-xs text-text-faint">{p.hostname ?? "—"}</p>
          <div className="mt-1.5">
            <BandBadge band={p.band} size="sm" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Radius" value={p.radius_earth != null ? `${fmt(p.radius_earth)} R⊕` : "—"} />
        <Stat label="Teq" value={p.eq_temp_k != null ? `${fmt(p.eq_temp_k, 0)} K` : "—"} />
        <Stat label="Dist" value={fmtLy(p.distance_pc)} />
      </div>

      <div className="hairline flex items-center justify-between gap-2 pt-3">
        <ConfidencePill value={p.confidence} label={p.confidence_label} />
        <span className="flex shrink-0 items-center gap-2">
          {p.tsm_tier === "strong" && (
            <span className="label-eyebrow whitespace-nowrap text-cyan" title={`TSM ${p.tsm?.toFixed(0)}`}>
              ◎ TSM
            </span>
          )}
          {p.in_conservative_hz && (
            <span className="label-eyebrow whitespace-nowrap text-cyan">● IN HZ</span>
          )}
        </span>
      </div>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/[0.03] py-1.5">
      <div className="num text-sm text-text">{value}</div>
      <div className="label-eyebrow mt-0.5 !text-[0.58rem]">{label}</div>
    </div>
  );
}
