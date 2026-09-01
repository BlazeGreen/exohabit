/**
 * model.ts — TypeScript port of pipeline/physics.py + pipeline/scoring.py.
 *
 * Used by World Lab to recompute a Habitability Potential assessment live as
 * the user changes parameters. It reads the SAME scoring_config.json the Python
 * build uses, so a scenario that matches a real planet's inputs reproduces that
 * planet's score. Keep this in sync with the Python; the shared config file
 * carries the weights so only the shaping curves are duplicated.
 */
import config from "./scoring_config.json";

export const CONFIG = config;

const T_SUN_K = 5772;
const T_BB_1AU_K = 278.5;
const EARTH_DENSITY_GCC = 5.51;
const EARTH_ESCAPE_KMS = 11.19;

// --- physics -----------------------------------------------------------
export function stellarLuminosityLsun(teff: number, rad: number): number {
  return rad ** 2 * (teff / T_SUN_K) ** 4;
}
export function insolationSearth(lumLsun: number, aAu: number): number {
  return lumLsun / aAu ** 2;
}
export function equilibriumTempK(insol: number, bondAlbedo = 0.3): number {
  return T_BB_1AU_K * (1 - bondAlbedo) ** 0.25 * insol ** 0.25;
}
export function densityGcc(massE: number, radiusE: number): number {
  return (EARTH_DENSITY_GCC * massE) / radiusE ** 3;
}
export function escapeVelocityKms(massE: number, radiusE: number): number {
  return EARTH_ESCAPE_KMS * Math.sqrt(massE / radiusE);
}

const HZ_COEFFS: Record<string, number[]> = {
  recent_venus: [1.776, 2.136e-4, 2.533e-8, -1.332e-11, -3.097e-15],
  runaway_greenhouse: [1.107, 1.332e-4, 1.58e-8, -8.308e-12, -1.931e-15],
  maximum_greenhouse: [0.356, 6.171e-5, 1.698e-9, -3.198e-12, -5.575e-16],
  early_mars: [0.32, 5.547e-5, 1.526e-9, -2.874e-12, -5.011e-16],
};

export interface HzFluxBoundaries {
  recent_venus: number;
  runaway_greenhouse: number;
  maximum_greenhouse: number;
  early_mars: number;
  teff_clamped: boolean;
}

export function hzFluxBoundaries(teff: number): HzFluxBoundaries {
  const t = Math.max(2600, Math.min(7200, teff));
  const dt = t - 5780;
  const seff = (coeffs: number[]) => {
    const [s0, a, b, c, d] = coeffs;
    return s0 + a * dt + b * dt ** 2 + c * dt ** 3 + d * dt ** 4;
  };
  return {
    recent_venus: seff(HZ_COEFFS.recent_venus),
    runaway_greenhouse: seff(HZ_COEFFS.runaway_greenhouse),
    maximum_greenhouse: seff(HZ_COEFFS.maximum_greenhouse),
    early_mars: seff(HZ_COEFFS.early_mars),
    teff_clamped: !(teff >= 2600 && teff <= 7200),
  };
}

export function hzPosition(insol: number, teff: number) {
  const fb = hzFluxBoundaries(teff);
  const innerC = fb.runaway_greenhouse;
  const outerC = fb.maximum_greenhouse;
  const innerO = fb.recent_venus;
  const outerO = fb.early_mars;
  const inC = insol >= outerC && insol <= innerC;
  const inO = insol >= outerO && insol <= innerO;
  let frac: number | null = null;
  let zone: string;
  if (inC) {
    frac = (Math.log(innerC) - Math.log(insol)) / (Math.log(innerC) - Math.log(outerC));
    frac = Math.max(0, Math.min(1, frac));
    zone = "conservative";
  } else if (inO && insol > innerC) zone = "optimistic-inner";
  else if (inO && insol < outerC) zone = "optimistic-outer";
  else if (insol > innerO) zone = "too-hot";
  else zone = "too-cold";
  return {
    zone,
    frac,
    in_conservative: inC,
    in_optimistic: inO,
    flux_boundaries_searth: {
      recent_venus: fb.recent_venus,
      runaway_greenhouse: fb.runaway_greenhouse,
      maximum_greenhouse: fb.maximum_greenhouse,
      early_mars: fb.early_mars,
    },
    teff_clamped: fb.teff_clamped,
  };
}

// --- shaping ----------------------------------------------------------
const gauss = (x: number, mu: number, s: number) => Math.exp(-0.5 * ((x - mu) / s) ** 2);
function plateau(x: number, lo: number, hi: number, soft: number) {
  if (x < lo) return gauss(x, lo, soft);
  if (x > hi) return gauss(x, hi, soft);
  return 1;
}
export function band(value: number, table: { min: number; label: string }[]) {
  for (const row of table) if (value >= row.min) return row.label;
  return table[table.length - 1].label;
}

// --- sub-scores -----------------------------------------------------
export function subTemperature(eqT: number) {
  return plateau(eqT, 255, 288, 32);
}
export function subHz(hz: ReturnType<typeof hzPosition>) {
  if (hz.in_conservative) {
    const mid = 1 - Math.abs((hz.frac ?? 0.5) - 0.5);
    return Math.min(1, Math.max(0, 0.85 + 0.15 * (2 * mid - 1)));
  }
  if (hz.in_optimistic) return 0.55;
  if (hz.zone === "too-hot" || hz.zone === "too-cold") return 0.05;
  return 0.25;
}
export function subPlanet(radiusE: number, densityVal: number | null) {
  let sR = plateau(radiusE, 0.8, 1.4, 0.45);
  if (radiusE > 1.8) sR *= gauss(radiusE, 1.8, 0.6);
  if (densityVal == null) return Math.min(1, Math.max(0, sR));
  const sD = plateau(densityVal, 4, 8, 2.5);
  return Math.min(1, Math.max(0, 0.65 * sR + 0.35 * sD));
}
export function subStar(teff: number, ageGyr: number | null) {
  let s = plateau(teff, 4200, 6000, 1400);
  if (teff > 6500) s *= 0.6;
  if (teff < 3200) s *= 0.55;
  if (ageGyr != null && ageGyr < 1) s *= 0.8;
  return Math.min(1, Math.max(0, s));
}
export function subOrbit(ecc: number) {
  return Math.min(1, Math.max(0.05, Math.exp(-((ecc / 0.28) ** 2))));
}

export function viabilityGate(eqT: number, radiusE: number) {
  const ramp = (x: number, fLo: number, fHi: number, zLo: number, zHi: number, floor: number) => {
    if (x >= fLo && x <= fHi) return 1;
    const t = x < fLo ? (x - zLo) / (fLo - zLo) : (zHi - x) / (zHi - fHi);
    return Math.max(floor, Math.min(1, floor + (1 - floor) * t));
  };
  const gT = ramp(eqT, 200, 320, 120, 430, 0.1);
  const gR = ramp(radiusE, 0, 1.6, 0, 3, 0.15);
  const g = Math.max(0.1, Math.min(1, Math.min(gT, gR)));
  const reasons: string[] = [];
  if (gT < 0.9) reasons.push(`equilibrium temperature ${eqT.toFixed(0)} K is outside the 200-320 K liquid-water range`);
  if (gR < 0.9) reasons.push(`radius ${radiusE.toFixed(1)} R⊕ is in the sub-Neptune / gaseous regime`);
  return { value: g, temperature_component: gT, radius_component: gR, reasons };
}

// --- full scenario assessment --------------------------------------
export interface Scenario {
  radiusEarth: number;
  massEarth: number;
  semiMajorAu: number;
  eccentricity: number;
  starTeff: number;
  starRadiusSun: number;
  bondAlbedo: number;
  starAgeGyr?: number | null;
}

export function assessScenario(s: Scenario) {
  const w = CONFIG.weights as Record<string, number>;
  const neutral = CONFIG.neutral_subscore;
  const scale = CONFIG.score_scale;

  const lum = stellarLuminosityLsun(s.starTeff, s.starRadiusSun);
  const insol = insolationSearth(lum, s.semiMajorAu);
  const eqT = equilibriumTempK(insol, s.bondAlbedo);
  const density = densityGcc(s.massEarth, s.radiusEarth);
  const escape = escapeVelocityKms(s.massEarth, s.radiusEarth);
  const hz = hzPosition(insol, s.starTeff);

  const subs: Record<string, number> = {
    temperature_suitability: subTemperature(eqT),
    habitable_zone_position: subHz(hz),
    planet_properties: subPlanet(s.radiusEarth, density),
    stellar_environment: subStar(s.starTeff, s.starAgeGyr ?? null),
    orbital_characteristics: subOrbit(s.eccentricity),
    evidence_completeness: 1, // a fully-specified scenario is "complete" by construction
  };

  const contributions = Object.entries(subs).map(([dimension, subscore]) => ({
    dimension,
    subscore,
    weight: w[dimension],
    contribution: w[dimension] * subscore * scale,
    push: w[dimension] * (subscore - neutral) * scale,
  }));
  contributions.sort((a, b) => b.push - a.push);

  const base = Math.max(0, Math.min(100, contributions.reduce((acc, c) => acc + c.contribution, 0)));
  const gate = viabilityGate(eqT, s.radiusEarth);
  const score = Math.round(base * gate.value * 10) / 10;

  return {
    derived: { luminosityLsun: lum, insolationSearth: insol, eqTempK: eqT, densityGcc: density, escapeVelocityKms: escape },
    hz,
    contributions,
    base_score: Math.round(base * 10) / 10,
    viability_gate: gate,
    score,
    band: band(score, CONFIG.bands.score),
  };
}

// Solar-System + reference anchors for World Lab presets.
export const PRESETS: Record<string, Scenario & { label: string }> = {
  earth: { label: "Earth", radiusEarth: 1, massEarth: 1, semiMajorAu: 1, eccentricity: 0.017, starTeff: 5772, starRadiusSun: 1, bondAlbedo: 0.3, starAgeGyr: 4.6 },
  "trappist-1e": { label: "TRAPPIST-1 e", radiusEarth: 0.92, massEarth: 0.69, semiMajorAu: 0.02925, eccentricity: 0.005, starTeff: 2566, starRadiusSun: 0.1192, bondAlbedo: 0.3, starAgeGyr: 7.6 },
  "kepler-442b": { label: "Kepler-442 b", radiusEarth: 1.34, massEarth: 2.3, semiMajorAu: 0.409, eccentricity: 0.04, starTeff: 4402, starRadiusSun: 0.6, bondAlbedo: 0.3, starAgeGyr: 2.9 },
  mars: { label: "Mars", radiusEarth: 0.532, massEarth: 0.107, semiMajorAu: 1.524, eccentricity: 0.093, starTeff: 5772, starRadiusSun: 1, bondAlbedo: 0.25, starAgeGyr: 4.6 },
};
