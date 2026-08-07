/**
 * Lobby card artwork: a corner of the board with a pawn either side of a
 * wall, which is the whole game in one picture.
 */
export function QuoridorThumb() {
  return (
    <svg className="qd-thumb" viewBox="0 0 5 5" aria-hidden="true">
      <rect x={0} y={0} width={5} height={5} rx={0.4} fill="var(--qd-bg)" />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          {[0, 1, 2].map((j) => (
            <rect
              key={j}
              x={0.5 + i * 1.4}
              y={0.5 + j * 1.4}
              width={1.2}
              height={1.2}
              rx={0.16}
              fill="var(--qd-cell)"
            />
          ))}
        </g>
      ))}
      <circle cx={1.1} cy={3.9} r={0.44} fill="var(--p1)" />
      <circle cx={3.9} cy={1.1} r={0.44} fill="var(--p2)" />
      {/* A wall standing in the groove, two cells long. */}
      <rect x={0.42} y={2.62} width={2.76} height={0.36} rx={0.18} fill="var(--accent)" />
    </svg>
  );
}
