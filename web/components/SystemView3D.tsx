"use client";
import { useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars, Html } from "@react-three/drei";
import { useRouter } from "next/navigation";
import * as THREE from "three";
import type { SystemPlanet } from "./SystemView2D";

/** Deterministic 0–1 hash from a string, so each orbit's shape is stable
 *  across renders (not jittering) but varies planet to planet. */
function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

function starColor(teff: number | null): string {
  if (teff == null) return "#fff6e0";
  if (teff >= 10000) return "#9db4ff";
  if (teff >= 7500) return "#c9d9ff";
  if (teff >= 6000) return "#fff4e8";
  if (teff >= 5200) return "#ffe9b3";
  if (teff >= 3700) return "#ffbf7a";
  return "#ff8a65";
}

const R_MIN = 2.4;
const R_MAX = 15;

export interface SystemView3DProps {
  planets: SystemPlanet[];
  starName: string;
  starTeff: number | null;
  starRadiusSun: number | null;
  hzConservativeAu: [number, number] | null;
  hzOptimisticAu: [number, number] | null;
}

export default function SystemView3D(props: SystemView3DProps) {
  return (
    <div className="relative">
      <div className="h-[440px] w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[#03040a]">
        <Canvas camera={{ position: [0, 11, 20], fov: 45 }} dpr={[1, 2]}>
          <Scene {...props} />
        </Canvas>
      </div>
      <p className="mt-2 text-center text-[0.65rem] text-text-faint">
        Illustrative — orbital distances are on a logarithmic scale for readability, not to true
        astronomical scale. Drag to orbit, scroll to zoom.
      </p>
    </div>
  );
}

function Scene({
  planets,
  starName,
  starTeff,
  starRadiusSun,
  hzConservativeAu,
  hzOptimisticAu,
}: SystemView3DProps) {
  const withOrbit = useMemo(
    () => planets.filter((p) => p.semiMajorAu != null && p.semiMajorAu > 0),
    [planets]
  );

  const rScale = useMemo(() => {
    const as = withOrbit.map((p) => p.semiMajorAu!);
    const hzMax = hzOptimisticAu?.[1] ?? hzConservativeAu?.[1] ?? 1;
    const maxA = Math.max(0.05, ...as, hzMax * 1.15);
    const minA = Math.min(...as.filter((a) => a > 0), maxA / 40);
    const lo = Math.log10(Math.max(minA, maxA / 200));
    const hi = Math.log10(maxA);
    return (a: number) => {
      const t = (Math.log10(Math.max(a, maxA / 200)) - lo) / (hi - lo || 1);
      return R_MIN + Math.max(0, Math.min(1, t)) * (R_MAX - R_MIN);
    };
  }, [withOrbit, hzConservativeAu, hzOptimisticAu]);

  const color = starColor(starTeff);
  const starR = 0.55 + Math.min(1.1, (starRadiusSun ?? 1) * 0.6);

  return (
    <>
      <ambientLight intensity={0.25} />
      <pointLight position={[0, 0, 0]} intensity={140} distance={80} decay={2} color={color} />
      <Stars radius={120} depth={60} count={2500} factor={3} saturation={0} fade speed={0.4} />

      {/* Star */}
      <mesh>
        <sphereGeometry args={[starR, 32, 32]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh scale={2.1}>
        <sphereGeometry args={[starR, 24, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0.12} />
      </mesh>
      <Html position={[0, -starR - 0.9, 0]} center distanceFactor={26} pointerEvents="none">
        <div className="whitespace-nowrap rounded-full border border-[var(--border-strong)] bg-[var(--bg-elevated)]/90 px-2 py-0.5 text-[11px] font-medium text-text">
          ★ {starName}
        </div>
      </Html>

      {/* Habitable zone bands (flat rings on the ecliptic) */}
      {hzOptimisticAu && (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[rScale(hzOptimisticAu[1]), rScale(hzOptimisticAu[0]), 96]} />
          <meshBasicMaterial color="#f5a623" transparent opacity={0.1} side={THREE.DoubleSide} />
        </mesh>
      )}
      {hzConservativeAu && (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[rScale(hzConservativeAu[1]), rScale(hzConservativeAu[0]), 96]} />
          <meshBasicMaterial color="#35e2d0" transparent opacity={0.16} side={THREE.DoubleSide} />
        </mesh>
      )}

      {withOrbit.map((p, i) => (
        <Planet key={p.id} planet={p} orbitR={rScale(p.semiMajorAu!)} phase={(i / withOrbit.length) * Math.PI * 2} />
      ))}

      <OrbitControls
        enablePan={false}
        minDistance={6}
        maxDistance={45}
        maxPolarAngle={Math.PI / 2.05}
        enableDamping
        dampingFactor={0.08}
        autoRotate
        autoRotateSpeed={0.35}
      />
    </>
  );
}

function Planet({ planet, orbitR, phase }: { planet: SystemPlanet; orbitR: number; phase: number }) {
  const ref = useRef<THREE.Group>(null);
  const [hover, setHover] = useState(false);
  const router = useRouter();

  const speed = 0.25 / Math.sqrt(orbitR); // faster nearer the star, roughly Keplerian
  const pr = 0.12 + Math.min(0.42, (planet.radiusEarth ?? 1) * 0.12);
  const dotColor = planet.isTarget ? "#ffffff" : planet.inConservativeHz ? "#35e2d0" : "#9aa7c2";

  // Cosmetic elliptical orbit — not physically derived. Each orbit gets a
  // stable per-planet eccentricity, major-axis orientation and slight tilt so
  // the system doesn't read as a stack of perfect coplanar circles.
  const ecc = 0.05 + hash01(planet.id) * 0.24;
  const tilt = (hash01(planet.id + "~i") - 0.5) * 0.34;
  const spin = hash01(planet.id + "~r") * Math.PI * 2;
  const A = orbitR;
  const B = orbitR * Math.sqrt(1 - ecc * ecc);
  const focus = A * ecc; // shift so the star sits near a focus

  const squash = B / A; // non-uniform scale turns the circular ring into an ellipse

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = phase + clock.elapsedTime * speed;
    // circle of radius A in local space; the parent group squashes Z and
    // offsets by the focus, so the visible path is an ellipse with the star
    // near one focus
    ref.current.position.set(A * Math.cos(t), 0, A * Math.sin(t));
  });

  return (
    <group rotation={[0, spin, 0]}>
      <group rotation={[tilt, 0, 0]} scale={[1, 1, squash]} position={[-focus, 0, 0]}>
        {/* orbit path — circular ring, squashed to an ellipse by the parent scale */}
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[A - 0.02, A + 0.02, 160]} />
          <meshBasicMaterial
            color={planet.isTarget ? "#35e2d0" : "#3b4560"}
            transparent
            opacity={planet.isTarget ? 0.8 : 0.5}
            side={THREE.DoubleSide}
          />
        </mesh>

        <group ref={ref}>
        <mesh
          onPointerOver={(e) => {
            e.stopPropagation();
            setHover(true);
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            setHover(false);
            document.body.style.cursor = "";
          }}
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/planets/${planet.id}`);
          }}
        >
          <sphereGeometry args={[pr, 24, 24]} />
          <meshStandardMaterial
            color={dotColor}
            emissive={dotColor}
            emissiveIntensity={planet.isTarget ? 0.5 : hover ? 0.4 : 0.15}
            roughness={0.6}
          />
        </mesh>
        {planet.isTarget && (
          <mesh scale={1.9}>
            <sphereGeometry args={[pr, 16, 16]} />
            <meshBasicMaterial color="#35e2d0" transparent opacity={0.18} />
          </mesh>
        )}
        <Html position={[0, pr + 0.5, 0]} center distanceFactor={24} pointerEvents="none">
          <div
            className={
              "whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] " +
              (planet.isTarget || hover
                ? "bg-[var(--bg-elevated)]/90 text-text"
                : "text-text-faint")
            }
          >
            {planet.name.replace(/^.*\s/, "")}
          </div>
        </Html>
        </group>
      </group>
    </group>
  );
}
