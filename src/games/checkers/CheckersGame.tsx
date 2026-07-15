import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  applyMove,
  colOf,
  idx,
  isDark,
  legalMoves,
  newGame,
  other,
  rowOf,
  type CheckersState,
  type PlayerId,
} from './engine';
import { GameShell } from '../../components/GameShell';
import type { Settings } from '../../settings';

export function CheckersGame({
  settings,
  onExit,
  onOpenSettings,
}: {
  settings: Settings;
  onExit: () => void;
  onOpenSettings: () => void;
}) {
  const [state, setState] = useState<CheckersState>(() =>
    newGame(settings.forcedCapture),
  );
  const [past, setPast] = useState<CheckersState[]>([]);
  const [selected, setSelected] = useState<number | null>(null);

  // Rule changes from settings apply to the game in progress.
  useEffect(() => {
    setState((s) =>
      s.forcedCapture === settings.forcedCapture
        ? s
        : { ...s, forcedCapture: settings.forcedCapture },
    );
  }, [settings.forcedCapture]);

  const moves = useMemo(() => legalMoves(state), [state]);
  const movable = useMemo(() => new Set(moves.map((m) => m.from)), [moves]);
  const destMoves = selected === null ? [] : moves.filter((m) => m.from === selected);
  const destByTarget = new Map(destMoves.map((m) => [m.to, m]));

  // Mid multi-jump the jumping piece stays selected automatically.
  useEffect(() => {
    if (state.chain !== null) setSelected(state.chain);
  }, [state.chain]);

  const gameInProgress = past.length > 0 && !state.winner;

  function clickSquare(i: number) {
    if (state.winner) return;
    const move = destByTarget.get(i);
    if (move) {
      setPast((p) => [...p, state]);
      setState(applyMove(state, move));
      setSelected(null);
      return;
    }
    if (state.chain !== null) return; // locked into finishing the jump
    setSelected(movable.has(i) ? i : null);
  }

  function undo() {
    if (past.length === 0) return;
    setState(past[past.length - 1]);
    setPast((p) => p.slice(0, -1));
    setSelected(null);
  }

  function newMatch() {
    setState(newGame(settings.forcedCapture));
    setPast([]);
    setSelected(null);
  }

  const squares = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const i = idx(r, c);
      const move = destByTarget.get(i);
      const cls = ['sq', isDark(r, c) ? 'dark' : 'light'];
      if (selected === i) cls.push('sel');
      if (move) cls.push('dest', move.captured !== null ? 'cap' : '');
      else if (settings.showHints && movable.has(i)) cls.push('movable');
      if (state.lastMove && (state.lastMove.from === i || state.lastMove.to === i)) {
        cls.push('last');
      }
      squares.push(
        <div key={i} className={cls.join(' ')} onClick={() => clickSquare(i)} />,
      );
    }
  }

  return (
    <GameShell
      viewMode={settings.viewMode}
      gameInProgress={gameInProgress}
      undoDisabled={past.length === 0}
      onExit={onExit}
      onOpenSettings={onOpenSettings}
      onNewGame={newMatch}
      onUndo={undo}
      panel1={<PlayerPanel player={1} state={state} />}
      panel2={<PlayerPanel player={2} state={state} />}
    >
      <div className="board-frame">
        <div className="board-inner">
          <div className="board">{squares}</div>
          <div className="pieces">
            {state.board.map(
              (cell, i) =>
                cell && (
                  <div
                    key={cell.id}
                    className={`piece p${cell.player}${cell.king ? ' king' : ''}`}
                    style={{
                      transform: `translate(${colOf(i) * 100}%, ${rowOf(i) * 100}%)`,
                    }}
                  >
                    <div className="checker">{cell.king && <CrownIcon />}</div>
                  </div>
                ),
            )}
          </div>
          {state.winner && (
            <div className="win-overlay">
              <div className="win-card">
                <div className="win-title">Player {state.winner} wins!</div>
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

function PlayerPanel({ player, state }: { player: PlayerId; state: CheckersState }) {
  const active = !state.winner && state.turn === player;
  const won = state.winner === player;
  const lost = state.winner === other(player);
  const taken = state.capturedBy[player];
  const status = won
    ? '🏆 Winner!'
    : lost
      ? 'Good game'
      : active
        ? state.chain !== null
          ? 'Keep jumping!'
          : 'Your move'
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
      <div className="tray">
        {taken.map((p) => (
          <span key={p.id} className={`mini p${p.player}`}>
            {p.king ? '♛' : ''}
          </span>
        ))}
      </div>
    </div>
  );
}

function CrownIcon() {
  return (
    <svg className="crown" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 8.5 8.2 12 12 5.5 15.8 12 20 8.5 18.3 17H5.7Z"
        fill="var(--crown, #f2c14e)"
        stroke="rgba(0,0,0,.35)"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
}
