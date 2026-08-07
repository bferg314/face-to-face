/**
 * Connect Four engine.
 *
 * Seven columns, six rows, index = row * 7 + col with row 0 at the top. A move
 * is just a column: the disc falls to the lowest empty cell in it.
 *
 * Rule choices:
 *  - Four in a line wins — across, up, or either diagonal. A run of five or
 *    six counts too, and `winLine` carries the whole run so the board can mark
 *    every disc that made it.
 *  - A full board with no line is a draw, which is the only way to draw.
 */

export type PlayerId = 1 | 2;
export type Cell = PlayerId | null;

export const COLS = 7;
export const ROWS = 6;
/** Discs in a line needed to win. */
export const CONNECT = 4;

export interface C4State {
  board: Cell[];
  turn: PlayerId;
  winner: PlayerId | 'draw' | null;
  /** Where the last disc landed, for the drop animation and the marker. */
  lastMove: number | null;
  /** The discs that made the winning line, or empty. */
  winLine: number[];
}

export const idx = (row: number, col: number) => row * COLS + col;
export const rowOf = (i: number) => Math.floor(i / COLS);
export const colOf = (i: number) => i % COLS;
export const other = (p: PlayerId): PlayerId => (p === 1 ? 2 : 1);

export function newGame(): C4State {
  return {
    board: Array(COLS * ROWS).fill(null),
    turn: 1,
    winner: null,
    lastMove: null,
    winLine: [],
  };
}

/** The cell a disc dropped into this column would land on, or null if full. */
export function landingCell(board: Cell[], col: number): number | null {
  for (let row = ROWS - 1; row >= 0; row--) {
    if (board[idx(row, col)] === null) return idx(row, col);
  }
  return null;
}

/** The columns that still have room. Empty once the game is over. */
export function legalColumns(state: C4State): number[] {
  if (state.winner) return [];
  const cols: number[] = [];
  for (let col = 0; col < COLS; col++) {
    if (landingCell(state.board, col) !== null) cols.push(col);
  }
  return cols;
}

/** The four ways a line can run. Their opposites are walked as well. */
const LINES = [
  { dr: 0, dc: 1 }, // across
  { dr: 1, dc: 0 }, // up and down
  { dr: 1, dc: 1 }, // diagonal, falling right
  { dr: 1, dc: -1 }, // diagonal, rising right
] as const;

/**
 * The line of four or more through `cell`, if the disc there just made one.
 * Counts out from the cell both ways along each of the four directions.
 */
export function lineThrough(board: Cell[], cell: number): number[] {
  const player = board[cell];
  if (player === null) return [];

  for (const { dr, dc } of LINES) {
    const line = [cell];
    for (const sign of [1, -1]) {
      let row = rowOf(cell) + dr * sign;
      let col = colOf(cell) + dc * sign;
      while (
        row >= 0 &&
        row < ROWS &&
        col >= 0 &&
        col < COLS &&
        board[idx(row, col)] === player
      ) {
        line.push(idx(row, col));
        row += dr * sign;
        col += dc * sign;
      }
    }
    if (line.length >= CONNECT) return line.sort((a, b) => a - b);
  }
  return [];
}

/**
 * Columns where dropping now would win for the player to move — the hint, and
 * the same test the UI uses to warn about the reply.
 */
export function winningColumns(state: C4State, player: PlayerId): number[] {
  const cols: number[] = [];
  for (const col of legalColumns(state)) {
    const cell = landingCell(state.board, col)!;
    const board = state.board.slice();
    board[cell] = player;
    if (lineThrough(board, cell).length > 0) cols.push(col);
  }
  return cols;
}

export function applyMove(state: C4State, col: number): C4State {
  const cell = landingCell(state.board, col);
  if (cell === null) return state;

  const board = state.board.slice();
  board[cell] = state.turn;

  const winLine = lineThrough(board, cell);
  const next: C4State = { ...state, board, lastMove: cell, winLine };
  if (winLine.length > 0) {
    next.winner = state.turn;
    return next;
  }
  if (board.every((c) => c !== null)) {
    next.winner = 'draw';
    return next;
  }
  next.turn = other(state.turn);
  return next;
}
