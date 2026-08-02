import type { CSSProperties } from 'react';
import type { PlayerId } from './engine';

/**
 * A player's mark: a cross for player 1, a ring for player 2, stroked in that
 * player's colour so the board matches the panel swatches.
 *
 * Both glyphs are unchanged by a 180° rotation, so unlike Mancala's seed
 * counts nothing here needs un-rotating for the far player in the
 * across-the-table layout.
 *
 * Lives in its own file so the game registry can draw a lobby thumbnail
 * without importing the whole game screen.
 */
export function Mark({ player, className }: { player: PlayerId; className?: string }) {
  const vars = { '--pc': `var(--p${player})` } as CSSProperties;
  return (
    <svg
      viewBox="0 0 24 24"
      className={`ut-mark p${player}${className ? ` ${className}` : ''}`}
      style={vars}
      aria-hidden="true"
    >
      {player === 1 ? (
        <>
          <line x1="5.5" y1="5.5" x2="18.5" y2="18.5" />
          <line x1="18.5" y1="5.5" x2="5.5" y2="18.5" />
        </>
      ) : (
        <circle cx="12" cy="12" r="6.75" fill="none" />
      )}
    </svg>
  );
}
