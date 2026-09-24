import type { CSSProperties, ReactNode } from 'react';

/**
 * Shared player panel: colour swatch, name, status line, and a trailing slot.
 *
 * Each game keeps its own small wrapper that derives `status` from its engine
 * state — the wording is genuinely game-specific — and passes it here.
 *
 * `PlayerId` is redeclared rather than imported from an engine: engines carry
 * no imports by convention, and every engine's id type is a subset of
 * `1 | 2 | 3 | 4`, so every game can pass its own type with no cast. Seats 3
 * and 4 have colour tokens but no GameShell slot yet — engines may use them,
 * screens can't seat them.
 */
export type PlayerId = 1 | 2 | 3 | 4;

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
  const playerVars = {
    '--pc': `var(--p${player})`,
    '--pe': `var(--p${player}-edge)`,
    '--ptint': `var(--p${player}-tint, rgba(255,255,255,0.12))`,
  } as CSSProperties;

  return (
    <div
      className={`panel panel-${player}${active ? ' active' : ''}${won ? ' won' : ''}`}
      style={playerVars}
    >
      <span className="swatch" />
      <div className="who">
        <div className="pname-row">
          <span className="pname">Player {player}</span>
          {active && !won && <span className="turn-pill">Turn</span>}
          {won && <span className="won-pill">Winner</span>}
        </div>
        <span className="pstatus">{status}</span>
      </div>
      {score !== undefined && <span className="score">{score}</span>}
      {children}
    </div>
  );
}
