import Link from "next/link";
import { notFound } from "next/navigation";
import { getIndex, getPlanet, getStaticPlanetIds } from "@/lib/data";
import ScoreDial from "@/components/ScoreDial";
import { BandBadge, ConfidencePill } from "@/components/BandBadge";
import FieldRow from "@/components/FieldRow";
import ContributionWaterfall from "@/components/ContributionWaterfall";
import HZDiagram from "@/components/HZDiagram";
import SystemView2D, { type SystemPlanet } from "@/components/SystemView2D";
import Disclaimer from "@/components/Disclaimer";
import { fmt } from "@/lib/format";

export const dynamicParams = true;

export function generateStaticParams() {
  return getStaticPlanetIds(300).map((id) => ({ id }));
}

export default async function PlanetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const planet = getPlanet(id);
  if (!planet) notFound();

  const a = planet.assessment;
  const siblingRows = planet.hostname ? getIndex().filter((p) => p.hostname === planet.hostname) : [];
  const systemPlanets: SystemPlanet[] = siblingRows
    .map((row) => {
      const full = row.id === planet.id ? planet : getPlanet(row.id);
      return {
        id: row.id,
        name: row.name,
        semiMajorAu: full?.fields.semi_major_au.value ?? null,
        radiusEarth: full?.fields.radius_earth.value ?? null,
        isTarget: row.id === planet.id,
        inConservativeHz: !!full?.hz_position?.in_conservative,
      };
    })
    .sort((x, y) => (x.semiMajorAu ?? 99) - (y.semiMajorAu ?? 99));

  const hzC = planet.hz_bounds_au
    ? ([planet.hz_bounds_au.maximum_greenhouse, planet.hz_bounds_au.runaway_greenhouse] as [number, number])
    : null;
  const hzO = planet.hz_bounds_au
    ? ([planet.hz_bounds_au.early_mars, planet.hz_bounds_au.recent_venus] as [number, number])
    : null;

  return (
    <div className="mx-auto max-w-6xl px-5 pb-24 pt-10">
      {/* Header */}
      <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="label-eyebrow mb-1.5">
            Rank #{a.rank.toLocaleString()} of {getIndex().length.toLocaleString()} · orbiting{" "}
            {planet.hostname}
          </p>
          <h1 className="font-display text-4xl font-semibold text-text">{planet.name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <BandBadge band={a.band} />
            <ConfidencePill value={a.confidence.value} label={a.confidence.label} />
            {planet.discovery.controversial && (
              <span className="label-eyebrow text-amber">⚠ disputed detection</span>
            )}
          </div>
        </div>
        <ScoreDial score={a.score} band={a.band} size="lg" />
      </div>

      {a.viability_gate.value < 0.85 && (
        <div className="panel-warn mt-6 px-4 py-3 text-sm text-text-dim">
          <strong className="text-amber">Viability gate applied</strong> — base potential{" "}
          {a.base_score} reduced to <strong className="text-text">{a.score}</strong> because{" "}
          {a.viability_gate.reasons.join("; ")}.
        </div>
      )}

      <div className="mt-6">
        <Disclaimer compact />
      </div>

      {/* Overview stats */}
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Overview label="Radius" value={planet.fields.radius_earth.value} unit="R⊕" />
        <Overview label="Mass" value={planet.fields.mass_earth.value} unit="M⊕" />
        <Overview label="Distance" value={planet.system.distance_pc} unit="pc" digits={0} />
        <Overview label="Discovered" value={planet.discovery.year} unit="" digits={0} isRaw />
      </div>

      <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Left: properties */}
        <div className="flex flex-col gap-6">
          <Section title="Physical Properties">
            <FieldRow label="Radius" field={planet.fields.radius_earth} />
            <FieldRow label="Mass" field={planet.fields.mass_earth} />
            <FieldRow label="Bulk density" field={planet.fields.density_gcc} />
            <FieldRow label="Escape velocity" field={planet.fields.escape_velocity_kms} />
          </Section>
          <Section title="Orbit">
            <FieldRow label="Semi-major axis" field={planet.fields.semi_major_au} digits={4} />
            <FieldRow label="Orbital period" field={planet.fields.period_days} digits={2} />
            <FieldRow label="Eccentricity" field={planet.fields.eccentricity} digits={3} />
            <FieldRow label="Insolation" field={planet.fields.insolation_searth} />
            <FieldRow label="Equilibrium temp" field={planet.fields.eq_temp_k} digits={0} />
          </Section>
          <Section title="Host Star">
            <div className="flex items-center justify-between py-2.5">
              <span className="text-sm text-text-dim">Spectral type</span>
              <span className="num text-sm text-text">{planet.star.spectype ?? "—"}</span>
            </div>
            <FieldRow label="Effective temperature" field={planet.fields.st_teff} digits={0} />
            <FieldRow label="Radius" field={planet.fields.st_rad} />
            <FieldRow label="Mass" field={planet.fields.st_mass} />
            <FieldRow label="Luminosity" field={planet.fields.st_lum} digits={4} />
            <FieldRow label="Age" field={planet.fields.st_age_gyr} digits={1} />
          </Section>
        </div>

        {/* Right: assessment */}
        <div className="flex flex-col gap-6">
          <Section title="Why This Score?">
            <ContributionWaterfall contributions={a.contributions} />
          </Section>
          <Section title="Habitable Zone">
            {planet.hz_position && (
              <HZDiagram hz={planet.hz_position} insolation={planet.fields.insolation_searth.value} planetName={planet.name} />
            )}
          </Section>
          <Section title="Earth Similarity Index">
            {a.esi_detail ? (
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="num text-3xl text-text">{(a.earth_similarity_index! * 100).toFixed(0)}</span>
                  <span className="text-sm text-text-faint">/ 100 · Schulze-Makuch et al. 2011</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {Object.entries(a.esi_detail.components).map(([k, v]) => (
                    <div key={k} className="rounded-lg bg-white/[0.03] px-2 py-1.5 text-center">
                      <div className="num text-sm text-text">{(v * 100).toFixed(0)}</div>
                      <div className="label-eyebrow mt-0.5 !text-[0.56rem] capitalize">{k.replace(/_/g, " ")}</div>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-xs text-text-faint">Similarity does not imply habitability.</p>
              </div>
            ) : (
              <p className="text-sm text-text-faint">Insufficient data to compute ESI.</p>
            )}
          </Section>
        </div>
      </div>

      {/* Evidence / unknowns */}
      <Section title="Evidence — What We Don't Know" className="mt-8">
        <ul className="flex flex-col gap-2.5">
          {a.limitations.map((l, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-text-dim">
              <span className="mt-0.5 shrink-0 text-amber">⚠</span>
              {l}
            </li>
          ))}
        </ul>
      </Section>

      {/* System */}
      {systemPlanets.length > 0 && (
        <Section title={`Planetary System — ${planet.hostname}`} className="mt-8">
          <SystemView2D
            planets={systemPlanets}
            starTeff={planet.star.teff_k}
            starRadiusSun={planet.star.radius_sun}
            hzConservativeAu={hzC}
            hzOptimisticAu={hzO}
          />
        </Section>
      )}

      <div className="mt-10 flex flex-wrap gap-3">
        <Link href={`/compare?a=${planet.id}`} className="panel px-5 py-2.5 text-sm text-text hover:border-[var(--border-strong)]">
          Add to Compare
        </Link>
        <Link href={`/lab?preset=${planet.id}`} className="panel px-5 py-2.5 text-sm text-cyan hover:border-cyan/40">
          Open in World Lab →
        </Link>
      </div>
    </div>
  );
}

function Section({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`panel p-5 ${className}`}>
      <h2 className="label-eyebrow mb-3">{title}</h2>
      {children}
    </div>
  );
}

function Overview({
  label,
  value,
  unit,
  digits = 2,
  isRaw = false,
}: {
  label: string;
  value: number | null;
  unit: string;
  digits?: number;
  isRaw?: boolean;
}) {
  return (
    <div className="panel px-4 py-3 text-center">
      <div className="num text-lg text-text">
        {value == null ? "—" : isRaw ? value : fmt(value, digits)}
        {unit && <span className="text-xs text-text-faint"> {unit}</span>}
      </div>
      <div className="label-eyebrow mt-1">{label}</div>
    </div>
  );
}
