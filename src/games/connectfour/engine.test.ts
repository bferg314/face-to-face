import { describe, expect, it } from 'vitest';
import {
  COLS,
  ROWS,
  applyMove,
  colOf,
  idx,
  landingCell,
  legalColumns,
  lineThrough,
  newGame,
  rowOf,
  winningColumns,
  type C4State,
} from './engine';

/** Drop discs down the columns named, in turn. */
const drop = (state: C4State, ...cols: number[]) =>
  cols.reduce((s, col) => {
    expect(legalColumns(s), `column ${col} must have room`).toContain(col);
    return applyMove(s, col);
  }, state);

/** The bottom row of the board, where the first disc in a column lands. */
const bottom = (col: number) => idx(ROWS - 1, col);

describe('newGame', () => {
  it('starts empty with player 1 to drop', () => {
    const s = newGame();
    expect(s.board).toHaveLength(COLS * ROWS);
    expect(s.board.every((c) => c === null)).toBe(true);
    expect(s.turn).toBe(1);
    expect(s.winner).toBeNull();
    expect(s.winLine).toEqual([]);
    expect(legalColumns(s)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
});

describe('dropping', () => {
  it('falls to the bottom of an empty column', () => {
    const s = drop(newGame(), 3);
    expect(s.board[bottom(3)]).toBe(1);
    expect(rowOf(s.lastMove!)).toBe(ROWS - 1);
    expect(s.turn).toBe(2);
  });

  it('stacks on top of what is already there', () => {
    const s = drop(newGame(), 3, 3, 3);
    expect(s.board[bottom(3)]).toBe(1);
    expect(s.board[idx(ROWS - 2, 3)]).toBe(2);
    expect(s.board[idx(ROWS - 3, 3)]).toBe(1);
    // Nothing lands anywhere but that column.
    expect(s.board.filter((c) => c !== null)).toHaveLength(3);
  });

  it('closes a column once it is full, and leaves the rest open', () => {
    let s = newGame();
    for (let i = 0; i < ROWS; i++) s = drop(s, 0);
    expect(landingCell(s.board, 0)).toBeNull();
    expect(legalColumns(s)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(applyMove(s, 0)).toBe(s); // a full column is not a move
  });
});

describe('winning lines', () => {
  it('wins across the bottom', () => {
    // Player 1 takes 0-3 along the floor; player 2 answers in column 6.
    const s = drop(newGame(), 0, 6, 1, 6, 2, 6, 3);
    expect(s.winner).toBe(1);
    expect(s.winLine).toEqual([0, 1, 2, 3].map(bottom));
    expect(legalColumns(s)).toEqual([]);
  });

  it('wins straight up a column', () => {
    const s = drop(newGame(), 2, 3, 2, 3, 2, 3, 2);
    expect(s.winner).toBe(1);
    expect(s.winLine).toEqual([
      idx(ROWS - 4, 2),
      idx(ROWS - 3, 2),
      idx(ROWS - 2, 2),
      bottom(2),
    ].sort((a, b) => a - b));
  });

  it('wins on a diagonal', () => {
    // A staircase: 1 climbs columns 0-3, 2 fills underneath.
    const s = drop(newGame(), 0, 1, 1, 2, 2, 3, 2, 3, 3, 6, 3);
    expect(s.winner).toBe(1);
    expect(s.winLine).toHaveLength(4);
    // One row down for each step along, the same way the whole line — which
    // way it leans depends on the staircase, and either is a win.
    const cells = s.winLine.map((c) => ({ r: rowOf(c), c: colOf(c) }));
    const lean = cells[1].c - cells[0].c;
    expect(Math.abs(lean)).toBe(1);
    for (let i = 1; i < cells.length; i++) {
      expect(cells[i].c - cells[i - 1].c).toBe(lean);
      expect(cells[i].r - cells[i - 1].r).toBe(1);
    }
  });

  it('counts a run of five as one line', () => {
    // 1 fills 0,1,3,4 along the floor and then drops into the gap at 2.
    const s = drop(newGame(), 0, 0, 1, 1, 3, 3, 4, 4, 2);
    expect(s.winner).toBe(1);
    expect(s.winLine).toEqual([0, 1, 2, 3, 4].map(bottom));
  });

  it('does not join two players’ discs into a line', () => {
    const s = drop(newGame(), 0, 1, 2, 3, 4);
    expect(s.winner).toBeNull();
    expect(lineThrough(s.board, bottom(2))).toEqual([]);
  });

  it('stops the game dead once won', () => {
    const s = drop(newGame(), 0, 6, 1, 6, 2, 6, 3);
    expect(s.winner).toBe(1);
    // The turn never leaves the winner, and there is nothing left to offer.
    expect(s.turn).toBe(1);
    expect(legalColumns(s)).toEqual([]);
    expect(winningColumns(s, 1)).toEqual([]);
    expect(winningColumns(s, 2)).toEqual([]);
  });
});

describe('hints', () => {
  it('points out a column that wins right now', () => {
    const s = drop(newGame(), 0, 6, 1, 6, 2);
    expect(winningColumns(s, 1)).toEqual([3]);
    // And sees the same for the other player, which is how a threat is spotted.
    expect(winningColumns(s, 2)).toEqual([]);
  });

  it('spots a winning drop that lands on top of a stack', () => {
    // 1 has three going up column 4; the fourth lands on the pile.
    const s = drop(newGame(), 4, 5, 4, 5, 4, 5);
    expect(winningColumns(s, 1)).toContain(4);
    expect(winningColumns(s, 2)).toContain(5);
  });
});

describe('draws', () => {
  /**
   * Stripes that lean: the colour follows the row, and shifts every second
   * column. That gives runs of at most two in every direction — across, up,
   * and both diagonals — so a board filled this way has no line anywhere.
   */
  const striped = (i: number) =>
    ((rowOf(i) + Math.floor(colOf(i) / 2)) % 2 === 0 ? 1 : 2) as 1 | 2;

  it('is possible to fill the board with no line at all', () => {
    const board = Array.from({ length: COLS * ROWS }, (_, i) => striped(i));
    expect(board.every((_, i) => lineThrough(board, i).length === 0)).toBe(true);
  });

  it('ends in a draw when the last disc fills the board', () => {
    const lastCell = idx(0, COLS - 1);
    const state: C4State = {
      ...newGame(),
      board: Array.from({ length: COLS * ROWS }, (_, i) =>
        i === lastCell ? null : striped(i),
      ),
      turn: striped(lastCell),
    };
    expect(legalColumns(state)).toEqual([COLS - 1]);

    const done = applyMove(state, COLS - 1);
    expect(done.board.every((c) => c !== null)).toBe(true);
    expect(done.winner).toBe('draw');
    expect(done.winLine).toEqual([]);
    expect(legalColumns(done)).toEqual([]);
  });
});
