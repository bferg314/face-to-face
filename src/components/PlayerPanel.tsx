import type { CSSProperties, ReactNode } from 'react';

/**
 * Shared player panel: colour swatch, name, status line, and a trailing slot.
 *
 * Each game keeps its own small wrapper that derives `status` from its engine
 * state — the wording is genuinely game-specific — and passes it here.
 *
 * `PlayerId` is redeclared rather than imported from an engine: engines carry
 * no imports by convention, and `1 | 2` is structurally identical everywhere,
 * so every game can pass its own type with no cast.
 */
export type PlayerId = 1 | 2;

export function PlayerPanel({
  player,
  active,
  won,
  status,
  score,
  children,
}: {
  player: PlayerId;
  active: boolean;
  won: boolean;
  status: string;
  /** Right-aligned number, e.g. discs or seeds held. */
  score?: ReactNode;
  /** Right-aligned extra content, e.g. checkers' captured-piece tray. */
  children?: ReactNode;
}) {
  const swatchVars = {
    '--pc': `var(--p${player})`,
    '--pe': `var(--p${player}-edge)`,
  } as CSSProperties;

  return (
    <div
      className={`panel panel-${player}${active ? ' active' : ''}${won ? ' won' : ''}`}
    >
      <span className="swatch" style={swatchVars} />
      <div className="who">
        <span className="pname">Player {player}</span>
        <span className="pstatus">{status}</span>
      </div>
      {score !== undefined && <span className="score">{score}</span>}
      {children}
    </div>
  );
}
