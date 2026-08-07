import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  MEN_PER_PLAYER,
  POINTS,
  applyMove,
  applyRemoval,
  legalMoves,
  menOnBoard,
  newGame,
  removableMen,
  type MorrisState,
  type PlayerId,
} from './engine';
import { MorrisBoardLines, pct } from './board';
import { GameShell } from '../../components/GameShell';
import { PlayerPanel } from '../../components/PlayerPanel';
import { useGameHistory } from '../../hooks/useGameHistory';
import { morrisHelp } from './help';
import type { Settings } from '../../settings';

/** Move dots and rings belong to whoever is moving, as in the other games. */
const turnVars = (player: PlayerId) =>
  ({
    '--turn-c': `var(--p${player})`,
    '--turn-e': `var(--p${player}-edge)`,
  }) as CSSProperties;

const colourVars = (player: PlayerId) =>
  ({ '--pc': `var(--p${player})`, '--pe': `var(--p${player}-edge)` }) as CSSProperties;

function endingText(state: MorrisState): { title: string; note: string | null } {
  switch (state.ending) {
    case 'reduced':
      return {
        title: `Player ${state.winner} wins!`,
        note: 'Their opponent is down to two men.',
      };
    case 'blocked':
      return {
        title: `Player ${state.winner} wins!`,
        note: 'Their opponent has no legal move left.',
      };
    case 'repetition':
      return {
        title: 'It’s a draw!',
        note: 'The same position came up three times.',
      };
    case 'no-mill':
      return {
        title: 'It’s a draw!',
        note: 'Fifty moves with no mill closed and no man taken.',
      };
    default:
      return { title: 'Game over', note: null };
  }
}

export function MorrisGame({
  settings,
  onExit,
  onOpenSettings,
}: {
  settings: Settings;
  onExit: () => void;
  onOpenSettings: () => void;
}) {
  const history = useGameHistory<MorrisState>(() => newGame(settings.morrisFlying));
  const { state } = history;
  const [selected, setSelected] = useState<number | null>(null);

  // Rule changes from settings apply to the game in progress.
  useEffect(() => {
    history.amend((s) =>
      s.flying === settings.morrisFlying ? s : { ...s, flying: settings.morrisFlying },
    );
  }, [settings.morrisFlying]);

  const moves = useMemo(() => legalMoves(state), [state]);
  const removable = useMemo(() => new Set(removableMen(state)), [state]);
  const movable = useMemo(
    () => new Set(moves.map((m) => m.from).filter((from) => from !== null)),
    [moves],
  );
  // Only ever the points the selected man can reach. Placements have a null
  // `from` too, and marking all two dozen of them in the mover's colour reads
  // as men already on the board.
  const destinations = useMemo(
    () =>
      new Set(
        selected === null
          ? []
          : moves.filter((m) => m.from === selected).map((m) => m.to),
      ),
    [moves, selected],
  );

  // A selected man whose points are all taken again — after an undo, say —
  // would leave a ring with nowhere to go.
  useEffect(() => {
    if (selected !== null && !movable.has(selected)) setSelected(null);
  }, [movable, selected]);

  function clickPoint(i: number) {
    if (state.winner) return;

    if (state.phase === 'remove') {
      if (removable.has(i)) history.play(applyRemoval(state, i));
      return;
    }

    if (state.phase === 'place') {
      if (state.board[i] === null) history.play(applyMove(state, { from: null, to: i }));
      return;
    }

    if (destinations.has(i)) {
      history.play(applyMove(state, { from: selected, to: i }));
      setSelected(null);
      return;
    }
    setSelected(movable.has(i) ? i : null);
  }

  // Wrapped so the selection is cleared alongside the history change.
  function undo() {
    history.undo();
    setSelected(null);
  }

  function newMatch() {
    history.newMatch();
    setSelected(null);
  }

  const mill = new Set(state.millPoints);
  const points = state.board.map((man, i) => {
    const cls = ['mm-point'];
    if (man === null) {
      cls.push('empty');
      if (destinations.has(i)) cls.push('dest');
      else if (!state.winner && state.phase === 'place') cls.push('open');
    } else {
      if (selected === i) cls.push('sel');
      // Removable men are marked whether or not hints are on: without them the
      // remove phase is unreadable, so it is a rule display, not advice.
      if (removable.has(i)) cls.push('takeable');
      if (mill.has(i)) cls.push('milled');
      if (settings.showHints && selected === null && movable.has(i)) {
        cls.push('movable');
      }
    }
    if (state.lastMove && (state.lastMove.from === i || state.lastMove.to === i)) {
      cls.push('last');
    }
    if (state.lastRemoved === i) cls.push('taken');

    return (
      <div
        key={i}
        className={cls.join(' ')}
        style={{ left: pct(POINTS[i].x), top: pct(POINTS[i].y) }}
        onClick={() => clickPoint(i)}
      >
        {man !== null && (
          <span className="mm-man" style={colourVars(man)}>
            <span className="checker" />
          </span>
        )}
      </div>
    );
  });

  const result = endingText(state);

  return (
    <GameShell
      viewMode={settings.viewMode}
      gameInProgress={history.gameInProgress}
      undoDisabled={history.undoDisabled}
      help={morrisHelp}
      onExit={onExit}
      onOpenSettings={onOpenSettings}
      onNewGame={newMatch}
      onUndo={undo}
      panels={[
        <MorrisPanel key={1} player={1} state={state} />,
        <MorrisPanel key={2} player={2} state={state} />,
      ]}
    >
      <div className="board-frame">
        <div className="board-inner">
          <div className="mm-board" style={turnVars(state.turn)}>
            <div className="mm-grid">
              <MorrisBoardLines />
              {points}
            </div>
          </div>
          {state.winner && (
            <div className="win-overlay">
              <div className="win-card">
                <div className="win-title">{result.title}</div>
                {result.note && <p className="win-score">{result.note}</p>}
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

function MorrisPanel({ player, state }: { player: PlayerId; state: MorrisState }) {
  const active = !state.winner && state.turn === player;
  const won = state.winner === player;
  const hand = state.inHand[player];
  const status =
    state.winner === 'draw'
      ? 'Draw'
      : won
        ? '🏆 Winner!'
        : state.winner
          ? 'Good game'
          : active
            ? state.phase === 'remove'
              ? 'Mill! Take a man'
              : state.phase === 'place'
                ? `Place a man — ${hand} left`
                : 'Your move'
            : 'Waiting…';

  return (
    <PlayerPanel
      player={player}
      active={active}
      won={won}
      status={status}
      score={menOnBoard(state.board, player)}
    >
      {/* The men still in hand, so the placing phase reads at a glance. */}
      <div className="tray mm-tray">
        {Array.from({ length: Math.min(hand, MEN_PER_PLAYER) }, (_, i) => (
          <span key={i} className={`mini p${player}`} />
        ))}
      </div>
    </PlayerPanel>
  );
}
