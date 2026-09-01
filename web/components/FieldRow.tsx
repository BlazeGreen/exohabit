import type { Field } from "@/lib/types";
import { fmt } from "@/lib/format";
import ProvenanceTag from "./ProvenanceTag";

export default function FieldRow({ label, field, digits = 2 }: { label: string; field: Field; digits?: number }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span className="text-sm text-text-dim">{label}</span>
      <div className="flex items-center gap-2.5">
        <span className="num text-sm text-text">
          {field.value == null ? (
            <span className="text-text-faint">unknown</span>
          ) : (
            <>
              {fmt(field.value, digits)}
              {field.err != null && <span className="text-text-faint"> ±{fmt(field.err, digits)}</span>}
              {field.unit && <span className="text-text-faint"> {field.unit}</span>}
            </>
          )}
        </span>
        <ProvenanceTag provenance={field.provenance} />
      </div>
    </div>
  );
}
