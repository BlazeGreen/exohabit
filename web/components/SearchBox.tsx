"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { IndexRow } from "@/lib/types";
import { asset } from "@/lib/asset";
import { BandBadge } from "./BandBadge";

export default function SearchBox({ placeholder = "Search known worlds… e.g. TRAPPIST-1 e" }: { placeholder?: string }) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<IndexRow[] | null>(null);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    fetch(asset("/data/index.json"))
      .then((r) => r.json())
      .then(setRows)
      .catch(() => setRows([]));
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const matches = useMemo(() => {
    if (!rows || q.trim().length < 1) return [];
    const needle = q.trim().toLowerCase();
    return rows
      .filter((r) => r.name.toLowerCase().includes(needle) || (r.hostname ?? "").toLowerCase().includes(needle))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }, [rows, q]);

  return (
    <div ref={boxRef} className="relative mx-auto w-full max-w-xl">
      <div className="panel flex items-center gap-3 px-4 py-3">
        <span className="text-text-faint">⌕</span>
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && matches[0]) router.push(`/planets/${matches[0].id}`);
          }}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm text-text placeholder:text-text-faint focus:outline-none"
        />
        {rows === null && <span className="label-eyebrow animate-pulse">loading…</span>}
      </div>
      {open && matches.length > 0 && (
        <div className="panel-solid absolute z-50 mt-2 w-full overflow-hidden py-1.5">
          {matches.map((m) => (
            <button
              key={m.id}
              onClick={() => router.push(`/planets/${m.id}`)}
              className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-white/5"
            >
              <span>
                <span className="block text-sm text-text">{m.name}</span>
                <span className="block text-xs text-text-faint">{m.hostname}</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="num text-sm text-text-dim">{m.score.toFixed(0)}</span>
                <BandBadge band={m.band} size="sm" />
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
