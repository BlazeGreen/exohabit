"use client";
import { useEffect, useMemo, useState } from "react";
import { assessScenario, PRESETS, type Scenario } from "@/lib/model";
import { DIMENSION_LABEL, bandColor, bandKey } from "@/lib/format";
import { BandBadge } from "./BandBadge";
import CountUp from "./CountUp";
import type { Planet } from "@/lib/types";

const DEFAULT: Scenario = PRESETS.earth;

function albedoLabel(a: number) {
  if (a <= 0.15) return "Dark / absorbing";
  if (a <= 0.35) return "Earth-like";
  if (a <= 0.5) return "Bright clouds";
  return "Icy / reflective";
}

export default function WorldLab({ presetPlanetId }: { presetPlanetId?: string }) {
  const [s, setS] = useState<Scenario>(DEFAULT);
  const [presetLabel, setPresetLabel] = useState("Earth");

  useEffect(() => {
    if (!presetPlanetId) return;
    const known = Object.entries(PRESETS).find(([id]) => id === presetPlanetId);
    if (known) {
      setS(known[1]);
      setPresetLabel(known[1].label);
      return;
    }
    fetch(`/data/planets/${presetPlanetId}.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((p: Planet | null) => {
        if (!p) return;
        const f = p.fields;
        setS({
          radiusEarth: f.radius_earth.value ?? 1,
          massEarth: f.mass_earth.value ?? 1,
          semiMajorAu: f.semi_major_au.value ?? 1,
          eccentricity: f.eccentricity.value ?? 0.02,
          starTeff: p.star.teff_k ?? 5772,
          starRadiusSun: p.star.radius_sun ?? 1,
          bondAlbedo: 0.3,
          starAgeGyr: p.star.age_gyr ?? 4.5,
        });
        setPresetLabel(p.name);
      })
      .catch(() => {});
  }, [presetPlanetId]);

  const result = useMemo(() => assessScenario(s), [s]);
  const color = bandColor[bandKey(result.band)];

  function set<K extends keyof Scenario>(key: K, value: Scenario[K]) {
    setS((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px]">
      <div className="flex flex-col gap-6">
        <div className="panel p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="label-eyebrow">Preset scenarios</h2>
            <span className="text-xs text-text-faint">Currently: {presetLabel}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(PRESETS).map(([id, p]) => (
              <button
                key={id}
                onClick={() => {
                  setS(p);
                  setPresetLabel(p.label);
                }}
                className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs text-text-dim hover:border-cyan/40 hover:text-cyan"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <Group title="Planet">
          <Slider label="Radius" value={s.radiusEarth} min={0.3} max={3.5} step={0.01} unit="R⊕" onChange={(v) => set("radiusEarth", v)} />
          <Slider label="Mass" value={s.massEarth} min={0.05} max={10} step={0.01} unit="M⊕" onChange={(v) => set("massEarth", v)} log />
        </Group>

        <Group title="Orbit">
          <Slider label="Distance from star" value={s.semiMajorAu} min={0.005} max={3} step={0.001} unit="AU" onChange={(v) => set("semiMajorAu", v)} log />
          <Slider label="Eccentricity" value={s.eccentricity} min={0} max={0.6} step={0.01} unit="" onChange={(v) => set("eccentricity", v)} />
        </Group>

        <Group title="Host star">
          <Slider label="Effective temperature" value={s.starTeff} min={2500} max={7500} step={10} unit="K" onChange={(v) => set("starTeff", v)} />
          <Slider label="Radius" value={s.starRadiusSun} min={0.1} max={1.8} step={0.01} unit="R☉" onChange={(v) => set("starRadiusSun", v)} />
          <Slider
            label="Stellar activity (age proxy)"
            value={s.starAgeGyr ?? 4.5}
            min={0.05}
            max={10}
            step={0.05}
            unit="Gyr"
            onChange={(v) => set("starAgeGyr", v)}
            invertHint
          />
        </Group>

        <Group title="Atmosphere">
          <Slider
            label={`Atmospheric effect — ${albedoLabel(s.bondAlbedo)}`}
            value={s.bondAlbedo}
            min={0.05}
            max={0.6}
            step={0.01}
            unit=""
            onChange={(v) => set("bondAlbedo", v)}
          />
        </Group>

        <p className="text-xs text-text-faint">
          This is a physics + weighted-scoring <strong className="text-text-dim">simulation</strong>,
          not a real observation. Changing orbital distance changes incident stellar flux in this
          model; changing atmospheric effect changes assumed Bond albedo. No slider here represents
          measured data.
        </p>
      </div>

      {/* Result panel */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <div className="panel p-6 text-center">
          <p className="label-eyebrow mb-3">Habitability potential (simulated)</p>
          <div className="relative mx-auto flex h-40 w-40 items-center justify-center">
            <svg viewBox="0 0 160 160" className="absolute inset-0 -rotate-90">
              <circle cx={80} cy={80} r={70} fill="none" stroke="var(--border)" strokeWidth={10} />
              <circle
                cx={80}
                cy={80}
                r={70}
                fill="none"
                stroke={color}
                strokeWidth={10}
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 70}
                strokeDashoffset={2 * Math.PI * 70 * (1 - result.score / 100)}
                style={{ transition: "stroke-dashoffset 0.4s ease-out, stroke 0.4s ease-out", filter: `drop-shadow(0 0 8px ${color}80)` }}
              />
            </svg>
            <span className="num text-4xl font-semibold text-text">
              <CountUp value={result.score} decimals={1} durationMs={300} />
            </span>
          </div>
          <div className="mt-3 flex justify-center">
            <BandBadge band={result.band} />
          </div>
          {result.viability_gate.value < 0.85 && (
            <p className="mt-3 text-xs text-amber">
              Gated: base {result.base_score.toFixed(1)} → {result.score.toFixed(1)}
            </p>
          )}

          <div className="hairline mt-5 grid grid-cols-2 gap-3 pt-4 text-left">
            <MiniStat label="Insolation" value={`${result.derived.insolationSearth.toFixed(2)} S⊕`} />
            <MiniStat label="Eq. temp" value={`${result.derived.eqTempK.toFixed(0)} K`} />
            <MiniStat label="Density" value={`${result.derived.densityGcc.toFixed(2)} g/cm³`} />
            <MiniStat label="HZ zone" value={result.hz.zone.replace(/-/g, " ")} />
          </div>

          <div className="hairline mt-4 flex flex-col gap-2.5 pt-4 text-left">
            {result.contributions.map((c) => (
              <div key={c.dimension} className="flex items-center justify-between text-xs">
                <span className="text-text-dim">{DIMENSION_LABEL[c.dimension]}</span>
                <span className={`num ${c.push >= 0 ? "text-cyan" : "text-red"}`}>
                  {c.push >= 0 ? "+" : ""}
                  {c.push.toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="panel p-5">
      <h2 className="label-eyebrow mb-4">{title}</h2>
      <div className="flex flex-col gap-5">{children}</div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
  log = false,
  invertHint = false,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
  log?: boolean;
  invertHint?: boolean;
}) {
  const toSlider = (v: number) => (log ? Math.log10(v) : v);
  const fromSlider = (v: number) => (log ? 10 ** v : v);
  const sMin = toSlider(min);
  const sMax = toSlider(max);
  return (
    <label className="block">
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="text-text-dim">{label}</span>
        <span className="num text-text">
          {value < 1 ? value.toFixed(3) : value.toFixed(2)} {unit}
        </span>
      </div>
      <input
        type="range"
        min={sMin}
        max={sMax}
        step={(sMax - sMin) / 400}
        value={toSlider(value)}
        onChange={(e) => onChange(fromSlider(parseFloat(e.target.value)))}
        className="w-full accent-[var(--cyan)]"
      />
      {invertHint && (
        <div className="mt-0.5 flex justify-between text-[0.62rem] text-text-faint">
          <span>younger / more active</span>
          <span>older / quieter</span>
        </div>
      )}
    </label>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="num text-sm capitalize text-text">{value}</div>
      <div className="label-eyebrow mt-0.5 !text-[0.58rem]">{label}</div>
    </div>
  );
}
