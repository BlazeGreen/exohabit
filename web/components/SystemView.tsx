"use client";
import { Component, type ReactNode } from "react";
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

/** Renders the 3D system view; if WebGL / the 3D renderer fails for any reason,
 *  falls back to the 2D SVG diagram so the section never breaks. */
export default function SystemView(props: SystemViewProps) {
  return (
    <WebGLBoundary
      fallback={
        <SystemView2D
          planets={props.planets}
          starName={props.starName}
          starTeff={props.starTeff}
          starRadiusSun={props.starRadiusSun}
          hzConservativeAu={props.hzConservativeAu}
          hzOptimisticAu={props.hzOptimisticAu}
        />
      }
    >
      <SystemView3D {...props} />
    </WebGLBoundary>
  );
}

class WebGLBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
