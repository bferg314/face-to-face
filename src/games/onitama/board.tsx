import { CARDS } from './cards';
import { SIZE } from './engine';

/** Lobby card artwork: a movement card, which is the game in one picture. */
export function OnitamaThumb() {
  const moves = new Set(CARDS.dragon.moves.map((m) => `${m.dx},${m.dy}`));
  const middle = (SIZE - 1) / 2;
  const pips = [];
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      const dx = col - middle;
      const dy = middle - row;
      const here = dx === 0 && dy === 0;
      pips.push(
        <rect
          key={`${row}-${col}`}
          x={0.55 + col * 1.02}
          y={0.55 + row * 1.02}
          width={0.82}
          height={0.82}
          rx={0.18}
          fill={here ? 'var(--p1)' : moves.has(`${dx},${dy}`) ? 'var(--on-pip)' : 'var(--on-card-bg)'}
        />,
      );
    }
  }
  return (
    <svg className="on-thumb" viewBox="0 0 6 6" aria-hidden="true">
      <rect x={0} y={0} width={6} height={6} rx={0.6} fill="var(--on-card)" />
      {pips}
    </svg>
  );
}
