import Link from "next/link";
import { getIndex, getMeta } from "@/lib/data";
import SearchBox from "@/components/SearchBox";
import HeroScatter from "@/components/HeroScatter";
import PlanetCard from "@/components/PlanetCard";
import Disclaimer from "@/components/Disclaimer";
import CountUp from "@/components/CountUp";

export default function HomePage() {
  const index = getIndex();
  const meta = getMeta();

  const promising = [...index].sort((a, b) => b.score - a.score).slice(0, 6);
  const earthlike = [...index]
    .filter((p) => p.esi != null)
    .sort((a, b) => (b.esi ?? 0) - (a.esi ?? 0))
    .slice(0, 6);
  const nearby = [...index]
    .filter((p) => p.distance_pc != null && p.score >= 40)
    .sort((a, b) => (a.distance_pc ?? 1e9) - (b.distance_pc ?? 1e9))
    .slice(0, 6);
  const recent = [...index]
    .filter((p) => p.disc_year != null && p.score >= 45)
    .sort((a, b) => (b.disc_year ?? 0) - (a.disc_year ?? 0))
    .slice(0, 6);

  const highCount = index.filter((p) => p.score >= 75).length;

  return (
    <div className="mx-auto max-w-7xl px-5 pb-24 pt-16">
      {/* Hero */}
      <section className="mx-auto max-w-3xl text-center">
        <p className="label-eyebrow mb-4">Exoplanet habitability assessment</p>
        <h1 className="font-display text-5xl font-semibold tracking-tight text-text sm:text-6xl">
          EXO<span className="text-cyan">HABIT</span>
        </h1>
        <p className="mt-5 text-lg text-text-dim">Explore the worlds beyond our Solar System.</p>
        <p className="mx-auto mt-2 max-w-xl text-sm text-text-faint">
          An explainable system for assessing exoplanet habitability{" "}
          <em className="not-italic text-text-dim">potential</em> — built on real NASA Exoplanet
          Archive data, transparent physics, and honest uncertainty.
        </p>
        <div className="mt-8">
          <SearchBox />
        </div>
        <div className="mt-8 flex justify-center gap-8">
          <StatBlock value={meta.n_planets} label="Known worlds" />
          <StatBlock value={highCount} label="High potential" />
          <div className="text-center">
            <div className="num text-2xl font-medium text-text">HP-{meta.model_version.split("-")[1]}</div>
            <div className="label-eyebrow mt-1">Model version</div>
          </div>
        </div>
      </section>

      {/* Universe scatter */}
      <section className="mt-16">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-sm font-medium tracking-wide text-text-dim">
            THE CATALOGUE — radius vs. equilibrium temperature
          </h2>
          <Link href="/rankings" className="text-xs text-cyan hover:underline">
            Explore all {meta.n_planets.toLocaleString()} worlds →
          </Link>
        </div>
        <HeroScatter />
      </section>

      <section className="mt-6">
        <Disclaimer />
      </section>

      <Row title="Promising candidates" href="/rankings?sort=score" rows={promising} />
      <Row title="Most Earth-like (by ESI)" href="/rankings?sort=esi" rows={earthlike} />
      <Row title="Nearby worlds worth a look" href="/rankings?sort=distance" rows={nearby} />
      <Row title="Recently discovered" href="/rankings?sort=recent" rows={recent} />
    </div>
  );
}

function StatBlock({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <div className="num text-2xl font-medium text-text">
        <CountUp value={value} decimals={0} />
      </div>
      <div className="label-eyebrow mt-1">{label}</div>
    </div>
  );
}

function Row({ title, href, rows }: { title: string; href: string; rows: ReturnType<typeof getIndex> }) {
  if (rows.length === 0) return null;
  return (
    <section className="mt-14">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg font-medium text-text">{title}</h2>
        <Link href={href} className="text-xs text-cyan hover:underline">
          See all →
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((p) => (
          <PlanetCard key={p.id} p={p} />
        ))}
      </div>
    </section>
  );
}
