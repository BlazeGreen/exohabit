import { getMeta } from "@/lib/data";
import Disclaimer from "@/components/Disclaimer";
import ProvenanceTag from "@/components/ProvenanceTag";
import { DIMENSION_LABEL } from "@/lib/format";

const FLOW = [
  { k: "Source measurements", d: "Planetary and stellar parameters from the NASA Exoplanet Archive" },
  { k: "Derived quantities", d: "Luminosity, incident flux and equilibrium temperature where not directly published" },
  { k: "Habitable-zone geometry", d: "Kopparapu flux boundaries evaluated for the host star" },
  { k: "Bulk properties & similarity", d: "Density, escape velocity, Earth Similarity Index" },
  { k: "Dimension indicators", d: "Six bounded sub-scores spanning temperature, orbit, planet, star and data quality" },
  { k: "Habitability Potential", d: "Weighted combination, then a physical viability gate" },
  { k: "Confidence", d: "Evidence completeness and measurement precision, reported separately" },
];

export default function MethodologyPage() {
  const meta = getMeta();
  return (
    <div className="mx-auto max-w-4xl px-5 pb-24 pt-12">
      <p className="label-eyebrow mb-2">Methodology</p>
      <h1 className="font-display text-3xl font-semibold text-text">
        How ExoHabit assesses habitability potential
      </h1>
      <p className="mt-3 text-sm text-text-dim">
        ExoHabit turns published planetary and stellar measurements into a single, interpretable
        estimate of how promising a world is for follow-up study. This page documents the data,
        the equations, the scoring function and its assumptions, so that any figure on the site
        can be traced to its origin.
      </p>

      <div className="mt-6">
        <Disclaimer />
      </div>

      <Section title="1 · Data source">
        <p>
          All planetary and stellar parameters come from the{" "}
          <strong className="text-text">NASA Exoplanet Archive</strong>, specifically the{" "}
          <code className="rounded bg-white/5 px-1 py-0.5 text-[0.85em]">pscomppars</code>{" "}
          (Planetary Systems Composite Parameters) table, which provides one row per confirmed
          planet with the archive&rsquo;s best published value for each parameter and its
          1&sigma; uncertainties. The catalogue is retrieved through the archive&rsquo;s TAP
          service. This build covers{" "}
          <span className="num text-text">{meta.n_planets.toLocaleString()}</span> confirmed
          planets &mdash; every one with a measured radius or mass &mdash; and is current as of{" "}
          {new Date(meta.fetched_at).toISOString().slice(0, 10)}.
        </p>
      </Section>

      <Section title="2 · Provenance of every value">
        <p className="mb-3">
          Each quantity shown on a planet page carries one of four provenance labels, so measured
          data is never confused with an estimate:
        </p>
        <div className="flex flex-col gap-2.5">
          <ProvenanceRow p="observed" text="A published measurement, taken directly from the archive." />
          <ProvenanceRow p="derived" text="Computed from observed values through a stated physical equation — for example, equilibrium temperature from incident flux." />
          <ProvenanceRow p="modelled" text="Estimated from a statistical relation rather than measured — for example, mass inferred from radius when no mass is published." />
          <ProvenanceRow p="unknown" text="Not available. Left undefined rather than imputed, and reflected in the planet's evidence-completeness score." />
        </div>
      </Section>

      <Section title="3 · Derived physical quantities">
        <ul className="flex flex-col gap-3">
          <Item label="Stellar luminosity">
            When not published, luminosity is computed from the star&rsquo;s radius and effective
            temperature, L / L<sub>&#9737;</sub> = (R / R<sub>&#9737;</sub>)&sup2; (T<sub>eff</sub>{" "}
            / T<sub>&#9737;</sub>)<sup>4</sup>.
          </Item>
          <Item label="Incident stellar flux">
            The bolometric flux a planet receives, in Earth units:{" "}
            S / S<sub>&oplus;</sub> = (L / L<sub>&#9737;</sub>) / (a / AU)&sup2;, using the
            semi-major axis.
          </Item>
          <Item label="Equilibrium temperature">
            T<sub>eq</sub> = 278.5 K &times; (1 &minus; A<sub>B</sub>)<sup>0.25</sup> &times;
            (S / S<sub>&oplus;</sub>)<sup>0.25</sup>, with Bond albedo A<sub>B</sub> = 0.30. This
            is the temperature a planet radiates at with no atmosphere; it is not a surface
            temperature, and greenhouse warming is not included.
          </Item>
          <Item label="Bulk density and escape velocity">
            Derived from mass and radius for a uniform sphere. Where mass is not measured it is
            estimated from radius using the Chen &amp; Kipping (2017) mass&ndash;radius relation
            and marked as modelled.
          </Item>
          <Item label="Habitable zone">
            Conservative and optimistic zone boundaries are evaluated with the Kopparapu et al.
            (2013, 2014) parameterisation, a polynomial in the host star&rsquo;s effective
            temperature. The conservative zone runs from the runaway-greenhouse limit to the
            maximum-greenhouse limit; the optimistic zone from the recent-Venus limit to the
            early-Mars limit. The parameterisation is defined for host stars between 2,600 K and
            7,200 K.
          </Item>
          <Item label="Earth Similarity Index">
            The Schulze-Makuch et al. (2011) index, a weighted geometric combination of how close
            a planet&rsquo;s radius, density, escape velocity and temperature are to Earth&rsquo;s.
            It is shown for reference only and is not an input to the habitability score;
            similarity to Earth does not imply habitability.
          </Item>
        </ul>
      </Section>

      <Section title="4 · Habitability Potential score">
        <p className="mb-4">
          ExoHabit scores habitability potential with an explicit, physically-motivated function
          rather than a trained classifier. There is no ground-truth catalogue of habitable
          worlds to learn from, so the score is defined directly: a weighted sum of six bounded
          (0&ndash;1) indicators, scaled to 0&ndash;100.
        </p>
        <div className="overflow-hidden rounded-xl border border-[var(--border)]">
          <table className="w-full text-sm">
            <tbody>
              {Object.entries(meta.weights).map(([k, w]) => (
                <tr key={k} className="border-b border-[var(--border)] last:border-0">
                  <td className="px-4 py-2.5 align-top text-text-dim">{DIMENSION_LABEL[k] ?? k}</td>
                  <td className="px-4 py-2.5 align-top text-text-faint">{meta.dimension_docs[k]}</td>
                  <td className="num px-4 py-2.5 text-right align-top text-text">{Math.round(w * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4">
          After the weighted sum, a <strong className="text-text">physical viability gate</strong>{" "}
          scales the score down when a hard constraint is violated &mdash; an equilibrium
          temperature far outside the range where liquid water is plausible, or a radius firmly in
          the volatile-envelope regime &mdash; so that a well-measured but physically hopeless
          world cannot rank highly on the strength of its ancillary data alone. Where the gate is
          active, the planet page shows both the ungated and gated values.
        </p>
        <p className="mt-4">
          The weighting scheme reflects the relative importance ExoHabit places on each factor for
          prioritising follow-up observations. It is a modelling choice, not a settled result, and
          it is applied identically to every planet in the catalogue.
        </p>
      </Section>

      <Section title="5 · Score interpretation">
        <p>
          Because the score is a linear combination of its indicators, it decomposes exactly: each
          dimension&rsquo;s contribution is its weight multiplied by how far its sub-score sits
          above or below the neutral midpoint. The &ldquo;Why this score&rdquo; breakdown on every
          planet page is this decomposition &mdash; the contributions sum to the score with no
          residual.
        </p>
      </Section>

      <Section title="6 · Confidence">
        <p>
          Confidence is reported separately from the score and does not change it. It combines the
          fraction of model inputs that are directly observed rather than modelled or missing
          (weighted most heavily), the precision of those measurements relative to their published
          uncertainties, and a penalty when the host star falls outside the calibrated temperature
          range of the habitable-zone parameterisation. A planet can carry a high potential score
          at low confidence; that combination is shown explicitly.
        </p>
      </Section>

      <Section title="7 · Limitations">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Atmospheric composition is unconstrained for nearly every confirmed exoplanet. Surface
            temperature, greenhouse warming and surface conditions are therefore not modelled;
            equilibrium temperature is used throughout.
          </li>
          <li>
            Where planetary mass is not measured it is estimated from radius. The underlying
            relation has substantial intrinsic scatter, which is flagged but not propagated as an
            error bar.
          </li>
          <li>
            The habitable-zone parameterisation is calibrated for host stars between 2,600 K and
            7,200 K. Beyond that range the boundaries are extrapolated and confidence is reduced.
          </li>
          <li>
            Orbital eccentricity is frequently unavailable and is then treated as near-circular
            for scoring.
          </li>
          <li>
            The scoring weights and shaping functions are a deliberate modelling choice. Different
            reasonable choices produce a different ordering.
          </li>
          <li>
            A planet with no measured radius bypasses the radius component of the viability gate;
            an unmeasured giant can therefore score higher than its likely nature warrants.
          </li>
          <li>
            No output of this system is a claim about the presence or absence of life.
          </li>
        </ul>
      </Section>

      <Section title="From measurement to score">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {FLOW.map((s, i) => (
            <div key={s.k} className="panel p-3">
              <div className="label-eyebrow mb-1">{String(i + 1).padStart(2, "0")}</div>
              <div className="text-xs font-medium text-text">{s.k}</div>
              <div className="mt-1 text-[0.68rem] text-text-faint">{s.d}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="References">
        <ul className="flex flex-col gap-1.5 text-xs text-text-faint">
          <li>NASA Exoplanet Archive, Planetary Systems Composite Parameters table.</li>
          <li>Kopparapu et al. 2013, ApJ 765, 131; 2014, ApJ 787, L29 &mdash; habitable-zone flux boundaries.</li>
          <li>Schulze-Makuch et al. 2011, Astrobiology 11, 1041 &mdash; Earth Similarity Index.</li>
          <li>Chen &amp; Kipping 2017, ApJ 834, 17 &mdash; probabilistic mass&ndash;radius relation.</li>
        </ul>
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

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <li>
      <strong className="text-text">{label}</strong> &mdash; {children}
    </li>
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
