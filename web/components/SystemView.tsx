"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import SystemView2D, { type SystemPlanet } from "./SystemView2D";

const SystemView3D = dynamic(() => import("./SystemView3D"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[440px] items-center justify-center rounded-xl border border-[var(--border)] bg-[#03040a]">
      <span className="label-eyebrow animate-pulse">rendering system…</span>
    </div>
  ),
});

export interface SystemViewProps {
  planets: SystemPlanet[];
  starName: string;
  starTeff: number | null;
  starRadiusSun: number | null;
  hzConservativeAu: [number, number] | null;
  hzOptimisticAu: [number, number] | null;
}

/** 2D SVG diagram by default (fast, reliable). An opt-in 3D WebGL view is
 *  available via the toggle. */
export default function SystemView(props: SystemViewProps) {
  const [mode, setMode] = useState<"2d" | "3d">("2d");
  return (
    <div>
      <div className="mb-3 flex justify-end">
        <div className="inline-flex overflow-hidden rounded-full border border-[var(--border)] text-xs">
          {(["2d", "3d"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={
                "px-3 py-1 transition-colors " +
                (mode === m ? "bg-[var(--cyan-dim)] text-cyan" : "text-text-faint hover:text-text")
              }
            >
              {m === "2d" ? "2D" : "3D"}
            </button>
          ))}
        </div>
      </div>
      {mode === "3d" ? (
        <SystemView3D {...props} />
      ) : (
        <SystemView2D
          planets={props.planets}
          starName={props.starName}
          starTeff={props.starTeff}
          starRadiusSun={props.starRadiusSun}
          hzConservativeAu={props.hzConservativeAu}
          hzOptimisticAu={props.hzOptimisticAu}
        />
      )}
    </div>
  );
}
