import { useState, type ReactNode } from 'react';
import type { ViewMode } from '../settings';
import { HelpModal, type GameHelp } from './HelpModal';

/**
 * Where a panel sits around the board. The four ring positions are seats at a
 * table lying flat; `sbs-1`/`sbs-2` are the two-player side-by-side pair, both
 * below the board and both upright. CSS rotates each ring seat so its text
 * reads right way up from that chair.
 */
type SeatPos = 'bottom' | 'left' | 'top' | 'right' | 'sbs-1' | 'sbs-2';

/**
 * Seats for `count` players, in turn order. Three and four players always sit
 * around the table — the seating setting is a two-player choice, since side by
 * side has no sensible meaning once there are chairs on every edge.
 *
 * The ring runs bottom → left → top → right so consecutive players are
 * physically adjacent and play passes around the table rather than across it.
 */
function seatPositions(count: number, viewMode: ViewMode): SeatPos[] {
  if (count <= 2) {
    return viewMode === 'across' ? ['bottom', 'top'] : ['sbs-1', 'sbs-2'];
  }
  return count === 3
    ? ['bottom', 'left', 'top']
    : ['bottom', 'left', 'top', 'right'];
}

function layoutClass(count: number, viewMode: ViewMode): string {
  if (count <= 2) return viewMode === 'across' ? 'across' : 'sbs';
  return `seats-${count}`;
}

/**
 * Shared frame for all games: control rail, seating layout (rotating each
 * player's panel to face their chair), the "How to play" modal, and the themed
 * confirmation modals for New game and Home while a game is in progress.
 */
export function GameShell({
  viewMode,
  gameInProgress,
  undoDisabled,
  help,
  onExit,
  onOpenSettings,
  onNewGame,
  onUndo,
  panels,
  children,
}: {
  viewMode: ViewMode;
  gameInProgress: boolean;
  undoDisabled: boolean;
  help?: GameHelp;
  onExit: () => void;
  onOpenSettings: () => void;
  onNewGame: () => void;
  onUndo: () => void;
  /** One panel per player, in turn order. Two to four of them. */
  panels: ReactNode[];
  children: ReactNode;
}) {
  const [confirming, setConfirming] = useState<'new' | 'home' | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const layout = layoutClass(panels.length, viewMode);
  const seats = seatPositions(panels.length, viewMode);

  return (
    <div className={`game ${layout}`}>
      <div className="rail">
        <button
          className="icon-btn"
          onClick={() => (gameInProgress ? setConfirming('home') : onExit())}
          title="Home"
          aria-label="Home"
        >
          ⌂
        </button>
        <button
          className="icon-btn"
          onClick={onOpenSettings}
          title="Settings"
          aria-label="Settings"
        >
          ⚙
        </button>
        <button
          className="icon-btn"
          onClick={onUndo}
          disabled={undoDisabled}
          title="Undo"
          aria-label="Undo"
        >
          ↶
        </button>
        <button
          className="icon-btn"
          onClick={() => (gameInProgress ? setConfirming('new') : onNewGame())}
          title="New game"
          aria-label="New game"
        >
          ⟲
        </button>
        {help && (
          <button
            className="icon-btn"
            onClick={() => setHelpOpen(true)}
            title="How to play"
            aria-label="How to play"
          >
            ?
          </button>
        )}
      </div>

      {panels.map((panel, i) => (
        <div key={i} className={`panel-pos pos-${seats[i]}`}>
          {panel}
        </div>
      ))}
      <div className="board-wrap">{children}</div>

      {help && helpOpen && <HelpModal help={help} onClose={() => setHelpOpen(false)} />}

      {confirming && (
        <div className="modal-backdrop" onClick={() => setConfirming(null)}>
          <div className="modal confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-title">
              {confirming === 'new' ? 'Start a new game?' : 'Leave this game?'}
            </div>
            <p className="confirm-text">The game in progress will be lost.</p>
            <div className="win-actions">
              <button
                onClick={() => {
                  setConfirming(null);
                  if (confirming === 'new') onNewGame();
                  else onExit();
                }}
              >
                {confirming === 'new' ? 'New game' : 'Go home'}
              </button>
              <button className="secondary" onClick={() => setConfirming(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
