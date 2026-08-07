/** Lobby card artwork: a corner of the grid with a disc of each colour in it. */
export function C4Thumb() {
  const holes = [0, 1, 2].flatMap((c) => [0, 1, 2].map((r) => ({ r, c })));
  return (
    <svg className="c4-thumb" viewBox="0 0 6 6" aria-hidden="true">
      <rect x={0} y={0} width={6} height={6} rx={0.6} fill="var(--c4-bg)" />
      {holes.map(({ r, c }) => (
        <circle
          key={`${r}${c}`}
          cx={1.2 + c * 1.8}
          cy={1.2 + r * 1.8}
          r={0.68}
          fill={
            r === 2 && c === 0
              ? 'var(--p1)'
              : r === 2 && c === 1
                ? 'var(--p2)'
                : // Lighter than the real board's holes: at this size a dark
                  // disc on a dark hole is just a smudge.
                  'color-mix(in srgb, var(--c4-hole) 45%, var(--c4-bg))'
          }
        />
      ))}
    </svg>
  );
}
