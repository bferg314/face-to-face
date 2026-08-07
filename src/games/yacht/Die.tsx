import type { CSSProperties } from 'react';

/** Where the pips sit on each face, as cells of a 3 × 3 grid. */
const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

/**
 * One die. Pips read from any angle, so the tray needs no orientation
 * handling at all — the only thing in the collection that is free of it.
 */
export function Die({
  face,
  held = false,
  rolled = 0,
  onClick,
}: {
  face: number;
  held?: boolean;
  /** Bumped each roll, so the tumble animation replays. */
  rolled?: number;
  onClick?: () => void;
}) {
  const pips = new Set(PIPS[face] ?? []);
  return (
    <button
      type="button"
      className={`yd-die${held ? ' held' : ''}${onClick ? ' pickable' : ''}`}
      style={{ '--roll': rolled } as CSSProperties}
      onClick={onClick}
      disabled={!onClick}
      aria-label={`${face}${held ? ', kept' : ''}`}
    >
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className={pips.has(i) ? 'yd-pip on' : 'yd-pip'} />
      ))}
    </button>
  );
}
