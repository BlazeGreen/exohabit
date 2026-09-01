"use client";
import { useEffect, useRef } from "react";

/** Fixed, cheap canvas starfield: a few hundred points, slow parallax drift.
 * Deliberately not Three.js — this is ambient chrome behind every page, the
 * 3D budget is reserved for the planetary system view. */
export default function Starfield() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    type Star = { x: number; y: number; r: number; baseAlpha: number; phase: number; speed: number; layer: number };
    let stars: Star[] = [];

    function resize() {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      const count = Math.round((w * h) / 3800);
      stars = Array.from({ length: count }, () => {
        const layer = Math.random();
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          r: 0.4 + layer * 1.1,
          baseAlpha: 0.25 + layer * 0.55,
          phase: Math.random() * Math.PI * 2,
          speed: 0.4 + Math.random() * 0.8,
          layer,
        };
      });
    }

    let t = 0;
    function draw() {
      t += 0.008;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.clearRect(0, 0, w, h);
      const grad = ctx!.createRadialGradient(w * 0.7, h * 0.15, 0, w * 0.7, h * 0.15, Math.max(w, h) * 0.9);
      grad.addColorStop(0, "rgba(53,226,208,0.05)");
      grad.addColorStop(1, "rgba(5,7,13,0)");
      ctx!.fillStyle = grad;
      ctx!.fillRect(0, 0, w, h);

      for (const s of stars) {
        const twinkle = 0.6 + 0.4 * Math.sin(t * s.speed + s.phase);
        ctx!.globalAlpha = s.baseAlpha * twinkle;
        ctx!.fillStyle = s.layer > 0.85 ? "#bfe9ff" : "#e8edf7";
        const drift = t * s.layer * 6;
        const y = (((s.y - drift) % (h + 20)) + (h + 20)) % (h + 20);
        ctx!.beginPath();
        ctx!.arc(s.x, y - 10, s.r, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    }

    resize();
    draw();
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas id="starfield-canvas" ref={ref} aria-hidden="true" />;
}
