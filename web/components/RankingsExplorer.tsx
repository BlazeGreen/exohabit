"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { IndexRow } from "@/lib/types";
import { PC_TO_LY } from "@/lib/format";
import PlanetCard from "./PlanetCard";

type SortKey = "score" | "esi" | "distance" | "recent" | "confidence";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "score", label: "Habitability potential" },
  { key: "esi", label: "Earth similarity" },
  { key: "distance", label: "Nearest" },
  { key: "recent", label: "Recently discovered" },
  { key: "confidence", label: "Confidence" },
];

const STAR_CLASSES = ["F", "G", "K", "M"] as const;
const BANDS = ["HIGH", "MODERATE", "LOW", "MINIMAL"] as const;

type Range = { min: string; max: string };
const EMPTY: Range = { min: "", max: "" };

function inRange(v: number | null, r: Range): boolean {
  if (v == null) return r.min === "" && r.max === "";
  if (r.min !== "" && v < parseFloat(r.min)) return false;
  if (r.max !== "" && v > parseFloat(r.max)) return false;
  return true;
}

export default function RankingsExplorer() {
  const params = useSearchParams();
  const [rows, setRows] = useState<IndexRow[] | null>(null);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>((params.get("sort") as SortKey) || "score");

  const [hzOnly, setHzOnly] = useState(false);
  const [earthSized, setEarthSized] = useState(false);
  const [quietStar, setQuietStar] = useState(false);
  const [measuredMass, setMeasuredMass] = useState(false);

  const [score, setScore] = useState<Range>({ ...EMPTY });
  const [radius, setRadius] = useState<Range>({ ...EMPTY });
  const [temp, setTemp] = useState<Range>({ ...EMPTY });
  const [dist, setDist] = useState<Range>({ ...EMPTY });
  const [year, setYear] = useState<Range>({ ...EMPTY });
  const [starClass, setStarClass] = useState<string>("");
  const [bandSel, setBandSel] = useState<string>("");
  const [minConfidence, setMinConfidence] = useState(0);

  const [visible, setVisible] = useState(60);

  useEffect(() => {
    fetch("/data/index.json").then((r) => r.json()).then(setRows).catch(() => setRows([]));
  }, []);

  const activeCount =
    (hzOnly ? 1 : 0) + (earthSized ? 1 : 0) + (quietStar ? 1 : 0) + (measuredMass ? 1 : 0) +
    [score, radius, temp, dist, year].filter((r) => r.min !== "" || r.max !== "").length +
    (starClass ? 1 : 0) + (bandSel ? 1 : 0) + (minConfidence > 0 ? 1 : 0) + (q.trim() ? 1 : 0);

  function reset() {
    setQ(""); setHzOnly(false); setEarthSized(false); setQuietStar(false); setMeasuredMass(false);
    setScore({ ...EMPTY }); setRadius({ ...EMPTY }); setTemp({ ...EMPTY });
    setDist({ ...EMPTY }); setYear({ ...EMPTY }); setStarClass(""); setBandSel("");
    setMinConfidence(0);
  }

  const filtered = useMemo(() => {
    if (!rows) return [];
    let out = rows.filter((r) => r.confidence >= minConfidence);

    if (q.trim()) {
      const needle = q.toLowerCase();
      out = out.filter((r) => r.name.toLowerCase().includes(needle) || (r.hostname ?? "").toLowerCase().includes(needle));
    }
    if (hzOnly) out = out.filter((r) => r.in_conservative_hz || r.in_optimistic_hz);
    if (earthSized) out = out.filter((r) => r.radius_earth != null && r.radius_earth >= 0.7 && r.radius_earth <= 1.6);
    if (quietStar) out = out.filter((r) => r.st_teff != null && r.st_teff >= 3800 && r.st_teff <= 6200);
    if (measuredMass) out = out.filter((r) => !r.mass_modelled);

    if (score.min !== "" || score.max !== "") out = out.filter((r) => inRange(r.score, score));
    if (radius.min !== "" || radius.max !== "") out = out.filter((r) => inRange(r.radius_earth, radius));
    if (temp.min !== "" || temp.max !== "") out = out.filter((r) => inRange(r.eq_temp_k, temp));
    if (dist.min !== "" || dist.max !== "")
      out = out.filter((r) => inRange(r.distance_pc == null ? null : r.distance_pc * PC_TO_LY, dist));
    if (year.min !== "" || year.max !== "") out = out.filter((r) => inRange(r.disc_year, year));
    if (starClass) out = out.filter((r) => (r.spectype ?? "").trim().toUpperCase().startsWith(starClass));
    if (bandSel) out = out.filter((r) => r.band.toUpperCase().startsWith(bandSel));

    const by = {
      score: (a: IndexRow, b: IndexRow) => b.score - a.score,
      esi: (a: IndexRow, b: IndexRow) => (b.esi ?? -1) - (a.esi ?? -1),
      distance: (a: IndexRow, b: IndexRow) => (a.distance_pc ?? 1e9) - (b.distance_pc ?? 1e9),
      recent: (a: IndexRow, b: IndexRow) => (b.disc_year ?? 0) - (a.disc_year ?? 0),
      confidence: (a: IndexRow, b: IndexRow) => b.confidence - a.confidence,
    }[sort];
    return [...out].sort(by);
  }, [rows, q, sort, hzOnly, earthSized, quietStar, measuredMass, score, radius, temp, dist, year, starClass, bandSel, minConfidence]);

  return (
    <div>
      <div className="panel flex flex-col gap-4 p-5">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter by name or host star…"
          className="w-full rounded-lg bg-white/[0.04] px-3.5 py-2.5 text-sm text-text placeholder:text-text-faint focus:outline-none"
        />

        <div className="flex flex-wrap gap-2">
          <Chip active={earthSized} onClick={() => setEarthSized((v) => !v)} label="Earth-sized (0.7–1.6 R⊕)" />
          <Chip active={hzOnly} onClick={() => setHzOnly((v) => !v)} label="Habitable zone" />
          <Chip active={quietStar} onClick={() => setQuietStar((v) => !v)} label="Stable host star (F/G/K)" />
          <Chip active={measuredMass} onClick={() => setMeasuredMass((v) => !v)} label="Measured mass only" />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <RangeFilter label="Potential" value={score} onChange={setScore} placeholder={["0", "100"]} />
          <RangeFilter label="Radius (R⊕)" value={radius} onChange={setRadius} placeholder={["0", "20"]} />
          <RangeFilter label="Eq. temp (K)" value={temp} onChange={setTemp} placeholder={["0", "3000"]} />
          <RangeFilter label="Distance (ly)" value={dist} onChange={setDist} placeholder={["0", "5000"]} />
          <RangeFilter label="Discovered" value={year} onChange={setYear} placeholder={["1995", "2026"]} />
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <SelectFilter label="Host star" value={starClass} onChange={setStarClass} options={STAR_CLASSES} anyLabel="Any type" />
          <SelectFilter label="Band" value={bandSel} onChange={setBandSel} options={BANDS} anyLabel="Any band" />
          <label className="flex items-center gap-2 text-xs text-text-dim">
            Min confidence
            <input type="range" min={0} max={0.9} step={0.05} value={minConfidence} onChange={(e) => setMinConfidence(parseFloat(e.target.value))} className="accent-[var(--cyan)]" />
            <span className="num w-8">{Math.round(minConfidence * 100)}%</span>
          </label>
          <div className="ml-auto flex items-center gap-2">
            <span className="label-eyebrow">Sort</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-1.5 text-xs text-text focus:outline-none"
            >
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="label-eyebrow">
          {rows === null ? "Loading catalogue…" : `${filtered.length.toLocaleString()} worlds match`}
        </p>
        {activeCount > 0 && (
          <button onClick={reset} className="label-eyebrow text-cyan hover:underline">
            Reset {activeCount} filter{activeCount > 1 ? "s" : ""}
          </button>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.slice(0, visible).map((p, i) => (
          <PlanetCard key={p.id} p={p} rank={sort === "score" ? i + 1 : undefined} />
        ))}
      </div>

      {rows !== null && filtered.length === 0 && (
        <p className="mt-10 text-center text-sm text-text-faint">
          No worlds match these filters. <button onClick={reset} className="text-cyan hover:underline">Reset</button>
        </p>
      )}

      {visible < filtered.length && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => setVisible((v) => v + 60)}
            className="panel px-6 py-2.5 text-sm text-text hover:border-[var(--border-strong)]"
          >
            Load more ({filtered.length - visible} remaining)
          </button>
        </div>
      )}
    </div>
  );
}

function Chip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={
        "rounded-full border px-3 py-1.5 text-xs transition-colors " +
        (active ? "border-cyan/40 bg-[var(--cyan-dim)] text-cyan" : "border-[var(--border)] text-text-dim hover:text-text")
      }
    >
      {label}
    </button>
  );
}

function RangeFilter({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: Range;
  onChange: (r: Range) => void;
  placeholder: [string, string];
}) {
  const base =
    "w-full rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-1.5 text-xs text-text focus:border-cyan/40 focus:outline-none";
  return (
    <div>
      <div className="label-eyebrow mb-1 !text-[0.58rem]">{label}</div>
      <div className="flex items-center gap-1">
        <input
          type="number"
          inputMode="decimal"
          value={value.min}
          placeholder={placeholder[0]}
          onChange={(e) => onChange({ ...value, min: e.target.value })}
          className={base}
        />
        <span className="text-text-faint">–</span>
        <input
          type="number"
          inputMode="decimal"
          value={value.max}
          placeholder={placeholder[1]}
          onChange={(e) => onChange({ ...value, max: e.target.value })}
          className={base}
        />
      </div>
    </div>
  );
}

function SelectFilter({
  label,
  value,
  onChange,
  options,
  anyLabel,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  anyLabel: string;
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-text-dim">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-1.5 text-xs text-text focus:outline-none"
      >
        <option value="">{anyLabel}</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}
