import { POINTS } from './engine';

/**
 * The board's line work, drawn from the engine's point table so the geometry
 * is stated in exactly one place. The viewBox is the 0-6 lattice the points
 * are given in, so a stroke width here is in lattice units and scales with
 * however big the board is drawn.
 */

/** Where a lattice coordinate sits as a percentage across the board. */
export const pct = (v: number) => `${(v / 6) * 100}%`;

/** The side midpoints, seats 1, 3, 5 and 7 of each ring — the spoke ends. */
const SPOKE_SEATS = [1, 3, 5, 7];

function MorrisLines({ width }: { width: number }) {
  return (
    <>
      {[0, 1, 2].map((ring) => {
        const topLeft = POINTS[ring * 8];
        const bottomRight = POINTS[ring * 8 + 4];
        return (
          <rect
            key={ring}
            x={topLeft.x}
            y={topLeft.y}
            width={bottomRight.x - topLeft.x}
            height={bottomRight.y - topLeft.y}
            fill="none"
            strokeWidth={width}
          />
        );
      })}
      {SPOKE_SEATS.map((seat) => (
        <line
          key={seat}
          x1={POINTS[seat].x}
          y1={POINTS[seat].y}
          x2={POINTS[16 + seat].x}
          y2={POINTS[16 + seat].y}
          strokeWidth={width}
        />
      ))}
    </>
  );
}

/** The playing surface's lines. The men are DOM elements laid over this. */
export function MorrisBoardLines() {
  return (
    <svg className="mm-lines" viewBox="0 0 6 6" aria-hidden="true">
      <MorrisLines width={0.07} />
    </svg>
  );
}

/** Lobby card artwork: the board, with a man of each colour on it. */
export function MorrisThumb() {
  return (
    <svg className="mm-thumb" viewBox="-1 -1 8 8" aria-hidden="true">
      {/* The board itself, so the men read against it the way they do in play. */}
      <rect x={-1} y={-1} width={8} height={8} rx={0.7} fill="var(--mm-bg)" />
      <MorrisLines width={0.24} />
      <circle cx={POINTS[0].x} cy={POINTS[0].y} r={0.95} fill="var(--p1)" />
      <circle cx={POINTS[4].x} cy={POINTS[4].y} r={0.95} fill="var(--p2)" />
      <circle cx={POINTS[17].x} cy={POINTS[17].y} r={0.95} fill="var(--p1)" />
    </svg>
  );
}
