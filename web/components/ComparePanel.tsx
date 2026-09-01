"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { IndexRow, Planet } from "@/lib/types";
import { asset } from "@/lib/asset";
import { fmt } from "@/lib/format";
import { BandBadge } from "./BandBadge";

const SLOT_COLORS = ["var(--cyan)", "var(--violet)", "var(--amber)"];

const METRICS: { key: string; label: string; unit: string; digits: number; get: (p: Planet) => number | null }[] = [
  { key: "radius", label: "Radius", unit: "R⊕", digits: 2, get: (p) => p.fields.radius_earth.value },
  { key: "mass", label: "Mass", unit: "M⊕", digits: 2, get: (p) => p.fields.mass_earth.value },
  { key: "density", label: "Density", unit: "g/cm³", digits: 2, get: (p) => p.fields.density_gcc.value },
  { key: "flux", label: "Stellar flux", unit: "S⊕", digits: 2, get: (p) => p.fields.insolation_searth.value },
  { key: "temp", label: "Equilibrium temp", unit: "K", digits: 0, get: (p) => p.fields.eq_temp_k.value },
  { key: "period", label: "Orbital period", unit: "days", digits: 1, get: (p) => p.fields.period_days.value },
  { key: "esi", label: "Earth Similarity", unit: "", digits: 2, get: (p) => p.assessment.earth_similarity_index },
  { key: "score", label: "Habitability potential", unit: "/100", digits: 1, get: (p) => p.assessment.score },
];

export default function ComparePanel() {
  const params = useSearchParams();
  const initialIds = [params.get("a"), params.get("b"), params.get("c")];
  const [index, setIndex] = useState<IndexRow[] | null>(null);
  const [slots, setSlots] = useState<(string | null)[]>([initialIds[0] ?? null, initialIds[1] ?? null, initialIds[2] ?? null]);
  const [planets, setPlanets] = useState<Record<string, Planet>>({});
  const [queries, setQueries] = useState(["", "", ""]);

  useEffect(() => {
    fetch(asset("/data/index.json")).then((r) => r.json()).then(setIndex).catch(() => setIndex([]));
  }, []);

  useEffect(() => {
    slots.forEach((id) => {
      if (id && !planets[id]) {
        fetch(asset(`/data/planets/${id}.json`))
          .then((r) => r.json())
          .then((p: Planet) => setPlanets((prev) => ({ ...prev, [id]: p })));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots]);

  const active = slots.map((id) => (id ? planets[id] : null)).filter(Boolean) as Planet[];

  const maxByMetric = useMemo(() => {
    const out: Record<string, number> = {};
    for (const m of METRICS) {
      out[m.key] = Math.max(1e-9, ...active.map((p) => Math.abs(m.get(p) ?? 0)));
    }
    return out;
  }, [active]);

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {slots.map((id, i) => {
          const matches =
            index && queries[i].trim().length > 0
              ? index.filter((r) => r.name.toLowerCase().includes(queries[i].toLowerCase())).slice(0, 6)
              : [];
          return (
            <div key={i} className="panel p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: SLOT_COLORS[i] }} />
                <span className="label-eyebrow">World {i + 1}</span>
              </div>
              {id && planets[id] ? (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-display text-sm font-medium text-text">{planets[id].name}</div>
                    <div className="text-xs text-text-faint">{planets[id].hostname}</div>
                  </div>
                  <button
                    className="text-xs text-text-faint hover:text-red"
                    onClick={() => setSlots((s) => s.map((x, xi) => (xi === i ? null : x)))}
                  >
                    remove
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    value={queries[i]}
                    onChange={(e) => setQueries((q) => q.map((x, xi) => (xi === i ? e.target.value : x)))}
                    placeholder="Search a world…"
                    className="w-full rounded-lg bg-white/[0.04] px-3 py-2 text-sm text-text placeholder:text-text-faint focus:outline-none"
                  />
                  {matches.length > 0 && (
                    <div className="panel-solid absolute z-20 mt-1 w-full py-1">
                      {matches.map((m) => (
                        <button
                          key={m.id}
                          className="block w-full px-3 py-1.5 text-left text-sm text-text-dim hover:bg-white/5 hover:text-text"
                          onClick={() => {
                            setSlots((s) => s.map((x, xi) => (xi === i ? m.id : x)));
                            setQueries((q) => q.map((x, xi) => (xi === i ? "" : x)));
                          }}
                        >
                          {m.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {active.length >= 2 ? (
        <div className="panel mt-6 p-5">
          <div className="mb-4 flex items-center gap-5">
            {active.map((p, i) => (
              <div key={p.id} className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: SLOT_COLORS[i] }} />
                <span className="text-sm text-text">{p.name}</span>
                <BandBadge band={p.assessment.band} size="sm" />
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-5">
            {METRICS.map((m) => (
              <div key={m.key}>
                <div className="mb-1.5 text-xs text-text-dim">{m.label}</div>
                <div className="flex flex-col gap-1.5">
                  {active.map((p, i) => {
                    const v = m.get(p);
                    const w = v == null ? 0 : (Math.abs(v) / maxByMetric[m.key]) * 100;
                    return (
                      <div key={p.id} className="flex items-center gap-2">
                        <div className="h-2 flex-1 rounded-full bg-white/[0.05]">
                          <div className="h-2 rounded-full" style={{ width: `${w}%`, background: SLOT_COLORS[i] }} />
                        </div>
                        <span className="num w-24 shrink-0 text-right text-xs text-text-dim">
                          {v == null ? "—" : `${fmt(v, m.digits)} ${m.unit}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-text-faint">
            Similarity does not imply habitability — a world can resemble Earth on some axes and
            still lack the conditions that make Earth habitable.
          </p>
        </div>
      ) : (
        <p className="label-eyebrow mt-8 text-center">Pick at least two worlds to compare.</p>
      )}
    </div>
  );
}
