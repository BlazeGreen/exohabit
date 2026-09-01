"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const LINKS = [
  { href: "/", label: "Universe" },
  { href: "/rankings", label: "Find Worlds" },
  { href: "/planner", label: "Planner" },
  { href: "/compare", label: "Compare" },
  { href: "/lab", label: "World Lab" },
  { href: "/methodology", label: "Methodology" },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--bg)]/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5">
        <Link href="/" className="flex items-center gap-2.5 group">
          <span className="relative flex h-6 w-6 items-center justify-center">
            <span className="absolute h-6 w-6 rounded-full border border-cyan/50" />
            <span className="h-1.5 w-1.5 rounded-full bg-cyan shadow-[0_0_10px_var(--cyan)] pulse-slow" />
          </span>
          <span className="font-display text-[1.05rem] font-semibold tracking-tight text-text">
            EXO<span className="text-cyan">HABIT</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1">
          {LINKS.map((l) => {
            const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={clsx(
                  "rounded-full px-3.5 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-[var(--cyan-dim)] text-cyan"
                    : "text-text-dim hover:text-text hover:bg-white/5"
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
