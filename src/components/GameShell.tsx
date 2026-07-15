import { useState, type ReactNode } from 'react';
import type { ViewMode } from '../settings';

/**
 * Shared frame for all games: control rail, seating layout (across /
 * side-by-side, including rotating the far player's panel), and the themed
 * confirmation modals for New game and Home while a game is in progress.
 */
export function GameShell({
  viewMode,
  gameInProgress,
  undoDisabled,
  onExit,
  onOpenSettings,
  onNewGame,
  onUndo,
  panel1,
  panel2,
  children,
}: {
  viewMode: ViewMode;
  gameInProgress: boolean;
  undoDisabled: boolean;
  onExit: () => void;
  onOpenSettings: () => void;
  onNewGame: () => void;
  onUndo: () => void;
  panel1: ReactNode;
  panel2: ReactNode;
  children: ReactNode;
}) {
  const [confirming, setConfirming] = useState<'new' | 'home' | null>(null);
  const layout = viewMode === 'across' ? 'across' : 'sbs';

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
      </div>

      <div className={`panel-pos pos-2${layout === 'across' ? ' rot' : ''}`}>
        {panel2}
      </div>
      <div className="board-wrap">{children}</div>
      <div className="panel-pos pos-1">{panel1}</div>

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
