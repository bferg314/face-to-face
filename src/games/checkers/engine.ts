/**
 * American checkers (English draughts) engine.
 *
 * Board is a flat array of 64 cells, index = row * 8 + col, row 0 at the top.
 * Player 1 starts at the bottom (rows 5–7) and moves up; Player 2 starts at
 * the top (rows 0–2) and moves down. Play happens on the dark squares.
 */

export type PlayerId = 1 | 2;

export interface Piece {
  /** Stable id assigned at setup, used for move animations in the UI. */
  id: number;
  player: PlayerId;
  king: boolean;
}

export type Cell = Piece | null;

export interface Move {
  from: number;
  to: number;
  /** Square index of the jumped piece, or null for a simple move. */
  captured: number | null;
}

export interface CheckersState {
  board: Cell[];
  turn: PlayerId;
  /** Square of a piece mid multi-jump that must continue capturing. */
  chain: number | null;
  winner: PlayerId | null;
  /** Pieces each player has captured from their opponent. */
  capturedBy: Record<PlayerId, Piece[]>;
  /** When true (standard rules), a capture must be taken if available. */
  forcedCapture: boolean;
  lastMove: Move | null;
}

export const SIZE = 8;

export const idx = (row: number, col: number) => row * SIZE + col;
export const rowOf = (i: number) => Math.floor(i / SIZE);
export const colOf = (i: number) => i % SIZE;
export const isDark = (row: number, col: number) => (row + col) % 2 === 1;
export const other = (p: PlayerId): PlayerId => (p === 1 ? 2 : 1);

const inBounds = (row: number, col: number) =>
  row >= 0 && row < SIZE && col >= 0 && col < SIZE;

const UP: ReadonlyArray<readonly [number, number]> = [
  [-1, -1],
  [-1, 1],
];
const DOWN: ReadonlyArray<readonly [number, number]> = [
  [1, -1],
  [1, 1],
];
const ALL: ReadonlyArray<readonly [number, number]> = [...UP, ...DOWN];

const directions = (piece: Piece) =>
  piece.king ? ALL : piece.player === 1 ? UP : DOWN;

export function newGame(forcedCapture: boolean): CheckersState {
  const board: Cell[] = Array(SIZE * SIZE).fill(null);
  let id = 0;
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < SIZE; c++)
      if (isDark(r, c)) board[idx(r, c)] = { id: id++, player: 2, king: false };
  for (let r = SIZE - 3; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      if (isDark(r, c)) board[idx(r, c)] = { id: id++, player: 1, king: false };
  return {
    board,
    turn: 1,
    chain: null,
    winner: null,
    capturedBy: { 1: [], 2: [] },
    forcedCapture,
    lastMove: null,
  };
}

/** All single-step moves (slides and jumps) for the piece on `from`. */
export function movesFrom(board: Cell[], from: number): Move[] {
  const piece = board[from];
  if (!piece) return [];
  const r = rowOf(from);
  const c = colOf(from);
  const moves: Move[] = [];
  for (const [dr, dc] of directions(piece)) {
    const r1 = r + dr;
    const c1 = c + dc;
    if (!inBounds(r1, c1)) continue;
    const neighbor = board[idx(r1, c1)];
    if (neighbor === null) {
      moves.push({ from, to: idx(r1, c1), captured: null });
    } else if (neighbor.player !== piece.player) {
      const r2 = r + 2 * dr;
      const c2 = c + 2 * dc;
      if (inBounds(r2, c2) && board[idx(r2, c2)] === null) {
        moves.push({ from, to: idx(r2, c2), captured: idx(r1, c1) });
      }
    }
  }
  return moves;
}

export function legalMoves(state: CheckersState): Move[] {
  if (state.winner) return [];
  if (state.chain !== null) {
    return movesFrom(state.board, state.chain).filter((m) => m.captured !== null);
  }
  const all: Move[] = [];
  for (let i = 0; i < state.board.length; i++) {
    const piece = state.board[i];
    if (piece && piece.player === state.turn) all.push(...movesFrom(state.board, i));
  }
  if (state.forcedCapture && all.some((m) => m.captured !== null)) {
    return all.filter((m) => m.captured !== null);
  }
  return all;
}

export function applyMove(state: CheckersState, move: Move): CheckersState {
  const board = state.board.slice();
  const mover = { ...board[move.from]! };
  board[move.from] = null;

  const capturedBy = { 1: state.capturedBy[1], 2: state.capturedBy[2] };
  if (move.captured !== null) {
    const victim = board[move.captured]!;
    capturedBy[state.turn] = [...capturedBy[state.turn], victim];
    board[move.captured] = null;
  }

  const toRow = rowOf(move.to);
  const crowned =
    !mover.king && (mover.player === 1 ? toRow === 0 : toRow === SIZE - 1);
  if (crowned) mover.king = true;
  board[move.to] = mover;

  const next: CheckersState = {
    ...state,
    board,
    capturedBy,
    lastMove: move,
    chain: null,
  };

  // Crowning ends the move even if further jumps would be available.
  const mustContinue =
    move.captured !== null &&
    !crowned &&
    movesFrom(board, move.to).some((m) => m.captured !== null);
  if (mustContinue) {
    next.chain = move.to;
    return next;
  }

  next.turn = other(state.turn);
  if (legalMoves(next).length === 0) {
    next.winner = state.turn;
  }
  return next;
}
