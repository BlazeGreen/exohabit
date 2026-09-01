"use client";
import { useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars, Html } from "@react-three/drei";
import { useRouter } from "next/navigation";
import * as THREE from "three";
import type { SystemPlanet } from "./SystemView2D";

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

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const a = phase + clock.elapsedTime * speed;
    ref.current.position.set(Math.cos(a) * orbitR, 0, Math.sin(a) * orbitR);
  });

  return (
    <>
      {/* orbit path */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[orbitR - 0.015, orbitR + 0.015, 128]} />
        <meshBasicMaterial
          color={planet.isTarget ? "#35e2d0" : "#3b4560"}
          transparent
          opacity={planet.isTarget ? 0.7 : 0.45}
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
    </>
  );
}
