import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { CARDS, type CardId } from './cards';
import {
  ARCH,
  SIZE,
  applyDiscard,
  applyMove,
  hasAnyMove,
  idx,
  movesFrom,
  movesWith,
  newGame,
  other,
  type OnitamaState,
  type PlayerId,
} from './engine';
import { Card } from './Card';
import { GameShell } from '../../components/GameShell';
import { PlayerPanel } from '../../components/PlayerPanel';
import { useGameHistory } from '../../hooks/useGameHistory';
import { onitamaHelp } from './help';
import type { Settings } from '../../settings';

const colourVars = (player: PlayerId) =>
  ({ '--pc': `var(--p${player})`, '--pe': `var(--p${player}-edge)` }) as CSSProperties;

export function OnitamaGame({
  settings,
  onExit,
  onOpenSettings,
}: {
  settings: Settings;
  onExit: () => void;
  onOpenSettings: () => void;
}) {
  const history = useGameHistory<OnitamaState>(() => newGame());
  const { state } = history;
  /** The card being played this turn, and the piece picked up with it. */
  const [armed, setArmed] = useState<CardId | null>(null);
  const [selected, setSelected] = useState<number | null>(null);

  // A fresh turn starts with nothing in hand: the cards have moved on, and an
  // armed card from last turn belongs to the other player now.
  useEffect(() => {
    setArmed(null);
    setSelected(null);
  }, [state.turn, state.side]);

  const stuck = useMemo(() => !state.winner && !hasAnyMove(state), [state]);
  const playable = useMemo(
    () =>
      new Set(
        state.hands[state.turn].filter((card) => movesWith(state, card).length > 0),
      ),
    [state],
  );
  const destinations = useMemo(
    () =>
      new Set(
        armed === null || selected === null ? [] : movesFrom(state, selected, armed),
      ),
    [state, armed, selected],
  );
  const movable = useMemo(
    () => new Set(armed === null ? [] : movesWith(state, armed).map((m) => m.from)),
    [state, armed],
  );

  function clickCard(card: CardId) {
    if (state.winner) return;
    if (stuck) {
      // No move to make: the card is handed over for nothing.
      history.play(applyDiscard(state, card));
      return;
    }
    setArmed((current) => (current === card ? null : card));
    setSelected(null);
  }

  function clickSquare(cell: number) {
    if (state.winner || armed === null) return;
    if (destinations.has(cell)) {
      history.play(applyMove(state, { from: selected!, to: cell, card: armed }));
      return;
    }
    setSelected(movable.has(cell) ? cell : null);
  }

  function undo() {
    history.undo();
    setArmed(null);
    setSelected(null);
  }

  function newMatch() {
    history.newMatch();
    setArmed(null);
    setSelected(null);
  }

  const squares = [];
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      const cell = idx(row, col);
      const piece = state.board[cell];
      const cls = ['on-sq'];
      if (cell === ARCH[1]) cls.push('arch arch-1');
      if (cell === ARCH[2]) cls.push('arch arch-2');
      if (destinations.has(cell)) cls.push('dest');
      else if (selected === cell) cls.push('sel');
      else if (armed !== null && movable.has(cell)) cls.push('movable');
      if (state.lastMove && (state.lastMove.from === cell || state.lastMove.to === cell)) {
        cls.push('last');
      }
      if (destinations.has(cell) && piece !== null) cls.push('take');

      squares.push(
        <div key={cell} className={cls.join(' ')} onClick={() => clickSquare(cell)}>
          {piece && (
            <span
              className={`on-piece${piece.master ? ' master' : ''}`}
              style={colourVars(piece.player)}
            >
              <span className="checker" />
            </span>
          )}
        </div>,
      );
    }
  }

  // Player 2's cards only need turning when their seat is not: side by side
  // leaves both panels upright, so their pattern would otherwise point the
  // wrong way down the board.
  const flipFor = (player: PlayerId) =>
    player === 2 && settings.viewMode === 'side-by-side';

  const result = state.winner
    ? {
        title: `Player ${state.winner} wins!`,
        note:
          state.ending === 'stone'
            ? 'The Way of the Stone — the Master is taken.'
            : 'The Way of the Stream — the Master has reached the far arch.',
      }
    : null;

  return (
    <GameShell
      viewMode={settings.viewMode}
      gameInProgress={history.gameInProgress}
      undoDisabled={history.undoDisabled}
      help={onitamaHelp}
      onExit={onExit}
      onOpenSettings={onOpenSettings}
      onNewGame={newMatch}
      onUndo={undo}
      panels={[1, 2].map((p) => (
        <OnitamaPanel
          key={p}
          player={p as PlayerId}
          state={state}
          armed={armed}
          playable={playable}
          stuck={stuck}
          flip={flipFor(p as PlayerId)}
          onCard={clickCard}
        />
      ))}
    >
      <div className="on-table">
        {/* The spare card, which is exactly what it is on the table: nobody's
            yet, and turned towards whoever is about to take it. */}
        <div className="on-side">
          <Card
            card={state.side}
            owner={state.winner ? null : state.turn}
            flip={!state.winner && flipFor(state.turn)}
            state="next"
          />
          <span className="on-side-label">
            {state.winner ? 'Spare' : `To Player ${state.turn}`}
          </span>
        </div>

        <div className="on-board-wrap">
          <div className="board-frame">
            <div className="board-inner">
              <div
                className="on-board"
                style={
                  {
                    '--turn-c': `var(--p${state.turn})`,
                    '--turn-e': `var(--p${state.turn}-edge)`,
                  } as CSSProperties
                }
              >
                {squares}
              </div>
              {result && (
                <div className="win-overlay">
                  <div className="win-card">
                    <div className="win-title">{result.title}</div>
                    <p className="win-score">{result.note}</p>
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
        </div>
      </div>
    </GameShell>
  );
}

function OnitamaPanel({
  player,
  state,
  armed,
  playable,
  stuck,
  flip,
  onCard,
}: {
  player: PlayerId;
  state: OnitamaState;
  armed: CardId | null;
  playable: Set<CardId>;
  stuck: boolean;
  flip: boolean;
  onCard: (card: CardId) => void;
}) {
  const active = !state.winner && state.turn === player;
  const won = state.winner === player;
  const status = won
    ? '🏆 Winner!'
    : state.winner === other(player)
      ? 'Good game'
      : active
        ? stuck
          ? 'No move — give up a card'
          : armed
            ? `${CARDS[armed].name}: pick a piece`
            : 'Pick a card'
        : 'Waiting…';

  return (
    <PlayerPanel player={player} active={active} won={won} status={status}>
      <div className="on-hand">
        {state.hands[player].map((card) => (
          <Card
            key={card}
            card={card}
            owner={player}
            flip={flip}
            state={armed === card ? 'armed' : 'idle'}
            onClick={
              active && !state.winner && (stuck || playable.has(card))
                ? () => onCard(card)
                : undefined
            }
          />
        ))}
      </div>
    </PlayerPanel>
  );
}
