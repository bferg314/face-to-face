import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import {
  SIZE,
  SLOTS,
  applyMove,
  atGoal,
  distanceToGoal,
  idx,
  legalWalls,
  newGame,
  pawnMoves,
  playerList,
  sideOf,
  wallCol,
  wallId,
  wallOrient,
  wallRow,
  type PlayerId,
  type QuoridorState,
} from './engine';
import { ConfirmModal } from '../../components/ConfirmModal';
import { GameShell } from '../../components/GameShell';
import { PlayerPanel } from '../../components/PlayerPanel';
import { useGameHistory } from '../../hooks/useGameHistory';
import { quoridorHelp } from './help';
import type { Settings } from '../../settings';

const colourVars = (player: PlayerId) =>
  ({ '--pc': `var(--p${player})`, '--pe': `var(--p${player}-edge)` }) as CSSProperties;

/** The board edge a player is running for, given the one they started on. */
const GOAL_EDGE = {
  bottom: 'top',
  top: 'bottom',
  left: 'right',
  right: 'left',
} as const;

/** CSS grid line for cell `i`: the tracks alternate cell, groove, cell… */
const cellLine = (i: number) => 2 * i + 1;
const grooveLine = (i: number) => 2 * i + 2;

export function QuoridorGame({
  settings,
  settingsOpen,
  onExit,
  onOpenSettings,
}: {
  settings: Settings;
  settingsOpen: boolean;
  onExit: () => void;
  onOpenSettings: () => void;
}) {
  // The live game keeps the player count it was dealt; changing the setting
  // reshapes nothing mid-game and applies from the next match.
  const history = useGameHistory<QuoridorState>(() =>
    newGame(settings.quoridorPlayers),
  );
  const { state } = history;
  const players = playerList(state);

  const dealt = useRef(settings.quoridorPlayers);
  const [restartPrompt, setRestartPrompt] = useState<string | null>(null);

  // Same shape as Dots & Boxes: wait for Settings to close so the prompt
  // doesn't fire mid-edit or land behind the modal.
  useEffect(() => {
    if (settingsOpen || dealt.current === settings.quoridorPlayers) return;
    dealt.current = settings.quoridorPlayers;
    if (!history.gameInProgress) {
      history.newMatch();
      return;
    }
    setRestartPrompt(`Restart with ${settings.quoridorPlayers} players?`);
  }, [settingsOpen]);

  const steps = useMemo(
    () => new Set(pawnMoves(state)),
    [state],
  );
  const placeable = useMemo(() => new Set(legalWalls(state)), [state]);
  const distances = useMemo(
    () =>
      Object.fromEntries(
        players.map((p) => [
          p,
          distanceToGoal(state.walls, state.pawns[p], p, state.players),
        ]),
      ) as Record<PlayerId, number | null>,
    [state],
  );
  const pawnAt = useMemo(
    () => new Map(players.map((p) => [state.pawns[p], p])),
    [state],
  );

  /** The wall the pointer is over, previewed before it is committed. */
  const [ghost, setGhost] = useState<number | null>(null);

  function movePawn(to: number) {
    if (!steps.has(to)) return;
    history.play(applyMove(state, { kind: 'pawn', to }));
  }

  function placeWall(wall: number) {
    if (!placeable.has(wall)) return;
    history.play(applyMove(state, { kind: 'wall', wall }));
    setGhost(null);
  }

  // A groove segment sits over one cell; the wall it stands for reaches from
  // there to the next cell along, or back from the edge on the last one.
  const wallUnder = (orient: 'h' | 'v', r: number, c: number) =>
    orient === 'h'
      ? wallId('h', r, Math.min(c, SLOTS - 1))
      : wallId('v', Math.min(r, SLOTS - 1), c);

  const lastCell =
    state.lastMove?.kind === 'pawn' ? state.lastMove.to : null;
  const lastWall =
    state.lastMove?.kind === 'wall' ? state.lastMove.wall : null;

  // The board is one grid of alternating tracks: cell, groove, cell, … Every
  // track crossing gets an element in reading order, so nothing needs placing
  // by hand — cells, the groove segments walls are tapped on, and the little
  // intersections, which stay dead so a tap is never ambiguous.
  const slots: ReactNode[] = [];
  for (let tr = 0; tr < 2 * SIZE - 1; tr++) {
    for (let tc = 0; tc < 2 * SIZE - 1; tc++) {
      const r = tr >> 1;
      const c = tc >> 1;
      const grooveRow = tr % 2 === 1;
      const grooveCol = tc % 2 === 1;

      if (!grooveRow && !grooveCol) {
        const i = idx(r, c);
        const standing = pawnAt.get(i);
        const cls = ['qd-cell'];
        if (steps.has(i)) cls.push('dest');
        if (lastCell === i) cls.push('last');
        // A corner cell is the finish line for two players at once, so the
        // markers are children rather than one tint on the cell.
        const goals = players.filter((p) => atGoal(i, p, state.players));
        slots.push(
          <div key={`c${i}`} className={cls.join(' ')} onClick={() => movePawn(i)}>
            {goals.map((p) => (
              <span
                key={p}
                className={`qd-goal qd-goal-${GOAL_EDGE[sideOf(p, state.players)]}`}
                style={colourVars(p)}
              />
            ))}
            {standing !== undefined && (
              <span className="qd-pawn" style={colourVars(standing)}>
                <span className="checker" />
              </span>
            )}
          </div>,
        );
        continue;
      }

      if (grooveRow && grooveCol) {
        slots.push(<span key={`x${tr}-${tc}`} className="qd-cross" />);
        continue;
      }

      const orient = grooveRow ? 'h' : 'v';
      const wall = wallUnder(orient, r, c);
      const open = placeable.has(wall);
      slots.push(
        <div
          key={`${orient}${tr}-${tc}`}
          className={`qd-slot qd-${orient}${open ? ' open' : ''}`}
          onMouseEnter={() => !state.winner && setGhost(wall)}
          onMouseLeave={() => setGhost((g) => (g === wall ? null : g))}
          onClick={() => placeWall(wall)}
        />,
      );
    }
  }

  /** A wall bar, spanning its two cells and the groove between them. */
  function bar(wall: number, owner: PlayerId | null, cls: string) {
    const r = wallRow(wall);
    const c = wallCol(wall);
    const place: CSSProperties =
      wallOrient(wall) === 'h'
        ? { gridRow: grooveLine(r), gridColumn: `${cellLine(c)} / span 3` }
        : { gridColumn: grooveLine(c), gridRow: `${cellLine(r)} / span 3` };
    return (
      <div
        key={cls === 'ghost' ? 'ghost' : `w${wall}`}
        className={`qd-wall qd-${wallOrient(wall)} ${cls}`}
        style={{ ...place, ...(owner ? colourVars(owner) : {}) }}
      />
    );
  }

  const bars = state.walls.map((owner, wall) =>
    owner === null ? null : bar(wall, owner, lastWall === wall ? 'placed last' : 'placed'),
  );
  if (ghost !== null && state.walls[ghost] === null) {
    bars.push(bar(ghost, placeable.has(ghost) ? state.turn : null,
      placeable.has(ghost) ? 'ghost' : 'ghost bad'));
  }

  // `repeat()` can't take a var count, so the track list is set inline — the
  // one piece of layout the component owns, as in Dots & Boxes.
  const tracks = `1fr${' var(--qd-t) 1fr'.repeat(SIZE - 1)}`;
  const grid = {
    gridTemplate: `${tracks} / ${tracks}`,
    '--turn-c': `var(--p${state.turn})`,
    '--turn-e': `var(--p${state.turn}-edge)`,
  } as CSSProperties;

  return (
    <>
      <GameShell
        viewMode={settings.viewMode}
        gameInProgress={history.gameInProgress}
        undoDisabled={history.undoDisabled}
        help={quoridorHelp}
        onExit={onExit}
        onOpenSettings={onOpenSettings}
        onNewGame={history.newMatch}
        onUndo={history.undo}
        panels={players.map((p) => (
          <QuoridorPanel
            key={p}
            player={p}
            state={state}
            steps={settings.showHints ? distances[p] : null}
          />
        ))}
      >
        <div className="board-frame">
          <div className="board-inner">
            <div className="qd-board" style={grid} onMouseLeave={() => setGhost(null)}>
              {slots}
            </div>
            {/* Walls and the preview sit above the board: they span three
                tracks each, so they can't ride along with the auto-placed
                slots, and they must not swallow the taps meant for those. */}
            <div className="qd-walls" style={grid}>
              {bars}
            </div>

            {state.winner && (
              <div className="win-overlay">
                <div className="win-card">
                  <div className="win-title">
                    {state.winner === 'draw'
                      ? 'It’s a draw!'
                      : `Player ${state.winner} wins!`}
                  </div>
                  {state.winner === 'draw' && (
                    <p className="win-score">The same position came up three times.</p>
                  )}
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

      {restartPrompt && (
        <ConfirmModal
          title={restartPrompt}
          text="The game in progress will be lost."
          confirmLabel="Restart"
          onConfirm={() => {
            setRestartPrompt(null);
            history.newMatch();
          }}
          onCancel={() => setRestartPrompt(null)}
        />
      )}
    </>
  );
}

function QuoridorPanel({
  player,
  state,
  steps,
}: {
  player: PlayerId;
  state: QuoridorState;
  /** Shortest run home, when move hints are on. */
  steps: number | null;
}) {
  const active = !state.winner && state.turn === player;
  const won = state.winner === player;
  const walls = state.wallsLeft[player];
  const status =
    state.winner === 'draw'
      ? 'Draw'
      : won
        ? '🏆 Winner!'
        : state.winner
          ? 'Good game'
          : active
            ? walls === 0
              ? 'Your move — no walls left'
              : 'Your move'
            : 'Waiting…';

  return (
    <PlayerPanel
      player={player}
      active={active}
      won={won}
      status={status}
      // Captioned: every other game's number is a score, and this one is a
      // stock of walls still in hand.
      score={
        <>
          {walls}
          <small>{walls === 1 ? 'wall' : 'walls'}</small>
        </>
      }
    >
      {steps !== null && (
        <span className="qd-steps">
          {steps} step{steps === 1 ? '' : 's'}
        </span>
      )}
    </PlayerPanel>
  );
}
