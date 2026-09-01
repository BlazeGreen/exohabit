import { bandColor, bandDim, bandKey } from "@/lib/format";

export function BandBadge({ band, size = "md" }: { band: string; size?: "sm" | "md" }) {
  const key = bandKey(band);
  const color = bandColor[key];
  const dim = bandDim[key];
  return (
    <span
      className={
        "label-eyebrow inline-flex items-center rounded-full border font-semibold " +
        (size === "sm" ? "px-2 py-0.5 text-[0.6rem]" : "px-2.5 py-1")
      }
      style={{ color, background: dim, borderColor: `${color}33` }}
    >
      {band}
    </span>
  );
}

export function ConfidencePill({ value, label }: { value: number; label: string }) {
  return (
    <span className="label-eyebrow inline-flex items-center gap-1.5 text-text-dim">
      <span className="relative h-1.5 w-14 overflow-hidden rounded-full bg-white/10">
        <span
          className="absolute inset-y-0 left-0 rounded-full bg-[var(--violet)]"
          style={{ width: `${Math.round(value * 100)}%` }}
        />
      </span>
      CONFIDENCE {Math.round(value * 100)}% · {label}
    </span>
  );
}
