export function bandKey(band: string): "high" | "moderate" | "low" | "minimal" {
  const b = band.toUpperCase();
  if (b.includes("HIGH")) return "high";
  if (b.includes("MODERATE")) return "moderate";
  if (b.includes("LOW")) return "low";
  return "minimal";
}

export const bandColor: Record<string, string> = {
  high: "var(--band-high)",
  moderate: "var(--band-moderate)",
  low: "var(--band-low)",
  minimal: "var(--band-minimal)",
};

export const bandDim: Record<string, string> = {
  high: "var(--band-high-dim)",
  moderate: "var(--band-moderate-dim)",
  low: "var(--band-low-dim)",
  minimal: "var(--band-minimal-dim)",
};

export function fmt(n: number | null | undefined, digits = 2): string {
  if (n == null || Number.isNaN(n)) return "—";
  if (Math.abs(n) >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return n.toLocaleString(undefined, { maximumFractionDigits: digits });
}

export function fmtPct(n: number | null | undefined): string {
  if (n == null) return "—";
  return `${Math.round(n * 100)}%`;
}

/** 1 parsec = 3.26156 light-years. NASA data is stored in parsecs; the UI
 * shows light-years. Adaptive precision so nearby stars stay distinguishable. */
export const PC_TO_LY = 3.26156;

export function toLy(pc: number | null | undefined): number | null {
  return pc == null || Number.isNaN(pc) ? null : pc * PC_TO_LY;
}

export function fmtLy(pc: number | null | undefined, withUnit = true): string {
  const v = toLy(pc);
  if (v == null) return "—";
  const s =
    v < 100
      ? v.toLocaleString(undefined, { maximumFractionDigits: 1 })
      : v.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return withUnit ? `${s} ly` : s;
}

export const DIMENSION_LABEL: Record<string, string> = {
  temperature_suitability: "Temperature suitability",
  habitable_zone_position: "Habitable-zone position",
  planet_properties: "Planet size / density",
  stellar_environment: "Stellar environment",
  orbital_characteristics: "Orbital characteristics",
  evidence_completeness: "Evidence completeness",
};

export const PROVENANCE_LABEL: Record<string, string> = {
  observed: "OBSERVED",
  derived: "DERIVED",
  modelled: "MODELLED",
  unknown: "UNKNOWN",
};

export const PROVENANCE_COLOR: Record<string, string> = {
  observed: "var(--cyan)",
  derived: "var(--violet)",
  modelled: "var(--amber)",
  unknown: "var(--text-faint)",
};

export function titleCase(s: string | null | undefined): string {
  if (!s) return "—";
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
