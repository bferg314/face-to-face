import { useMemo } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import {
  applyMove,
  boxEdges,
  boxesOf,
  hEdge,
  vEdge,
  legalEdges,
  newGame,
  playerList,
  scores,
  type DotsBoxesState,
  type PlayerId,
} from './engine';
import { GameShell } from '../../components/GameShell';
import { PlayerPanel } from '../../components/PlayerPanel';
import { useGameHistory } from '../../hooks/useGameHistory';
import { dotsBoxesHelp } from './help';
import type { Settings } from '../../settings';

export function DotsBoxesGame({
  settings,
  onExit,
  onOpenSettings,
}: {
  settings: Settings;
  onExit: () => void;
  onOpenSettings: () => void;
}) {
  // The live game renders from its own state throughout — changing the size
  // or player count in settings reshapes nothing mid-game and applies from
  // the next match, when `newMatch` calls this fresh closure.
  const history = useGameHistory<DotsBoxesState>(() =>
    newGame(settings.dotsBoxesPlayers, settings.dotsBoxesSize),
  );
  const { state, past } = history;
  const { size } = state;

  const open = useMemo(() => new Set(legalEdges(state)), [state]);
  const score = useMemo(() => scores(state), [state]);
  const players = playerList(state);

  // Edges whose play would complete a box right now — the hint, gated on the
  // setting like every other game's tactical highlight.
  const completing = useMemo(() => {
    const set = new Set<number>();
    for (const e of open) {
      const finishes = boxesOf(size, e).some(
        (b) =>
          state.boxes[b] === null &&
          boxEdges(size, b).filter((be) => state.edges[be] !== null).length === 3,
      );
      if (finishes) set.add(e);
    }
    return set;
  }, [open, size, state]);

  function clickEdge(e: number) {
    if (!open.has(e)) return;
    history.play(applyMove(state, e));
  }

  const last = state.lastMove;

  function edge(e: number, orientation: 'db-h' | 'db-v') {
    const drawer = state.edges[e];
    const cls = ['db-edge', orientation];
    let vars: CSSProperties | undefined;
    if (drawer !== null) {
      cls.push('drawn');
      vars = {
        '--pc': `var(--p${drawer})`,
        '--pe': `var(--p${drawer}-edge)`,
      } as CSSProperties;
    } else if (!state.winner) {
      cls.push('open');
      if (settings.showHints && completing.has(e)) cls.push('hint');
    }
    if (last?.edge === e) cls.push('last');
    return (
      <div
        key={`e${e}`}
        className={cls.join(' ')}
        style={vars}
        onClick={() => clickEdge(e)}
      />
    );
  }

  function box(b: number) {
    const owner = state.boxes[b];
    const flashAt = last?.completed.indexOf(b) ?? -1;
    const cls = ['db-box'];
    let vars: CSSProperties | undefined;
    if (owner !== null) {
      cls.push('owned');
      vars = {
        '--pc': `var(--p${owner})`,
        '--pe': `var(--p${owner}-edge)`,
      } as CSSProperties;
      if (flashAt >= 0) {
        cls.push('flash');
        vars = { ...vars, '--d': `${flashAt * 120}ms` } as CSSProperties;
      }
    }
    return (
      <div
        // Only just-claimed boxes are re-keyed, so the flash replays for them
        // and nothing else re-animates (the uttt pattern).
        key={flashAt >= 0 ? `b${b}:${past.length}` : `b${b}`}
        className={cls.join(' ')}
        style={vars}
      />
    );
  }

  // Rows interleave: a dot row (dot, h-edge, … dot) then a box row
  // (v-edge, box, … v-edge), ending on the last dot row. Emitted in grid
  // order so auto-placement lays everything out with no per-cell styles.
  const cells: ReactNode[] = [];
  for (let r = 0; r <= size; r++) {
    cells.push(<span key={`d${r}-0`} className="db-dot" />);
    for (let c = 0; c < size; c++) {
      cells.push(edge(hEdge(size, r, c), 'db-h'));
      cells.push(<span key={`d${r}-${c + 1}`} className="db-dot" />);
    }
    if (r < size) {
      cells.push(edge(vEdge(size, r, 0), 'db-v'));
      for (let c = 0; c < size; c++) {
        cells.push(box(r * size + c));
        cells.push(edge(vEdge(size, r, c + 1), 'db-v'));
      }
    }
  }

  // `repeat()` counts can't come from a CSS var, so the size-dependent track
  // list is the one piece of layout set inline.
  const tracks = `var(--db-t)${' 1fr var(--db-t)'.repeat(size)}`;

  return (
    <GameShell
      viewMode={settings.viewMode}
      gameInProgress={history.gameInProgress}
      undoDisabled={history.undoDisabled}
      help={dotsBoxesHelp}
      onExit={onExit}
      onOpenSettings={onOpenSettings}
      onNewGame={history.newMatch}
      onUndo={history.undo}
      panels={players.map((p) => (
        <DbPanel key={p} player={p} state={state} score={score[p]} />
      ))}
    >
      <div className="board-frame">
        <div className="board-inner">
          <div
            className="db-board"
            style={
              {
                gridTemplate: `${tracks} / ${tracks}`,
                '--turn-c': `var(--p${state.turn})`,
                '--turn-e': `var(--p${state.turn}-edge)`,
              } as CSSProperties
            }
          >
            {cells}
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
                  {players.map((p) => score[p]).join(' – ')}
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

function DbPanel({
  player,
  state,
  score,
}: {
  player: PlayerId;
  state: DotsBoxesState;
  score: number;
}) {
  const active = !state.winner && state.turn === player;
  const won = state.winner === player;
  const goAgain =
    active &&
    state.lastMove?.player === player &&
    state.lastMove.completed.length > 0;
  const status =
    state.winner === 'draw'
      ? 'Draw!'
      : won
        ? '🏆 Winner!'
        : state.winner
          ? 'Good game'
          : active
            ? goAgain
              ? 'Go again!'
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
