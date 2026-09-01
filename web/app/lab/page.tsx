import { Suspense } from "react";
import WorldLab from "@/components/WorldLab";

export default function LabPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 pb-24 pt-12">
      <p className="label-eyebrow mb-2">World Lab</p>
      <h1 className="font-display text-3xl font-semibold text-text">Design a Hypothetical World</h1>
      <p className="mt-2 max-w-2xl text-sm text-text-dim">
        A model scenario, not an observation. Move any parameter and watch the Habitability
        Potential assessment update instantly, computed by the same physics and scoring engine used
        across the catalogue.
      </p>
      <div className="mt-8">
        <Suspense>
          <WorldLab />
        </Suspense>
      </div>
    </div>
  );
}
