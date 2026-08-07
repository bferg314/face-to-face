import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  MARBLES,
  POINT_OF,
  POS,
  SPACING,
  applyMove,
  homeOf,
  marblesHome,
  movable,
  movesFrom,
  newGame,
  playerList,
  targetOf,
  type CcState,
  type PlayerId,
} from './engine';
import { ConfirmModal } from '../../components/ConfirmModal';
import { GameShell } from '../../components/GameShell';
import { PlayerPanel } from '../../components/PlayerPanel';
import { useGameHistory } from '../../hooks/useGameHistory';
import { ccHelp } from './help';
import type { Settings } from '../../settings';

const colourVars = (player: PlayerId) =>
  ({ '--pc': `var(--p${player})`, '--pe': `var(--p${player}-edge)` }) as CSSProperties;

export function CcGame({
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
  // The live game keeps the player count it was dealt: changing it reshapes
  // the whole star, so it applies from the next match.
  const history = useGameHistory<CcState>(() => newGame(settings.ccPlayers));
  const { state } = history;
  const players = playerList(state);
  const [selected, setSelected] = useState<number | null>(null);

  const dealt = useRef(settings.ccPlayers);
  const [restartPrompt, setRestartPrompt] = useState<string | null>(null);

  useEffect(() => {
    if (settingsOpen || dealt.current === settings.ccPlayers) return;
    dealt.current = settings.ccPlayers;
    if (!history.gameInProgress) {
      history.newMatch();
      return;
    }
    setRestartPrompt(`Restart with ${settings.ccPlayers} players?`);
  }, [settingsOpen]);

  const canMove = useMemo(() => new Set(movable(state)), [state]);
  const destinations = useMemo(
    () => new Set(selected === null ? [] : movesFrom(state, selected)),
    [state, selected],
  );

  // A marble picked up before an undo may not be yours to move any more.
  useEffect(() => {
    if (selected !== null && !canMove.has(selected)) setSelected(null);
  }, [canMove, selected]);

  function clickHole(hole: number) {
    if (state.winner) return;
    if (destinations.has(hole)) {
      history.play(applyMove(state, { from: selected!, to: hole }));
      setSelected(null);
      return;
    }
    setSelected(canMove.has(hole) ? hole : null);
  }

  function undo() {
    history.undo();
    setSelected(null);
  }

  function newMatch() {
    history.newMatch();
    setSelected(null);
  }

  // Which player owns each triangle, and which is running at it. Both are
  // marked on the holes, so you can see where you started and where you are
  // headed without counting points around the star.
  const homes = new Map(players.map((p) => [homeOf(p, state.players), p]));
  const targets = new Map(players.map((p) => [targetOf(p, state.players), p]));

  const holes = POS.map((pos, i) => {
    const marble = state.board[i];
    const point = POINT_OF[i];
    const home = point === null ? undefined : homes.get(point);
    const target = point === null ? undefined : targets.get(point);
    const cls = ['cc-hole'];
    // Prefixed, like every class in this file: a bare `home` would pick up
    // the lobby screen's own `.home` rule.
    if (home) cls.push('cc-home');
    if (target) cls.push('cc-target');
    if (destinations.has(i)) cls.push('dest');
    else if (selected === i) cls.push('sel');
    else if (settings.showHints && selected === null && canMove.has(i)) {
      cls.push('movable');
    }
    if (state.lastMove && (state.lastMove.from === i || state.lastMove.to === i)) {
      cls.push('last');
    }

    const vars: CSSProperties = {
      left: `${pos.x * 100}%`,
      top: `${pos.y * 100}%`,
      ...(home ? ({ '--home-c': `var(--p${home})` } as CSSProperties) : {}),
      ...(target ? ({ '--target-c': `var(--p${target})` } as CSSProperties) : {}),
    };

    return (
      <div key={i} className={cls.join(' ')} style={vars} onClick={() => clickHole(i)}>
        {marble !== null && (
          <span className="cc-marble" style={colourVars(marble)}>
            <span className="checker" />
          </span>
        )}
      </div>
    );
  });

  return (
    <>
      <GameShell
        viewMode={settings.viewMode}
        gameInProgress={history.gameInProgress}
        undoDisabled={history.undoDisabled}
        help={ccHelp}
        onExit={onExit}
        onOpenSettings={onOpenSettings}
        onNewGame={newMatch}
        onUndo={undo}
        panels={players.map((p) => (
          <CcPanel key={p} player={p} state={state} />
        ))}
      >
        <div className="board-frame">
          <div className="board-inner">
            <div
              className="cc-board"
              style={
                {
                  '--cc-step': `${SPACING * 100}%`,
                  '--turn-c': `var(--p${state.turn})`,
                  '--turn-e': `var(--p${state.turn}-edge)`,
                } as CSSProperties
              }
            >
              <div className="cc-star">{holes}</div>
            </div>
            {state.winner && (
              <div className="win-overlay">
                <div className="win-card">
                  <div className="win-title">Player {state.winner} wins!</div>
                  <p className="win-score">All ten marbles across the board.</p>
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

      {restartPrompt && (
        <ConfirmModal
          title={restartPrompt}
          text="The game in progress will be lost."
          confirmLabel="Restart"
          onConfirm={() => {
            setRestartPrompt(null);
            newMatch();
          }}
          onCancel={() => setRestartPrompt(null)}
        />
      )}
    </>
  );
}

function CcPanel({ player, state }: { player: PlayerId; state: CcState }) {
  const active = !state.winner && state.turn === player;
  const won = state.winner === player;
  const home = marblesHome(state, player);
  const status = won
    ? '🏆 Winner!'
    : state.winner
      ? 'Good game'
      : active
        ? 'Your move'
        : 'Waiting…';

  return (
    <PlayerPanel
      player={player}
      active={active}
      won={won}
      status={status}
      // Marbles landed, not points scored, so the number says which it is.
      score={
        <>
          {home}
          <small>of {MARBLES} home</small>
        </>
      }
    />
  );
}
