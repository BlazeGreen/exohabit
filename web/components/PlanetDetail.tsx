"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { IndexRow, Observability, Planet } from "@/lib/types";
import { asset } from "@/lib/asset";
import { fmt, fmtLy } from "@/lib/format";
import ScoreDial from "./ScoreDial";
import { BandBadge, ConfidencePill } from "./BandBadge";
import FieldRow from "./FieldRow";
import ContributionWaterfall from "./ContributionWaterfall";
import HZDiagram from "./HZDiagram";
import SystemView from "./SystemView";
import type { SystemPlanet } from "./SystemView2D";
import Disclaimer from "./Disclaimer";

export default function PlanetDetail({ id }: { id: string }) {
  const [planet, setPlanet] = useState<Planet | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [siblings, setSiblings] = useState<SystemPlanet[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "notfound">("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(asset(`/data/planets/${id}.json`));
        if (!res.ok) {
          if (!cancelled) setStatus("notfound");
          return;
        }
        const p: Planet = await res.json();
        if (cancelled) return;
        setPlanet(p);
        setStatus("ready");

        const idx: IndexRow[] = await fetch(asset("/data/index.json")).then((r) => r.json());
        if (cancelled) return;
        setTotal(idx.length);

        const sibRows = p.hostname ? idx.filter((r) => r.hostname === p.hostname) : [];
        const fulls = await Promise.all(
          sibRows.map((r) =>
            r.id === id
              ? Promise.resolve(p)
              : fetch(asset(`/data/planets/${r.id}.json`)).then((x) => (x.ok ? x.json() : null))
          )
        );
        if (cancelled) return;
        setSiblings(
          sibRows
            .map((r, i) => {
              const full: Planet | null = fulls[i];
              return {
                id: r.id,
                name: r.name,
                semiMajorAu: full?.fields.semi_major_au.value ?? null,
                radiusEarth: full?.fields.radius_earth.value ?? null,
                isTarget: r.id === id,
                inConservativeHz: !!full?.hz_position?.in_conservative,
              };
            })
            .sort((x, y) => (x.semiMajorAu ?? 99) - (y.semiMajorAu ?? 99))
        );
      } catch {
        if (!cancelled) setStatus("notfound");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (status === "loading") {
    return (
      <div className="mx-auto max-w-6xl px-5 py-32 text-center">
        <span className="label-eyebrow animate-pulse">loading world…</span>
      </div>
    );
  }
  if (status === "notfound" || !planet) {
    return (
      <div className="mx-auto max-w-6xl px-5 py-32 text-center">
        <h1 className="font-display text-2xl text-text">World not found</h1>
        <p className="mt-2 text-sm text-text-dim">No planet matches “{id}”.</p>
        <Link href="/rankings" className="mt-4 inline-block text-cyan hover:underline">
          Browse all worlds →
        </Link>
      </div>
    );
  }

  const a = planet.assessment;
  const hzC = planet.hz_bounds_au
    ? ([planet.hz_bounds_au.maximum_greenhouse, planet.hz_bounds_au.runaway_greenhouse] as [number, number])
    : null;
  const hzO = planet.hz_bounds_au
    ? ([planet.hz_bounds_au.early_mars, planet.hz_bounds_au.recent_venus] as [number, number])
    : null;

  return (
    <div className="mx-auto max-w-6xl px-5 pb-24 pt-10">
      <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="label-eyebrow mb-1.5">
            Rank #{a.rank.toLocaleString()} of {total?.toLocaleString() ?? "…"} · orbiting {planet.hostname}
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

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Overview label="Radius" value={planet.fields.radius_earth.value} unit="R⊕" />
        <Overview label="Mass" value={planet.fields.mass_earth.value} unit="M⊕" />
        <Overview label="Distance" display={fmtLy(planet.system.distance_pc)} />
        <Overview label="Discovered" value={planet.discovery.year} unit="" digits={0} isRaw />
      </div>

      <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-2">
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

          <Section title="Observation Feasibility">
            <ObservabilityPanel o={planet.observability} radius={planet.fields.radius_earth.value} />
          </Section>
        </div>
      </div>

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

      {siblings.length > 0 && (
        <Section title={`Planetary System — ${planet.hostname}`} className="mt-8">
          <SystemView
            planets={siblings}
            starName={planet.hostname ?? "Host star"}
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
  display,
}: {
  label: string;
  value?: number | null;
  unit?: string;
  digits?: number;
  isRaw?: boolean;
  display?: string;
}) {
  const body = display ?? (value == null ? "—" : isRaw ? String(value) : fmt(value, digits));
  return (
    <div className="panel px-4 py-3 text-center">
      <div className="num text-lg text-text">
        {body}
        {unit && display == null && value != null && (
          <span className="text-xs text-text-faint"> {unit}</span>
        )}
      </div>
      <div className="label-eyebrow mt-1">{label}</div>
    </div>
  );
}

const TIER_COLOR: Record<string, string> = {
  strong: "var(--cyan)",
  marginal: "var(--amber)",
  weak: "var(--text-faint)",
};

function TierBadge({ tier }: { tier: "strong" | "marginal" | "weak" | null }) {
  if (!tier) return null;
  const c = TIER_COLOR[tier];
  return (
    <span
      className="label-eyebrow rounded-full border px-2 py-0.5"
      style={{ color: c, borderColor: `${c}40`, background: `${c}14` }}
    >
      {tier}
    </span>
  );
}

function ObservabilityPanel({ o, radius }: { o: Observability; radius: number | null }) {
  if (!o.transiting || o.tsm == null) {
    return (
      <div className="text-sm text-text-dim">
        <p className="mb-2">
          {o.transiting
            ? "This planet transits, but a transmission-spectroscopy metric could not be estimated."
            : "This planet does not transit its star, so transmission and emission spectroscopy do not apply."}
        </p>
        {o.notes.map((n, i) => (
          <p key={i} className="text-xs text-text-faint">
            — {n}
          </p>
        ))}
      </div>
    );
  }
  return (
    <div>
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="num text-3xl text-text">{fmt(o.tsm, o.tsm < 100 ? 1 : 0)}</span>
            <TierBadge tier={o.tsm_tier} />
          </div>
          <div className="label-eyebrow mt-1">TSM · transmission</div>
        </div>
        {o.esm != null && (
          <div>
            <div className="flex items-baseline gap-2">
              <span className="num text-2xl text-text-dim">{fmt(o.esm, o.esm < 100 ? 1 : 0)}</span>
              <TierBadge tier={o.esm_tier} />
            </div>
            <div className="label-eyebrow mt-1">ESM · emission</div>
          </div>
        )}
      </div>

      <p className="mt-3 text-xs text-text-faint">
        Kempton et al. 2018 metrics for JWST atmospheric follow-up. &ldquo;Strong&rdquo; means above
        the recommended threshold for a{" "}
        {radius != null && radius < 1.5 ? "terrestrial" : "planet of this size"} target (TSM ≳{" "}
        {o.tsm_threshold}). Only meaningful for transiting planets.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MiniFact label="Transit depth" value={o.transit_depth_ppm != null ? `${fmt(o.transit_depth_ppm, 0)} ppm` : "—"} />
        <MiniFact label="Transit dur." value={o.transit_duration_hr != null ? `${fmt(o.transit_duration_hr, 1)} h` : "—"} />
        <MiniFact label="Host J-mag" value={o.st_jmag != null ? fmt(o.st_jmag, 1) : "—"} />
        <MiniFact label="Host K-mag" value={o.st_kmag != null ? fmt(o.st_kmag, 1) : "—"} />
      </div>

      <p className="mt-3 text-xs text-text-faint">
        TSM assumes a cloud-free, low-molecular-weight (H/He-dominated) atmosphere. An Earth-like
        N₂/CO₂ atmosphere would give a signal roughly an order of magnitude smaller — treat TSM as a
        ranking within a planet class, not a guarantee.
      </p>
    </div>
  );
}

function MiniFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/[0.03] px-2 py-1.5 text-center">
      <div className="num text-sm text-text">{value}</div>
      <div className="label-eyebrow mt-0.5 !text-[0.56rem]">{label}</div>
    </div>
  );
}
