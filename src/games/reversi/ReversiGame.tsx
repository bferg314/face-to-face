import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  applyMove,
  counts,
  movesFor,
  newGame,
  other,
  type PlayerId,
  type ReversiState,
} from './engine';
import { GameShell } from '../../components/GameShell';
import type { Settings } from '../../settings';

export function ReversiGame({
  settings,
  onExit,
  onOpenSettings,
}: {
  settings: Settings;
  onExit: () => void;
  onOpenSettings: () => void;
}) {
  const [state, setState] = useState<ReversiState>(newGame);
  const [past, setPast] = useState<ReversiState[]>([]);

  const moves = useMemo(() => movesFor(state.board, state.turn), [state]);
  const moveByTarget = useMemo(() => new Map(moves.map((m) => [m.to, m])), [moves]);
  const score = useMemo(() => counts(state.board), [state.board]);
  const gameInProgress = past.length > 0 && !state.winner;

  function clickCell(i: number) {
    if (state.winner) return;
    const move = moveByTarget.get(i);
    if (!move) return;
    setPast((p) => [...p, state]);
    setState(applyMove(state, move));
  }

  function undo() {
    if (past.length === 0) return;
    setState(past[past.length - 1]);
    setPast((p) => p.slice(0, -1));
  }

  function newMatch() {
    setState(newGame());
    setPast([]);
  }

  const cells = state.board.map((cell, i) => {
    const cls = ['rv-sq'];
    if (!state.winner && settings.showHints && moveByTarget.has(i)) cls.push('hint');
    if (state.lastMove === i) cls.push('last');
    return (
      <div key={i} className={cls.join(' ')} onClick={() => clickCell(i)}>
        {cell && (
          <div className="disc-wrap">
            <div className={`disc${cell === 2 ? ' flipped' : ''}`}>
              <span className="checker face f1" />
              <span className="checker face f2" />
            </div>
          </div>
        )}
      </div>
    );
  });

  return (
    <GameShell
      viewMode={settings.viewMode}
      gameInProgress={gameInProgress}
      undoDisabled={past.length === 0}
      onExit={onExit}
      onOpenSettings={onOpenSettings}
      onNewGame={newMatch}
      onUndo={undo}
      panel1={<ReversiPanel player={1} state={state} score={score[1]} />}
      panel2={<ReversiPanel player={2} state={state} score={score[2]} />}
    >
      <div className="board-frame">
        <div className="board-inner">
          <div className="rv-board">{cells}</div>
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
                  <button onClick={newMatch}>Rematch</button>
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

function ReversiPanel({
  player,
  state,
  score,
}: {
  player: PlayerId;
  state: ReversiState;
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
            ? state.passed === other(player)
              ? 'Opponent passed — go again'
              : 'Your move'
            : state.passed === player
              ? 'No moves — pass'
              : 'Waiting…';

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
      <span className="score">{score}</span>
    </div>
  );
}
