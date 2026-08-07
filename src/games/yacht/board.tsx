/** Lobby card artwork: two dice, five and two. */
export function YachtThumb() {
  const pips: Record<number, Array<[number, number]>> = {
    5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]],
    2: [[0, 0], [2, 2]],
  };
  const die = (x: number, y: number, face: number, fill: string) => (
    <g key={`${x}-${y}`}>
      <rect x={x} y={y} width={2.4} height={2.4} rx={0.45} fill={fill} />
      {pips[face].map(([px, py]) => (
        <circle
          key={`${px}${py}`}
          cx={x + 0.55 + px * 0.65}
          cy={y + 0.55 + py * 0.65}
          r={0.24}
          fill="var(--yd-pip)"
        />
      ))}
    </g>
  );
  return (
    <svg className="yd-thumb" viewBox="0 0 6 6" aria-hidden="true">
      <rect x={0} y={0} width={6} height={6} rx={0.6} fill="var(--yd-felt)" />
      {die(0.6, 0.8, 5, 'var(--yd-die)')}
      {die(3.0, 2.8, 2, 'var(--yd-die)')}
    </svg>
  );
}
