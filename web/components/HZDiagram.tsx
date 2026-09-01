import type { HzPosition } from "@/lib/types";

const W = 640;
const H = 108;
const PAD = 24;

export default function HZDiagram({ hz, insolation, planetName }: { hz: HzPosition; insolation: number | null; planetName: string }) {
  const fb = hz.flux_boundaries_searth;
  const lo = Math.log10(Math.min(fb.early_mars, insolation ?? fb.early_mars) * 0.4);
  const hi = Math.log10(Math.max(fb.recent_venus, insolation ?? fb.recent_venus) * 2.2);
  const x = (s: number) => PAD + ((Math.log10(Math.max(1e-3, s)) - lo) / (hi - lo)) * (W - 2 * PAD);

  const bands = [
    { from: hi, to: Math.log10(fb.recent_venus), color: "var(--red)", label: "TOO HOT" },
    { from: Math.log10(fb.recent_venus), to: Math.log10(fb.runaway_greenhouse), color: "var(--amber)", label: "OPTIMISTIC" },
    { from: Math.log10(fb.runaway_greenhouse), to: Math.log10(fb.maximum_greenhouse), color: "var(--cyan)", label: "CONSERVATIVE HZ" },
    { from: Math.log10(fb.maximum_greenhouse), to: Math.log10(fb.early_mars), color: "var(--amber)", label: "OPTIMISTIC" },
    { from: Math.log10(fb.early_mars), to: lo, color: "var(--violet)", label: "TOO COLD" },
  ];

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: "auto" }}>
        {bands.map((b, i) => {
          const x1 = PAD + ((b.to - lo) / (hi - lo)) * (W - 2 * PAD);
          const x2 = PAD + ((b.from - lo) / (hi - lo)) * (W - 2 * PAD);
          return <rect key={i} x={x1} y={40} width={Math.max(0, x2 - x1)} height={24} fill={b.color} fillOpacity={0.16} />;
        })}
        <line x1={PAD} y1={40} x2={W - PAD} y2={40} stroke="var(--border)" />
        <line x1={PAD} y1={64} x2={W - PAD} y2={64} stroke="var(--border)" />

        {/* Earth reference */}
        <g>
          <line x1={x(1)} y1={34} x2={x(1)} y2={70} stroke="var(--text-faint)" strokeDasharray="2 3" />
          <text x={x(1)} y={26} textAnchor="middle" fontSize="9" fill="var(--text-faint)">
            EARTH
          </text>
        </g>

        {/* planet marker */}
        {insolation != null && (
          <g>
            <circle cx={x(insolation)} cy={52} r={7} fill="var(--bg)" stroke="white" strokeWidth={2} />
            <circle cx={x(insolation)} cy={52} r={3.5} fill="white" />
            <text x={x(insolation)} y={94} textAnchor="middle" fontSize="10" fill="var(--text)" fontWeight={500}>
              {planetName}
            </text>
          </g>
        )}
      </svg>
      <div className="mt-1 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[0.65rem] text-text-faint">
        <Legend color="var(--cyan)" label="Conservative HZ" />
        <Legend color="var(--amber)" label="Optimistic HZ" />
        <Legend color="var(--red)" label="Too hot" />
        <Legend color="var(--violet)" label="Too cold" />
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
