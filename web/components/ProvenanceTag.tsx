import { PROVENANCE_COLOR, PROVENANCE_LABEL } from "@/lib/format";
import type { Provenance } from "@/lib/types";

export default function ProvenanceTag({ provenance }: { provenance: Provenance }) {
  const color = PROVENANCE_COLOR[provenance];
  return (
    <span
      className="label-eyebrow inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5"
      style={{ color, borderColor: `${color}40`, background: `${color}14` }}
    >
      <span className="h-1 w-1 rounded-full" style={{ background: color }} />
      {PROVENANCE_LABEL[provenance]}
    </span>
  );
}
