import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  COLS,
  ROWS,
  applyMove,
  colOf,
  idx,
  landingCell,
  legalColumns,
  newGame,
  other,
  rowOf,
  winningColumns,
  type C4State,
  type PlayerId,
} from './engine';
import { GameShell } from '../../components/GameShell';
import { PlayerPanel } from '../../components/PlayerPanel';
import { useGameHistory } from '../../hooks/useGameHistory';
import { c4Help } from './help';
import type { Settings } from '../../settings';

const colourVars = (player: PlayerId) =>
  ({ '--pc': `var(--p${player})`, '--pe': `var(--p${player}-edge)` }) as CSSProperties;

export function C4Game({
  settings,
  onExit,
  onOpenSettings,
}: {
  settings: Settings;
  onExit: () => void;
  onOpenSettings: () => void;
}) {
  const history = useGameHistory<C4State>(newGame);
  const { state, past } = history;
  /** The column the pointer is over, for the disc waiting above it. */
  const [hovered, setHovered] = useState<number | null>(null);

  const open = useMemo(() => new Set(legalColumns(state)), [state]);
  const wins = useMemo(
    () => new Set(winningColumns(state, state.turn)),
    [state],
  );
  const winLine = useMemo(() => new Set(state.winLine), [state.winLine]);

  function drop(col: number) {
    if (!open.has(col)) return;
    history.play(applyMove(state, col));
  }

  const columns = Array.from({ length: COLS }, (_, col) => {
    const landing = landingCell(state.board, col);
    const cls = ['c4-col'];
    if (open.has(col)) cls.push('open');
    // Gated on the setting, like every other game's tactical highlight: this
    // one says "four from here".
    if (settings.showHints && wins.has(col)) cls.push('winning');

    const cells = Array.from({ length: ROWS }, (_, row) => {
      const cell = idx(row, col);
      const disc = state.board[cell];
      const cellCls = ['c4-cell'];
      if (winLine.has(cell)) cellCls.push('won');
      else if (state.lastMove === cell) cellCls.push('last');
      // How far the disc fell, so it drops from above the board rather than
      // appearing where it lands.
      const fell = state.lastMove === cell ? rowOf(cell) + 1 : 0;
      return (
        <div key={cell} className={cellCls.join(' ')}>
          {disc !== null && (
            <span
              // Re-keyed on the move it landed, so the drop plays once, for
              // that disc only (the uttt flash pattern).
              key={fell > 0 ? `d${cell}:${past.length}` : `d${cell}`}
              className={`c4-disc${fell > 0 ? ' dropped' : ''}`}
              style={{ ...colourVars(disc), '--fell': fell } as CSSProperties}
            >
              <span className="checker" />
            </span>
          )}
        </div>
      );
    });

    return (
      <div
        key={col}
        className={cls.join(' ')}
        onMouseEnter={() => setHovered(col)}
        onMouseLeave={() => setHovered((c) => (c === col ? null : c))}
        onClick={() => drop(col)}
      >
        {/* Where this disc would come to rest. */}
        {hovered === col && landing !== null && !state.winner && (
          <span
            className="c4-ghost"
            style={
              {
                ...colourVars(state.turn),
                '--row': rowOf(landing),
              } as CSSProperties
            }
          />
        )}
        {cells}
      </div>
    );
  });

  return (
    <GameShell
      viewMode={settings.viewMode}
      gameInProgress={history.gameInProgress}
      undoDisabled={history.undoDisabled}
      help={c4Help}
      onExit={onExit}
      onOpenSettings={onOpenSettings}
      onNewGame={history.newMatch}
      onUndo={history.undo}
      panels={[
        <C4Panel key={1} player={1} state={state} />,
        <C4Panel key={2} player={2} state={state} />,
      ]}
    >
      <div className="board-frame">
        <div className="board-inner">
          <div className="c4-board" onMouseLeave={() => setHovered(null)}>
            {columns}
          </div>
          {state.winner && (
            <div className="win-overlay">
              <div className="win-card">
                <div className="win-title">
                  {state.winner === 'draw'
                    ? 'It’s a draw!'
                    : `Player ${state.winner} wins!`}
                </div>
                <p className="win-score">
                  {state.winner === 'draw'
                    ? 'The board is full with no line.'
                    : `Four in a row${lineWord(state)}.`}
                </p>
                <div className="win-actions">
                  <button onClick={history.newMatch}>Rematch</button>
                  <button className="secondary" onClick={onExit}>
                    Home
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </GameShell>
  );
}

/** How the winning line ran, for the card under the result. */
function lineWord(state: C4State): string {
  const line = state.winLine;
  if (line.length < 2) return '';
  const sameRow = line.every((c) => rowOf(c) === rowOf(line[0]));
  const sameCol = line.every((c) => colOf(c) === colOf(line[0]));
  if (sameRow) return ' across';
  if (sameCol) return ' upwards';
  return ' on the diagonal';
}

function C4Panel({ player, state }: { player: PlayerId; state: C4State }) {
  const active = !state.winner && state.turn === player;
  const won = state.winner === player;
  const status =
    state.winner === 'draw'
      ? 'Draw'
      : won
        ? '🏆 Winner!'
        : state.winner === other(player)
          ? 'Good game'
          : active
            ? 'Your move'
            : 'Waiting…';

  return <PlayerPanel player={player} active={active} won={won} status={status} />;
}
