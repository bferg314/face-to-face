/**
 * Lobby card artwork: the six-pointed star, with a marble sitting in two
 * facing points.
 */
export function CcThumb() {
  // A hexagram drawn as two overlapping triangles, points up and down.
  const r = 2.6;
  const point = (deg: number) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return `${(3 + r * Math.cos(a)).toFixed(2)},${(3 + r * Math.sin(a)).toFixed(2)}`;
  };
  const up = [0, 120, 240].map(point).join(' ');
  const down = [60, 180, 300].map(point).join(' ');

  return (
    <svg className="cc-thumb" viewBox="0 0 6 6" aria-hidden="true">
      <polygon points={up} fill="var(--cc-bg)" stroke="var(--cc-hole)" strokeWidth={0.3} strokeLinejoin="round" />
      <polygon points={down} fill="var(--cc-bg)" stroke="var(--cc-hole)" strokeWidth={0.3} strokeLinejoin="round" />
      <circle cx={3} cy={0.75} r={0.5} fill="var(--p2)" />
      <circle cx={3} cy={5.25} r={0.5} fill="var(--p1)" />
      <circle cx={3} cy={3} r={0.42} fill="var(--cc-hole)" />
    </svg>
  );
}
