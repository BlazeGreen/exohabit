// Shapes emitted by pipeline/build.py. Kept deliberately close to the JSON.

export type Provenance = "observed" | "derived" | "modelled" | "unknown";

export interface Field {
  value: number | null;
  provenance: Provenance;
  unit: string;
  err: number | null;
  note: string;
}

export interface Contribution {
  dimension: string;
  subscore: number;
  weight: number;
  contribution: number; // absolute points added
  push: number; // +/- vs a neutral planet
  imputed: boolean;
  basis: Record<string, unknown>;
}

export interface ViabilityGate {
  value: number;
  temperature_component: number;
  radius_component: number;
  reasons: string[];
}

export interface Confidence {
  value: number;
  label: "LOW" | "MEDIUM" | "HIGH";
  inputs: { evidence: number; precision: number; teff_extrapolated: boolean };
}

export interface EsiDetail {
  esi: number;
  components: Record<string, number>;
  n_terms: number;
  used_terms: string[];
}

export interface Assessment {
  model_version: string;
  score: number;
  base_score: number;
  viability_gate: ViabilityGate;
  band: string;
  confidence: Confidence;
  earth_similarity_index: number | null;
  esi_detail: EsiDetail | null;
  contributions: Contribution[];
  imputed_dimensions: string[];
  limitations: string[];
  rank: number;
}

export interface HzPosition {
  zone: string;
  frac: number | null;
  in_conservative: boolean;
  in_optimistic: boolean;
  flux_boundaries_searth: Record<string, number>;
  teff_clamped: boolean;
}

export interface Planet {
  id: string;
  name: string;
  hostname: string | null;
  system: { n_planets: number | null; n_stars: number | null; distance_pc: number | null };
  discovery: { year: number | null; method: string | null; controversial: boolean };
  coords: { ra: number | null; dec: number | null };
  star: {
    spectype: string | null;
    teff_k: number | null;
    radius_sun: number | null;
    mass_sun: number | null;
    luminosity_lsun: number | null;
    metallicity_dex: number | null;
    age_gyr: number | null;
  };
  fields: Record<string, Field>;
  hz_bounds_au: Record<string, number> | null;
  hz_position: HzPosition | null;
  assessment: Assessment;
}

export interface IndexRow {
  id: string;
  name: string;
  hostname: string | null;
  score: number;
  band: string;
  confidence: number;
  confidence_label: string;
  rank: number;
  esi: number | null;
  radius_earth: number | null;
  mass_earth: number | null;
  eq_temp_k: number | null;
  insolation_searth: number | null;
  distance_pc: number | null;
  st_teff: number | null;
  spectype: string | null;
  disc_year: number | null;
  in_conservative_hz: boolean;
  in_optimistic_hz: boolean;
  mass_modelled: boolean;
}

export interface Meta {
  generated_at: string;
  ingest_mode: string;
  source: string;
  fetched_at: string;
  n_planets: number;
  n_skipped: number;
  model_version: string;
  weights: Record<string, number>;
  assumptions: Record<string, unknown>;
  bands: { score: { min: number; label: string }[]; confidence: { min: number; label: string }[] };
  dimension_docs: Record<string, string>;
  build_seconds: number;
}
