import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { CATEGORIES, type Category } from './scoring';
import {
  ROLLS,
  ROUNDS,
  available,
  bestCategory,
  newGame,
  playerList,
  roll,
  score,
  toggleHold,
  totals,
  type PlayerId,
  type YachtState,
} from './engine';
import { Die } from './Die';
import { ConfirmModal } from '../../components/ConfirmModal';
import { GameShell, seatOf } from '../../components/GameShell';
import { PlayerPanel } from '../../components/PlayerPanel';
import { useGameHistory } from '../../hooks/useGameHistory';
import { yachtHelp } from './help';
import type { Settings } from '../../settings';

export function YachtGame({
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
  const history = useGameHistory<YachtState>(() => newGame(settings.yachtPlayers));
  const { state, past } = history;
  const players = playerList(state);

  const dealt = useRef(settings.yachtPlayers);
  const [restartPrompt, setRestartPrompt] = useState<string | null>(null);

  useEffect(() => {
    if (settingsOpen || dealt.current === settings.yachtPlayers) return;
    dealt.current = settings.yachtPlayers;
    if (!history.gameInProgress) {
      history.newMatch();
      return;
    }
    setRestartPrompt(`Restart with ${settings.yachtPlayers} players?`);
  }, [settingsOpen]);

  const options = useMemo(
    () => new Map(available(state).map((o) => [o.category, o.points])),
    [state],
  );
  const best = useMemo(
    () => (settings.showHints ? bestCategory(state) : null),
    [state, settings.showHints],
  );
  const table = useMemo(() => totals(state), [state]);
  const rolled = state.dice.length > 0;

  // A scorecard is a table of numbers, which is the most orientation-bound
  // thing in the collection, and a Yacht turn is long enough that turning it
  // round costs nothing — the opposite of a game like Connect Four, where the
  // board would spin every few seconds. So the felt turns to face whoever is
  // deciding, or the winner once there is one, whenever that seat is the one
  // straight across. Seats to the left and right are left alone: a quarter
  // turn would have to shrink the card to fit, and someone sitting beside a
  // score sheet reads it at an angle anyway.
  const facing = typeof state.winner === 'number' ? state.winner : state.turn;
  const turned = seatOf(facing, state.players, settings.viewMode) === 'top';

  return (
    <>
      <GameShell
        viewMode={settings.viewMode}
        gameInProgress={history.gameInProgress}
        undoDisabled={history.undoDisabled}
        help={yachtHelp}
        onExit={onExit}
        onOpenSettings={onOpenSettings}
        onNewGame={history.newMatch}
        onUndo={history.undo}
        panels={players.map((p) => (
          <YachtPanel key={p} player={p} state={state} total={table[p]} />
        ))}
      >
        <div className={`yd-table${turned ? ' turned' : ''}`}>
          <div className="yd-tray">
            <div className="yd-dice">
              {rolled ? (
                state.dice.map((face, place) => (
                  <Die
                    key={place}
                    face={face}
                    held={state.held[place]}
                    // Re-keyed per roll so the tumble replays for the dice
                    // that actually moved (the uttt flash pattern).
                    rolled={state.held[place] ? 0 : past.length}
                    onClick={
                      state.winner || state.rollsLeft === 0
                        ? undefined
                        : // A held die is a decision you can take back by
                          // tapping again, so it stays off the undo stack.
                          () => history.amend((s) => toggleHold(s, place))
                    }
                  />
                ))
              ) : (
                <p className="yd-prompt">
                  {state.winner ? 'Game over' : `Player ${state.turn}, roll the dice`}
                </p>
              )}
            </div>

            <div className="yd-controls">
              <button
                className="yd-roll"
                disabled={!!state.winner || state.rollsLeft === 0}
                onClick={() => history.play(roll(state))}
              >
                {state.rollsLeft === ROLLS ? 'Roll' : 'Roll again'}
                <small>
                  {state.rollsLeft} of {ROLLS} left
                </small>
              </button>
              <span className="yd-round">
                Round {Math.min(state.round + 1, ROUNDS)} of {ROUNDS}
              </span>
            </div>
          </div>

          <div className="yd-card">
            <div className="yd-row yd-head">
              <span className="yd-name" />
              {players.map((p) => (
                <span
                  key={p}
                  className={`yd-cell yd-who${state.turn === p && !state.winner ? ' active' : ''}`}
                  style={{ '--pc': `var(--p${p})` } as CSSProperties}
                >
                  <span className="yd-swatch" />
                  {p}
                </span>
              ))}
            </div>

            {CATEGORIES.map((category) => (
              <div key={category.id} className={`yd-row yd-${category.section}`}>
                <span className="yd-name">
                  {category.name}
                  <small>{category.hint}</small>
                </span>
                {players.map((p) => (
                  <ScoreCell
                    key={p}
                    player={p}
                    category={category.id}
                    state={state}
                    preview={options.get(category.id)}
                    best={best === category.id}
                    onScore={() => history.play(score(state, category.id))}
                  />
                ))}
              </div>
            ))}

            <div className="yd-row yd-total">
              <span className="yd-name">Total</span>
              {players.map((p) => (
                <span key={p} className="yd-cell yd-sum">
                  {table[p]}
                </span>
              ))}
            </div>
          </div>

          {state.winner && (
            <div className="win-overlay">
              <div className="win-card">
                <div className="win-title">
                  {state.winner === 'draw'
                    ? 'It’s a draw!'
                    : `Player ${state.winner} wins!`}
                </div>
                <p className="win-score">{players.map((p) => table[p]).join(' – ')}</p>
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

function ScoreCell({
  player,
  category,
  state,
  preview,
  best,
  onScore,
}: {
  player: PlayerId;
  category: Category;
  state: YachtState;
  /** What the dice on the table would put here, for the player to move. */
  preview: number | undefined;
  best: boolean;
  onScore: () => void;
}) {
  const written = state.scores[player][category];
  if (written !== undefined) {
    const justNow =
      state.lastScored?.player === player && state.lastScored.category === category;
    return (
      <span className={`yd-cell yd-written${justNow ? ' just' : ''}`}>{written}</span>
    );
  }

  const mine = state.turn === player && !state.winner;
  const open = mine && state.dice.length > 0 && preview !== undefined;
  return (
    <button
      type="button"
      className={`yd-cell yd-open${best && open ? ' best' : ''}`}
      disabled={!open}
      onClick={onScore}
    >
      {open ? preview : ''}
    </button>
  );
}

function YachtPanel({
  player,
  state,
  total,
}: {
  player: PlayerId;
  state: YachtState;
  total: number;
}) {
  const active = !state.winner && state.turn === player;
  const won = state.winner === player;
  const status =
    state.winner === 'draw'
      ? 'Draw'
      : won
        ? '🏆 Winner!'
        : state.winner
          ? 'Good game'
          : active
            ? state.dice.length === 0
              ? 'Roll the dice'
              : state.rollsLeft > 0
                ? `Keep or roll — ${state.rollsLeft} left`
                : 'Pick a box'
            : 'Waiting…';

  return (
    <PlayerPanel
      player={player}
      active={active}
      won={won}
      status={status}
      score={
        <>
          {total}
          <small>points</small>
        </>
      }
    />
  );
}
