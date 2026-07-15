/**
 * Reversi (Othello) engine.
 *
 * Board is a flat array of 64 cells, index = row * 8 + col, row 0 at the top.
 * A cell holds the id of the player whose disc occupies it, or null.
 * Player 1 (the darker disc color) moves first, per standard rules.
 */

export type PlayerId = 1 | 2;
export type Cell = PlayerId | null;

export interface ReversiMove {
  to: number;
  /** Cells whose discs flip to the mover's color. Always non-empty. */
  flips: number[];
}

export interface ReversiState {
  board: Cell[];
  turn: PlayerId;
  winner: PlayerId | 'draw' | null;
  lastMove: number | null;
  lastFlips: number[];
  /** Player who had no legal move and was passed over, or null. */
  passed: PlayerId | null;
}

export const SIZE = 8;

export const idx = (row: number, col: number) => row * SIZE + col;
export const rowOf = (i: number) => Math.floor(i / SIZE);
export const colOf = (i: number) => i % SIZE;
export const other = (p: PlayerId): PlayerId => (p === 1 ? 2 : 1);

const inBounds = (row: number, col: number) =>
  row >= 0 && row < SIZE && col >= 0 && col < SIZE;

const DIRS = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
] as const;

export function newGame(): ReversiState {
  const board: Cell[] = Array(SIZE * SIZE).fill(null);
  board[idx(3, 3)] = 2;
  board[idx(3, 4)] = 1;
  board[idx(4, 3)] = 1;
  board[idx(4, 4)] = 2;
  return {
    board,
    turn: 1,
    winner: null,
    lastMove: null,
    lastFlips: [],
    passed: null,
  };
}

function flipsFor(board: Cell[], to: number, player: PlayerId): number[] {
  const r = rowOf(to);
  const c = colOf(to);
  const flips: number[] = [];
  for (const [dr, dc] of DIRS) {
    const line: number[] = [];
    let rr = r + dr;
    let cc = c + dc;
    while (inBounds(rr, cc) && board[idx(rr, cc)] === other(player)) {
      line.push(idx(rr, cc));
      rr += dr;
      cc += dc;
    }
    if (line.length > 0 && inBounds(rr, cc) && board[idx(rr, cc)] === player) {
      flips.push(...line);
    }
  }
  return flips;
}

export function movesFor(board: Cell[], player: PlayerId): ReversiMove[] {
  const moves: ReversiMove[] = [];
  for (let i = 0; i < board.length; i++) {
    if (board[i] !== null) continue;
    const flips = flipsFor(board, i, player);
    if (flips.length > 0) moves.push({ to: i, flips });
  }
  return moves;
}

export function counts(board: Cell[]): Record<PlayerId, number> {
  const c: Record<PlayerId, number> = { 1: 0, 2: 0 };
  for (const cell of board) if (cell !== null) c[cell]++;
  return c;
}

export function applyMove(state: ReversiState, move: ReversiMove): ReversiState {
  const board = state.board.slice();
  board[move.to] = state.turn;
  for (const f of move.flips) board[f] = state.turn;

  const next: ReversiState = {
    ...state,
    board,
    lastMove: move.to,
    lastFlips: move.flips,
    passed: null,
  };

  const opp = other(state.turn);
  if (movesFor(board, opp).length > 0) {
    next.turn = opp;
    return next;
  }
  if (movesFor(board, state.turn).length > 0) {
    next.passed = opp; // opponent passes; mover goes again
    return next;
  }
  const score = counts(board);
  next.winner = score[1] === score[2] ? 'draw' : score[1] > score[2] ? 1 : 2;
  return next;
}
