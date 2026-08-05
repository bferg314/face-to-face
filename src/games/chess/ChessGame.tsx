import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  applyMove,
  colOf,
  idx,
  inCheck,
  isDark,
  kingSquare,
  legalMoves,
  newGame,
  other,
  rowOf,
  PIECE_VALUE,
  type ChessState,
  type Move,
  type PlayerId,
  type PromotionType,
} from './engine';
import { GameShell } from '../../components/GameShell';
import { PlayerPanel } from '../../components/PlayerPanel';
import { useGameHistory } from '../../hooks/useGameHistory';
import { chessHelp } from './help';
import { ChessPiece } from './pieces';
import type { Settings } from '../../settings';

const PROMOTION_NAME: Record<PromotionType, string> = {
  q: 'Queen',
  r: 'Rook',
  b: 'Bishop',
  n: 'Knight',
};

/** Only `--pc`: the pieces take their outline from a mix of it, not `--pe`. */
const colourVars = (player: PlayerId) =>
  ({ '--pc': `var(--p${player})` }) as CSSProperties;

/** Move dots belong to whoever is moving, so they carry that player's colour. */
const turnVars = (player: PlayerId) =>
  ({
    '--turn-c': `var(--p${player})`,
    '--turn-e': `var(--p${player}-edge)`,
  }) as CSSProperties;

/** The material each player is up, in pawns. Positive means Player 1 leads. */
function materialEdge(state: ChessState): number {
  const held = (p: PlayerId) =>
    state.capturedBy[p].reduce((sum, piece) => sum + PIECE_VALUE[piece.type], 0);
  return held(1) - held(2);
}

function endingText(state: ChessState): { title: string; note: string | null } {
  switch (state.ending) {
    case 'checkmate':
      return { title: `Checkmate — Player ${state.winner} wins!`, note: null };
    case 'stalemate':
      return {
        title: 'Stalemate',
        note: 'No legal move, and no check — the game is a draw.',
      };
    case 'fifty-move':
      return {
        title: 'It’s a draw!',
        note: 'Fifty moves with no capture and no pawn moved.',
      };
    case 'repetition':
      return { title: 'It’s a draw!', note: 'The same position came up three times.' };
    case 'material':
      return {
        title: 'It’s a draw!',
        note: 'Neither side has the material to force mate.',
      };
    default:
      return { title: 'Game over', note: null };
  }
}

export function ChessGame({
  settings,
  onExit,
  onOpenSettings,
}: {
  settings: Settings;
  onExit: () => void;
  onOpenSettings: () => void;
}) {
  const history = useGameHistory<ChessState>(newGame);
  const { state } = history;
  const [selected, setSelected] = useState<number | null>(null);
  /** The four promotion moves to one square, while the picker is open. */
  const [promoting, setPromoting] = useState<Move[] | null>(null);

  const moves = useMemo(() => legalMoves(state), [state]);
  const movable = useMemo(() => new Set(moves.map((m) => m.from)), [moves]);

  // Destinations for the selected piece, grouped by square. A square with more
  // than one move on it is a promotion, and only a promotion — which is
  // exactly when the picker is needed.
  const destinations = useMemo(() => {
    const byTarget = new Map<number, Move[]>();
    if (selected === null) return byTarget;
    for (const move of moves) {
      if (move.from !== selected) continue;
      const at = byTarget.get(move.to);
      if (at) at.push(move);
      else byTarget.set(move.to, [move]);
    }
    return byTarget;
  }, [moves, selected]);

  // The king in check is marked whether or not hints are on: it is a rule
  // display, not advice — you are not allowed to leave it there.
  const checkedKing = useMemo(
    () => (inCheck(state, state.turn) ? kingSquare(state.board, state.turn) : null),
    [state],
  );

  // Which chair the board is turned towards: whoever has to think, or the
  // winner once there is one. Only `across` seating has two directions to
  // choose between — side by side, both players share an edge.
  const facing: PlayerId =
    state.winner && state.winner !== 'draw' ? state.winner : state.turn;
  const flipped = settings.viewMode === 'across' && facing === 2;

  function clickSquare(i: number) {
    if (state.winner || promoting) return;
    const options = destinations.get(i);
    if (options) {
      if (options.length === 1) play(options[0]);
      else setPromoting(options);
      return;
    }
    setSelected(movable.has(i) ? i : null);
  }

  function play(move: Move) {
    history.play(applyMove(state, move));
    setSelected(null);
    setPromoting(null);
  }

  // Wrapped so the selection and any open picker are cleared alongside the
  // history change.
  function undo() {
    history.undo();
    setSelected(null);
    setPromoting(null);
  }

  function newMatch() {
    history.newMatch();
    setSelected(null);
    setPromoting(null);
  }

  const squares = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const i = idx(r, c);
      const options = destinations.get(i);
      const cls = ['sq', isDark(r, c) ? 'dark' : 'light'];
      if (selected === i) cls.push('sel');
      if (options) {
        cls.push('dest');
        if (options[0].captured !== null) cls.push('cap');
      } else if (settings.showHints && movable.has(i)) cls.push('movable');
      if (checkedKing === i) cls.push('check');
      if (state.lastMove && (state.lastMove.from === i || state.lastMove.to === i)) {
        cls.push('last');
      }
      squares.push(
        <div key={i} className={cls.join(' ')} onClick={() => clickSquare(i)} />,
      );
    }
  }

  const edge = materialEdge(state);
  const result = endingText(state);

  return (
    <>
      <GameShell
        viewMode={settings.viewMode}
        gameInProgress={history.gameInProgress}
        undoDisabled={history.undoDisabled}
        help={chessHelp}
        onExit={onExit}
        onOpenSettings={onOpenSettings}
        onNewGame={newMatch}
        onUndo={undo}
        panels={[
          <ChessPanel key={1} player={1} state={state} edge={edge} />,
          <ChessPanel key={2} player={2} state={state} edge={-edge} />,
        ]}
      >
        <div className="board-frame">
          <div className="board-inner">
            <div className="board" style={turnVars(state.turn)}>
              {squares}
            </div>
            <div className={`pieces chess${flipped ? ' flipped' : ''}`}>
              {state.board.map(
                (cell, i) =>
                  cell && (
                    <div
                      key={cell.id}
                      className={`piece p${cell.player}`}
                      style={{
                        transform: `translate(${colOf(i) * 100}%, ${rowOf(i) * 100}%)`,
                      }}
                    >
                      <ChessPiece type={cell.type} />
                    </div>
                  ),
              )}
            </div>

            {state.winner && (
              <div className="win-overlay">
                {/* A draw has no winner to turn towards, so the card stays put. */}
                <div
                  className={`win-card${flipped && state.winner !== 'draw' ? ' flipped' : ''}`}
                >
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

      {/* Outside GameShell: `.board-wrap` is a size container, which would be
          the containing block for a fixed-position backdrop and trap it inside
          the board. Same reason ConfirmModal carries the note it does. */}
      {promoting && (
        <div className="modal-backdrop" onClick={() => setPromoting(null)}>
          <div
            className={`modal promo-modal${flipped ? ' flipped' : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="confirm-title">Promote to</div>
            <div className="promo-row">
              {promoting.map((move) => (
                <button
                  key={move.promote}
                  className="promo-opt"
                  style={colourVars(state.turn)}
                  onClick={() => play(move)}
                >
                  <ChessPiece type={move.promote!} className="on-panel" />
                  <small>{PROMOTION_NAME[move.promote!]}</small>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ChessPanel({
  player,
  state,
  edge,
}: {
  player: PlayerId;
  state: ChessState;
  edge: number;
}) {
  const active = !state.winner && state.turn === player;
  const won = state.winner === player;
  const taken = state.capturedBy[player];
  const status =
    state.winner === 'draw'
      ? 'Draw'
      : won
        ? '🏆 Winner!'
        : state.winner
          ? state.ending === 'checkmate'
            ? 'Checkmate'
            : 'Good game'
          : active
            ? inCheck(state, player)
              ? 'Check!'
              : 'Your move'
            : 'Waiting…';

  return (
    <PlayerPanel
      player={player}
      active={active}
      won={won}
      status={status}
      score={edge > 0 ? `+${edge}` : undefined}
    >
      <div className="tray chess-tray">
        {taken.map((piece) => (
          <span key={piece.id} style={colourVars(other(player))}>
            <ChessPiece type={piece.type} className="taken on-panel" />
          </span>
        ))}
      </div>
    </PlayerPanel>
  );
}
