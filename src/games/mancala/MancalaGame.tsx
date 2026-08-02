import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import {
  applyMove,
  legalPits,
  newGame,
  ownsPit,
  STORE,
  type MancalaState,
  type PlayerId,
} from './engine';
import { GameShell } from '../../components/GameShell';
import { PlayerPanel } from '../../components/PlayerPanel';
import { useGameHistory } from '../../hooks/useGameHistory';
import { mancalaHelp } from './help';
import type { Settings } from '../../settings';

/** Deterministic scatter positions (golden-angle spiral) for seed dots. */
const SEED_SPOTS = Array.from({ length: 24 }, (_, i) => {
  const angle = i * 2.399963;
  const radius = 12 + 30 * Math.sqrt((i + 0.5) / 24);
  return {
    x: 50 + radius * Math.cos(angle),
    y: 50 + radius * Math.sin(angle),
  };
});

/** Grid areas: top row is Player 2's pits right-to-left (counterclockwise). */
const TOP_PITS = [12, 11, 10, 9, 8, 7];
const BOTTOM_PITS = [0, 1, 2, 3, 4, 5];

export function MancalaGame({
  settings,
  onExit,
  onOpenSettings,
}: {
  settings: Settings;
  onExit: () => void;
  onOpenSettings: () => void;
}) {
  const history = useGameHistory<MancalaState>(newGame);
  const { state, past } = history;

  const legal = useMemo(() => new Set(legalPits(state)), [state]);

  function clickPit(i: number) {
    if (!legal.has(i)) return;
    history.play(applyMove(state, i));
  }

  const last = state.lastMove;

  function renderHole(i: number, area: string, top: boolean, isStore: boolean) {
    const seeds = state.pits[i];
    const sownAt = last ? last.path.indexOf(i) : -1;
    const cls = [isStore ? 'pit mn-store' : 'pit'];
    if (top) cls.push('top');
    if (legal.has(i)) {
      cls.push('legal');
      if (settings.showHints) cls.push('glow');
    }
    if (sownAt >= 0) cls.push('sown');
    if (last && (last.capturedFrom === i || (last.captured > 0 && last.path[last.path.length - 1] === i))) {
      cls.push('raided');
    }
    // Re-key animated holes each move so the flash animation retriggers.
    const animated = sownAt >= 0 || cls.includes('raided');
    return (
      <div
        key={`${i}${animated ? `:${past.length}` : ''}`}
        className={cls.join(' ')}
        style={{ gridArea: area, '--d': `${Math.max(sownAt, 0) * 70}ms` } as CSSProperties}
        onClick={() => clickPit(i)}
      >
        {Array.from({ length: Math.min(seeds, 24) }, (_, k) => (
          <span
            key={k}
            className="seed"
            style={{ left: `${SEED_SPOTS[k].x}%`, top: `${SEED_SPOTS[k].y}%` }}
          />
        ))}
        <span className="count">{seeds}</span>
      </div>
    );
  }

  return (
    <GameShell
      viewMode={settings.viewMode}
      gameInProgress={history.gameInProgress}
      undoDisabled={history.undoDisabled}
      help={mancalaHelp}
      onExit={onExit}
      onOpenSettings={onOpenSettings}
      onNewGame={history.newMatch}
      onUndo={history.undo}
      panel1={<MancalaPanel player={1} state={state} />}
      panel2={<MancalaPanel player={2} state={state} />}
    >
      <div className="board-frame mn-frame">
        <div className="board-inner">
          <div
            className={`mn-board${settings.viewMode === 'across' ? ' across' : ''}`}
          >
            {renderHole(STORE[2], 's2', true, true)}
            {TOP_PITS.map((i, k) => renderHole(i, `t${k}`, true, false))}
            {renderHole(STORE[1], 's1', false, true)}
            {BOTTOM_PITS.map((i, k) => renderHole(i, `b${k}`, false, false))}
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
                  {state.pits[STORE[1]]} – {state.pits[STORE[2]]}
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

function MancalaPanel({ player, state }: { player: PlayerId; state: MancalaState }) {
  const active = !state.winner && state.turn === player;
  const won = state.winner === player;
  const goAgain =
    active && state.lastMove?.extraTurn && ownsPit(player, state.lastMove.pit);
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
      score={state.pits[STORE[player]]}
    />
  );
}
