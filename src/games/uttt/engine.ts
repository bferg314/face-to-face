/**
 * Ultimate Tic-Tac-Toe engine.
 *
 * The board is nine 3x3 sub-boards arranged in a 3x3 grid. Cells are a flat
 * array of 81 where `index = board * 9 + cell`; both `board` and `cell` are
 * 0-8 in row-major order. That encoding makes the central rule a one-liner:
 * playing cell `c` sends the opponent to sub-board `c`.
 *
 * Rule choices (this game has several common variants):
 *  - A won sub-board is closed — no further moves in it, even in empty cells.
 *    This keeps the invariant "open board => has an empty cell", so a player
 *    can never be left with no legal move.
 *  - A full sub-board with no winner is decided but owned by nobody
 *    ('draw'); it counts toward neither player's line.
 *  - Being sent to a decided board grants a free move: any open board.
 *  - The first move of the game is free.
 *  - The game is drawn when all nine sub-boards are decided with no line.
 *    Deliberately no reachability analysis — calling a draw early because no
 *    line is still possible would be surprising mid-game, so play continues
 *    until the boards run out.
 */

export type PlayerId = 1 | 2;
export type Mark = PlayerId | null;

/** null = still open, a PlayerId = won, 'draw' = full with no winner. */
export type BoardResult = PlayerId | 'draw' | null;

export interface UtttState {
  /** 81 cells, index = board * 9 + cell. */
  cells: Mark[];
  /** Result of each of the nine sub-boards. */
  boards: BoardResult[];
  /** Sub-board the mover is confined to, or null for a free move. */
  activeBoard: number | null;
  turn: PlayerId;
  winner: PlayerId | 'draw' | null;
  /** The three sub-board indices that won the game, or null. */
  winLine: number[] | null;
  lastMove: {
    cell: number;
    player: PlayerId;
    /** Sub-board this move decided (won or filled), or null. */
    decided: number | null;
    /** Global cell indices of the three-in-a-row that won it, or null. */
    line: number[] | null;
  } | null;
}

export const other = (p: PlayerId): PlayerId => (p === 1 ? 2 : 1);
export const boardOf = (i: number) => Math.floor(i / 9);
export const cellOf = (i: number) => i % 9;

/** The eight lines of a 3x3 grid. Used at both scales: cells and sub-boards. */
const LINES: ReadonlyArray<readonly [number, number, number]> = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

/** The line `player` completes in `grid`, or null. */
function lineFor<T>(grid: T[], player: T): readonly [number, number, number] | null {
  for (const line of LINES) {
    if (grid[line[0]] === player && grid[line[1]] === player && grid[line[2]] === player) {
      return line;
    }
  }
  return null;
}

export function newGame(): UtttState {
  return {
    cells: Array(81).fill(null),
    boards: Array(9).fill(null),
    activeBoard: null,
    turn: 1,
    winner: null,
    winLine: null,
    lastMove: null,
  };
}

/**
 * Sub-boards the mover may play in: one when confined, every open board on a
 * free move. Exported separately from `legalCells` because the board
 * highlight is a rule display rather than a hint — the UI needs it even with
 * hints switched off.
 */
export function legalBoards(state: UtttState): number[] {
  if (state.winner) return [];
  if (state.activeBoard !== null && state.boards[state.activeBoard] === null) {
    return [state.activeBoard];
  }
  const open: number[] = [];
  for (let b = 0; b < 9; b++) if (state.boards[b] === null) open.push(b);
  return open;
}

/** Global cell indices the mover may play. Empty once the game is over. */
export function legalCells(state: UtttState): number[] {
  const cells: number[] = [];
  for (const b of legalBoards(state)) {
    for (let c = 0; c < 9; c++) {
      const i = b * 9 + c;
      if (state.cells[i] === null) cells.push(i);
    }
  }
  return cells;
}

/** Sub-boards won by each player, for the panel score and the win card. */
export function boardsWon(state: UtttState): Record<PlayerId, number> {
  let p1 = 0;
  let p2 = 0;
  for (const r of state.boards) {
    if (r === 1) p1++;
    else if (r === 2) p2++;
  }
  return { 1: p1, 2: p2 };
}

/**
 * Play `cell`. Assumes it is legal — the UI gates on `legalCells`, matching
 * how the other engines in this app work. Returns a new state; never mutates.
 */
export function applyMove(state: UtttState, cell: number): UtttState {
  const player = state.turn;
  const b = boardOf(cell);
  const c = cellOf(cell);

  const cells = state.cells.slice();
  cells[b * 9 + c] = player;

  // Resolve the sub-board that was just played in.
  const sub = cells.slice(b * 9, b * 9 + 9);
  const subLine = lineFor(sub, player as Mark);
  const boards = state.boards.slice();
  let decided: number | null = null;
  let line: number[] | null = null;

  if (subLine) {
    boards[b] = player;
    decided = b;
    line = subLine.map((k) => b * 9 + k);
  } else if (sub.every((m) => m !== null)) {
    boards[b] = 'draw';
    decided = b;
  }

  // Resolve the game.
  let winner: UtttState['winner'] = null;
  let winLine: number[] | null = null;
  const gameLine = lineFor(boards, player as BoardResult);
  if (gameLine) {
    winner = player;
    winLine = [...gameLine];
  } else if (boards.every((r) => r !== null)) {
    winner = 'draw';
  }

  // The cell just played names the sub-board the opponent is sent to. If that
  // board is already decided they may play anywhere. Note this can send them
  // back into the same board, when c === b and board b is still open.
  const activeBoard = boards[c] === null ? c : null;

  return {
    cells,
    boards,
    activeBoard,
    turn: other(player),
    winner,
    winLine,
    lastMove: { cell, player, decided, line },
  };
}
