import { Suspense } from "react";
import RankingsExplorer from "@/components/RankingsExplorer";
import Disclaimer from "@/components/Disclaimer";

export default function RankingsPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 pb-24 pt-12">
      <p className="label-eyebrow mb-2">Find worlds</p>
      <h1 className="font-display text-3xl font-semibold text-text">Rankings &amp; Candidate Search</h1>
      <p className="mt-2 max-w-2xl text-sm text-text-dim">
        Every confirmed exoplanet with a measured radius or mass, ranked by model-derived
        Habitability Potential. Filter by physical plausibility, then open any world for the full
        breakdown.
      </p>
      <div className="mt-6">
        <Disclaimer />
      </div>
      <div className="mt-8">
        <Suspense>
          <RankingsExplorer />
        </Suspense>
      </div>
    </div>
  );
}
