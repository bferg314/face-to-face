import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import {
  applyMove,
  boardsWon,
  legalBoards,
  legalCells,
  newGame,
  type PlayerId,
  type UtttState,
} from './engine';
import { Mark } from './Mark';
import { GameShell } from '../../components/GameShell';
import { PlayerPanel } from '../../components/PlayerPanel';
import { useGameHistory } from '../../hooks/useGameHistory';
import { utttHelp } from './help';
import type { Settings } from '../../settings';

export function UtttGame({
  settings,
  onExit,
  onOpenSettings,
}: {
  settings: Settings;
  onExit: () => void;
  onOpenSettings: () => void;
}) {
  const history = useGameHistory<UtttState>(newGame);
  const { state, past } = history;

  const playable = useMemo(() => new Set(legalBoards(state)), [state]);
  const openCells = useMemo(() => new Set(legalCells(state)), [state]);
  const score = useMemo(() => boardsWon(state), [state]);

  // A free move is only worth calling out once the game is under way — the
  // opening move is free for everyone and needs no explanation.
  const freeMove = state.activeBoard === null && past.length > 0;

  function clickCell(i: number) {
    if (!openCells.has(i)) return;
    history.play(applyMove(state, i));
  }

  const last = state.lastMove;

  return (
    <GameShell
      viewMode={settings.viewMode}
      gameInProgress={history.gameInProgress}
      undoDisabled={history.undoDisabled}
      help={utttHelp}
      onExit={onExit}
      onOpenSettings={onOpenSettings}
      onNewGame={history.newMatch}
      onUndo={history.undo}
      panels={[
        <UtttPanel key={1} player={1} state={state} score={score[1]} />,
        <UtttPanel key={2} player={2} state={state} score={score[2]} />,
      ]}
    >
      <div className="board-frame">
        <div className="board-inner">
          <div className="ut-board">
            {Array.from({ length: 9 }, (_, b) => {
              const result = state.boards[b];
              const cls = ['ut-sub'];
              if (playable.has(b)) {
                cls.push('playable', freeMove ? 'free' : 'forced');
              }
              if (result === 1) cls.push('won-1');
              else if (result === 2) cls.push('won-2');
              else if (result === 'draw') cls.push('drawn');
              if (state.winLine?.includes(b)) cls.push('winline');

              return (
                <div key={b} className={cls.join(' ')}>
                  {Array.from({ length: 9 }, (_, c) => {
                    const i = b * 9 + c;
                    const mark = state.cells[i];
                    const inLine = last?.line?.indexOf(i) ?? -1;

                    const cellCls = ['ut-cell'];
                    if (openCells.has(i)) {
                      cellCls.push('open');
                      if (settings.showHints) cellCls.push('hint');
                    }
                    if (last?.cell === i) cellCls.push('last');
                    if (inLine >= 0) cellCls.push('inline');

                    return (
                      <div
                        // Only the cells that animate are re-keyed each move.
                        // Re-keying all 81 would replay `pop` board-wide.
                        key={inLine >= 0 ? `${i}:${past.length}` : i}
                        className={cellCls.join(' ')}
                        style={
                          inLine >= 0
                            ? ({ '--d': `${inLine * 90}ms` } as CSSProperties)
                            : undefined
                        }
                        onClick={() => clickCell(i)}
                      >
                        {mark && <Mark player={mark} />}
                      </div>
                    );
                  })}

                  {result === 'draw' && <span className="ut-drawn" />}
                  {(result === 1 || result === 2) && (
                    <Mark player={result} className="big" />
                  )}
                </div>
              );
            })}
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
                  {score[1]} – {score[2]}
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

function UtttPanel({
  player,
  state,
  score,
}: {
  player: PlayerId;
  state: UtttState;
  score: number;
}) {
  const active = !state.winner && state.turn === player;
  const won = state.winner === player;
  const status =
    state.winner === 'draw'
      ? 'Draw!'
      : won
        ? '🏆 Winner!'
        : state.winner
          ? 'Good game'
          : active
            ? state.activeBoard === null
              ? 'Play anywhere'
              : 'Your move'
            : 'Waiting…';

  return (
    <PlayerPanel
      player={player}
      active={active}
      won={won}
      status={status}
      score={score}
    />
  );
}
