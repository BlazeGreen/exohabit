import { Suspense } from "react";
import ComparePanel from "@/components/ComparePanel";

export default function ComparePage() {
  return (
    <div className="mx-auto max-w-5xl px-5 pb-24 pt-12">
      <p className="label-eyebrow mb-2">Compare</p>
      <h1 className="font-display text-3xl font-semibold text-text">World Comparison</h1>
      <p className="mt-2 max-w-2xl text-sm text-text-dim">
        Compare up to three worlds side by side across physical, orbital and model-derived
        properties.
      </p>
      <div className="mt-8">
        <Suspense>
          <ComparePanel />
        </Suspense>
      </div>
    </div>
  );
}
