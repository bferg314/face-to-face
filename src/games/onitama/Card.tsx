import type { CSSProperties } from 'react';
import { CARDS, type CardId } from './cards';
import { SIZE, type PlayerId } from './engine';

/**
 * A card, drawn the way the real ones are: a five by five grid with the piece
 * in the middle and a pip on every square it may move to.
 *
 * `flip` turns the pattern through 180°. A card always has to read in the
 * direction its owner's pieces actually travel on screen — and since GameShell
 * already rotates the far seat's whole panel, the card only needs flipping
 * when the owner's panel is *not* rotated: player 2 sitting side by side.
 */
export function Card({
  card,
  owner,
  flip = false,
  state,
  onClick,
}: {
  card: CardId;
  /** Whose card this is, or null for the spare beside the board. */
  owner: PlayerId | null;
  flip?: boolean;
  /** `armed` is the card being played this turn; `next` marks the spare. */
  state?: 'armed' | 'idle' | 'next';
  onClick?: () => void;
}) {
  const moves = new Set(CARDS[card].moves.map((m) => `${m.dx},${m.dy}`));
  const middle = (SIZE - 1) / 2;

  const squares = [];
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      const dx = col - middle;
      const dy = middle - row;
      const cls = ['on-pip'];
      if (dx === 0 && dy === 0) cls.push('here');
      else if (moves.has(`${dx},${dy}`)) cls.push('go');
      squares.push(<span key={`${row}-${col}`} className={cls.join(' ')} />);
    }
  }

  const cls = ['on-card'];
  if (state) cls.push(state);
  if (flip) cls.push('flipped');
  if (onClick) cls.push('pickable');

  return (
    <button
      type="button"
      className={cls.join(' ')}
      style={
        owner
          ? ({ '--pc': `var(--p${owner})`, '--pe': `var(--p${owner}-edge)` } as CSSProperties)
          : undefined
      }
      onClick={onClick}
      disabled={!onClick}
    >
      <span className="on-grid">{squares}</span>
      <small>{CARDS[card].name}</small>
    </button>
  );
}
