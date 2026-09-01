import { Suspense } from "react";
import { getMeta } from "@/lib/data";
import ObservationPlanner from "@/components/ObservationPlanner";
import Disclaimer from "@/components/Disclaimer";

export default function PlannerPage() {
  const meta = getMeta();
  const hpThreshold = meta.bands.score.find((b) => b.label.includes("HIGH"))?.min ?? 80;

  return (
    <div className="mx-auto max-w-6xl px-5 pb-24 pt-12">
      <p className="label-eyebrow mb-2">Observation planner</p>
      <h1 className="font-display text-3xl font-semibold text-text">Promising vs. reachable</h1>
      <p className="mt-2 max-w-2xl text-sm text-text-dim">
        Habitability potential tells you which worlds matter. The Kempton et al. 2018 transmission
        and emission metrics tell you which of them a telescope like JWST could actually
        characterise. This view puts both on one axis pair — the top-right region is the shortlist.
      </p>
      <div className="mt-6">
        <Disclaimer />
      </div>
      <div className="mt-8">
        <Suspense>
          <ObservationPlanner hpThreshold={hpThreshold} />
        </Suspense>
      </div>
    </div>
  );
}
