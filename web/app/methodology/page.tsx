import { getMeta } from "@/lib/data";
import Disclaimer from "@/components/Disclaimer";
import ProvenanceTag from "@/components/ProvenanceTag";
import { DIMENSION_LABEL } from "@/lib/format";

const STAGES = [
  { k: "NASA Exoplanet Archive", d: "pscomppars table, TAP/ADQL, one row per confirmed planet" },
  { k: "Ingestion", d: "HTTP fetch with retries; bundled snapshot if unreachable" },
  { k: "Validation", d: "type coercion, NaN/inf rejection, per-row isolation" },
  { k: "Normalization", d: "units, de-logging luminosity, provenance tagging" },
  { k: "Feature engineering", d: "Kopparapu HZ, T_eq, density, escape velocity, ESI" },
  { k: "Habitability model", d: "weighted physics score + viability gate + confidence" },
  { k: "Static JSON build", d: "index.json + per-planet files, committed to the repo" },
  { k: "Frontend", d: "Next.js reads at build time; World Lab recomputes live in-browser" },
];

export default function MethodologyPage() {
  const meta = getMeta();
  return (
    <div className="mx-auto max-w-4xl px-5 pb-24 pt-12">
      <p className="label-eyebrow mb-2">Methodology</p>
      <h1 className="font-display text-3xl font-semibold text-text">How ExoHabit Actually Works</h1>
      <p className="mt-3 text-sm text-text-dim">
        Judges should be able to challenge every number on this site. This page explains exactly
        where each one comes from, what assumptions it rests on, and where it should not be
        trusted.
      </p>

      <div className="mt-6">
        <Disclaimer />
      </div>

      <Section title="1 · Data source">
        <p>
          Every planet on ExoHabit comes from the{" "}
          <strong className="text-text">NASA Exoplanet Archive</strong>'s{" "}
          <code className="rounded bg-white/5 px-1 py-0.5 text-[0.85em]">pscomppars</code>{" "}
          (Planetary Systems Composite Parameters) table, pulled live via the TAP/ADQL sync
          endpoint at build time. Each row is the archive's best available published value for
          that parameter, already reconciled across papers. Current build:{" "}
          <span className="num text-text">{meta.n_planets.toLocaleString()} planets</span>,
          mode <span className="text-cyan">{meta.ingest_mode}</span>, fetched{" "}
          {new Date(meta.fetched_at).toUTCString()}. If the live archive is unreachable, the build
          falls back to a bundled snapshot of ~30 well-studied planets covering the same schema, so
          the app never breaks — that fallback is always labelled in the build metadata, never
          silently swapped in.
        </p>
      </Section>

      <Section title="2 · Data processing">
        <p>
          A Python pipeline (<code className="rounded bg-white/5 px-1 py-0.5 text-[0.85em]">pipeline/</code>{" "}
          in the repo) ingests, validates and normalizes every row independently — one malformed
          record is logged and skipped, never fatal to the build ({meta.n_skipped} skipped this
          run). Output is committed static JSON: a slim index for list/search views, and one file
          per planet for detail pages. There is no runtime database or backend service — the
          "pipeline" is a build step, which is a deliberate scalability choice: the whole catalogue
          ships as CDN-cached static data with nothing to keep alive.
        </p>
      </Section>

      <Section title="3 · Provenance — what's real vs. estimated">
        <p className="mb-3">Every value on this site is tagged with one of four provenance levels:</p>
        <div className="flex flex-col gap-2.5">
          <ProvenanceRow p="observed" text="Taken directly from the archive — a published measurement." />
          <ProvenanceRow p="derived" text="Computed from observed values via a stated physical equation (e.g. equilibrium temperature from insolation)." />
          <ProvenanceRow p="modelled" text="Estimated from a statistical relation, not a direct measurement (e.g. mass from radius when no mass is published)." />
          <ProvenanceRow p="unknown" text="Not available. Never invented — propagated as null and it costs the planet evidence-completeness score." />
        </div>
      </Section>

      <Section title="4 · Physics calculations">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-text">Habitable zone</strong> — Kopparapu et al. (2013, 2014)
            flux-boundary parameterization as a function of stellar effective temperature
            (conservative: runaway greenhouse → maximum greenhouse; optimistic: recent Venus →
            early Mars).
          </li>
          <li>
            <strong className="text-text">Equilibrium temperature</strong> — T_eq = 278.5 K ×
            (1 − A_B)^0.25 × (S/S⊕)^0.25, Bond albedo A_B = 0.30 (Earth-like) unless overridden in
            World Lab. This is a no-greenhouse blackbody estimate, not a surface temperature.
          </li>
          <li>
            <strong className="text-text">Density / escape velocity</strong> — from mass and radius
            under a uniform-sphere assumption; mass is modelled from radius (Chen &amp; Kipping
            2017, approximate median relation) when unmeasured.
          </li>
          <li>
            <strong className="text-text">Earth Similarity Index</strong> — Schulze-Makuch et al.
            (2011), geometric mean of radius/density/escape-velocity/temperature similarity to
            Earth. High ESI does <strong className="text-text">not</strong> imply habitability.
          </li>
        </ul>
      </Section>

      <Section title="5 · Habitability Potential model">
        <p className="mb-4">
          We deliberately did <strong className="text-text">not</strong> train a model to predict
          "habitability" — no labelled dataset of confirmed-habitable exoplanets exists, and
          building one from a self-defined proxy target and then explaining it with SHAP would
          create a black box that looks rigorous while explaining a label we invented ourselves.
          Instead, Habitability Potential is a transparent weighted sum of six bounded (0–1)
          sub-scores:
        </p>
        <div className="overflow-hidden rounded-xl border border-[var(--border)]">
          <table className="w-full text-sm">
            <tbody>
              {Object.entries(meta.weights).map(([k, w]) => (
                <tr key={k} className="border-b border-[var(--border)] last:border-0">
                  <td className="px-4 py-2.5 text-text-dim">{DIMENSION_LABEL[k] ?? k}</td>
                  <td className="px-4 py-2.5 text-text-faint">{meta.dimension_docs[k]}</td>
                  <td className="num px-4 py-2.5 text-right text-text">{Math.round(w * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4">
          A <strong className="text-text">physical viability gate</strong> is applied after the
          weighted sum: extreme equilibrium temperature or a clearly gaseous radius scales the
          score down regardless of how well-measured the planet is, because no amount of good
          ancillary data makes a 2,000 K lava world a habitability target. None of these weights
          are established science — they are an explicit, editable editorial choice (
          <code className="rounded bg-white/5 px-1 py-0.5 text-[0.8em]">pipeline/scoring_config.json</code>
          ), stated in full rather than hidden inside a trained model.
        </p>
      </Section>

      <Section title="6 · Explainability">
        <p>
          Because the model is linear in its sub-scores, the "Why This Score?" breakdown on every
          planet page is not an approximation of a black box (as a SHAP explanation of a trained
          model would be) — it <strong className="text-text">is</strong> the model. Each dimension's
          contribution is exactly weight × (sub-score − 0.5) × 100, so the bars sum to the score.
        </p>
      </Section>

      <Section title="7 · Confidence">
        <p>
          Reported separately from the score. Confidence blends evidence completeness (60%),
          measurement precision from the archive's own error bars (30%), and a penalty if the host
          star's temperature fell outside the Kopparapu calibration range and had to be
          extrapolated (10%). A planet can have a high potential score and low confidence —
          that combination is flagged, not hidden.
        </p>
      </Section>

      <Section title="8 · Known limitations">
        <ul className="list-disc space-y-2 pl-5">
          <li>Atmospheric composition is unknown for essentially every exoplanet here — surface greenhouse warming is not modelled.</li>
          <li>Equilibrium temperature is a no-atmosphere blackbody estimate, not a measured surface temperature.</li>
          <li>Mass is modelled from radius for planets with no direct mass measurement, using an approximate published relation with real scatter.</li>
          <li>The Kopparapu habitable-zone parameterization is only calibrated for 2,600–7,200 K host stars; outside that range the boundaries are extrapolated and confidence is penalized accordingly.</li>
          <li>Scoring weights are an editorial choice, not a scientific consensus — see the config file linked above.</li>
          <li>Nothing here is a claim about the presence or absence of life.</li>
        </ul>
      </Section>

      <Section title="Pipeline">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {STAGES.map((s, i) => (
            <div key={s.k} className="panel p-3">
              <div className="label-eyebrow mb-1">{String(i + 1).padStart(2, "0")}</div>
              <div className="text-xs font-medium text-text">{s.k}</div>
              <div className="mt-1 text-[0.68rem] text-text-faint">{s.d}</div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-lg font-medium text-text">{title}</h2>
      <div className="mt-3 text-sm leading-relaxed text-text-dim">{children}</div>
    </section>
  );
}

function ProvenanceRow({ p, text }: { p: "observed" | "derived" | "modelled" | "unknown"; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <ProvenanceTag provenance={p} />
      <span className="text-sm text-text-dim">{text}</span>
    </div>
  );
}
