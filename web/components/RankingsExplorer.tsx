"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { IndexRow } from "@/lib/types";
import PlanetCard from "./PlanetCard";

type SortKey = "score" | "esi" | "distance" | "recent" | "confidence";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "score", label: "Habitability potential" },
  { key: "esi", label: "Earth similarity" },
  { key: "distance", label: "Nearest" },
  { key: "recent", label: "Recently discovered" },
  { key: "confidence", label: "Confidence" },
];

export default function RankingsExplorer() {
  const params = useSearchParams();
  const [rows, setRows] = useState<IndexRow[] | null>(null);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>((params.get("sort") as SortKey) || "score");
  const [hzOnly, setHzOnly] = useState(false);
  const [earthSized, setEarthSized] = useState(false);
  const [quietStar, setQuietStar] = useState(false);
  const [minConfidence, setMinConfidence] = useState(0);
  const [visible, setVisible] = useState(60);

  useEffect(() => {
    fetch("/data/index.json").then((r) => r.json()).then(setRows).catch(() => setRows([]));
  }, []);

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

    const by = {
      score: (a: IndexRow, b: IndexRow) => b.score - a.score,
      esi: (a: IndexRow, b: IndexRow) => (b.esi ?? -1) - (a.esi ?? -1),
      distance: (a: IndexRow, b: IndexRow) => (a.distance_pc ?? 1e9) - (b.distance_pc ?? 1e9),
      recent: (a: IndexRow, b: IndexRow) => (b.disc_year ?? 0) - (a.disc_year ?? 0),
      confidence: (a: IndexRow, b: IndexRow) => b.confidence - a.confidence,
    }[sort];
    return [...out].sort(by);
  }, [rows, q, sort, hzOnly, earthSized, quietStar, minConfidence]);

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
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-xs text-text-dim">
            Min confidence
            <input type="range" min={0} max={0.9} step={0.05} value={minConfidence} onChange={(e) => setMinConfidence(parseFloat(e.target.value))} />
            <span className="num">{Math.round(minConfidence * 100)}%</span>
          </label>
          <div className="ml-auto flex items-center gap-2">
            <span className="label-eyebrow">Sort</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-1.5 text-xs text-text focus:outline-none"
            >
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <p className="label-eyebrow mt-4">
        {rows === null ? "Loading catalogue…" : `${filtered.length.toLocaleString()} worlds match`}
      </p>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.slice(0, visible).map((p, i) => (
          <PlanetCard key={p.id} p={p} rank={sort === "score" ? i + 1 : undefined} />
        ))}
      </div>

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
