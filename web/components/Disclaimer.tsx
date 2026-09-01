export default function Disclaimer({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className="label-eyebrow flex items-start gap-2 text-[0.66rem] leading-relaxed text-text-faint">
        <span className="text-amber">⚠</span>
        Model-based habitability <em className="not-italic text-text-dim">potential</em> — not a
        measurement of life, and not proof a world is habitable.
      </p>
    );
  }
  return (
    <div className="panel-warn flex items-start gap-3 px-4 py-3.5">
      <span className="mt-0.5 text-amber">⚠</span>
      <p className="text-[0.83rem] leading-relaxed text-text-dim">
        <strong className="text-text">This assessment estimates habitability potential</strong> from
        currently available planetary and stellar observations. It is{" "}
        <strong className="text-text">not</strong> a measurement of life, and{" "}
        <strong className="text-text">not</strong> proof that a planet is habitable. Critical
        properties — atmospheric composition, surface conditions, geology — remain unknown for
        every exoplanet on this list.
      </p>
    </div>
  );
}
