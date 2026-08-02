import { describe, expect, it } from 'vitest';
import {
  applyMove,
  boardsWon,
  legalBoards,
  legalCells,
  newGame,
  type UtttState,
} from './engine';

/** Play a sequence of global cell indices in order. */
const play = (state: UtttState, ...cells: number[]) =>
  cells.reduce((s, cell) => applyMove(s, cell), state);

/** Global index of cell `c` in sub-board `b`. */
const at = (b: number, c: number) => b * 9 + c;

/**
 * Win sub-board `b` for the player to move, using cells 0/1/2, while the
 * opponent replies in the throwaway board `dump` (which the moves also keep
 * sending them back to). Returns the state after the winning move.
 */
function winTopRow(state: UtttState, b: number, dump: number) {
  // Mover takes b0, b1, b2; opponent replies inside `dump` each time.
  return play(
    state,
    at(b, 0),
    at(dump, 0),
    at(b, 1),
    at(dump, 1),
    at(b, 2),
  );
}

describe('newGame', () => {
  it('starts empty, with a free first move for player 1', () => {
    const s = newGame();
    expect(s.cells).toHaveLength(81);
    expect(s.cells.every((c) => c === null)).toBe(true);
    expect(s.boards).toEqual(Array(9).fill(null));
    expect(s.activeBoard).toBeNull();
    expect(s.turn).toBe(1);
    expect(s.winner).toBeNull();
    expect(s.lastMove).toBeNull();
    expect(legalBoards(s)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(legalCells(s)).toHaveLength(81);
  });
});

describe('send-to-board', () => {
  it('sends the opponent to the sub-board matching the cell played', () => {
    const s = applyMove(newGame(), at(0, 5));
    expect(s.activeBoard).toBe(5);
    expect(legalBoards(s)).toEqual([5]);
    expect(legalCells(s)).toEqual([45, 46, 47, 48, 49, 50, 51, 52, 53]);
  });

  it('confines the opponent to the same board when cell index equals board index', () => {
    const s = applyMove(newGame(), at(4, 4));
    expect(s.activeBoard).toBe(4);
    // The cell just played is no longer available, but the rest of board 4 is.
    expect(legalCells(s)).not.toContain(at(4, 4));
    expect(legalCells(s)).toHaveLength(8);
    expect(legalCells(s).every((i) => Math.floor(i / 9) === 4)).toBe(true);
  });
});

describe('sub-boards', () => {
  it('records the winner, the deciding board, and the winning line', () => {
    const s = winTopRow(newGame(), 0, 8);
    expect(s.boards[0]).toBe(1);
    expect(s.lastMove?.decided).toBe(0);
    expect(s.lastMove?.line).toEqual([at(0, 0), at(0, 1), at(0, 2)]);
    expect(boardsWon(s)).toEqual({ 1: 1, 2: 0 });
  });

  it('closes a won board — its empty cells are no longer playable', () => {
    let s = winTopRow(newGame(), 0, 8);
    expect(s.boards[0]).toBe(1);
    // That last move (cell 2) sent player 2 to board 2; get them to send
    // player 1 back to the won board 0.
    s = applyMove(s, at(2, 0));
    expect(s.activeBoard).toBeNull(); // board 0 is won => free move
    expect(legalBoards(s)).not.toContain(0);
    expect(legalCells(s).some((i) => Math.floor(i / 9) === 0)).toBe(false);
  });

  it('marks a full board with no winner as a draw owned by nobody', () => {
    // Fill board 0 with no three-in-a-row:
    //   1 1 2
    //   2 2 1
    //   1 2 1
    // Each move sends the opponent somewhere; we bounce them through board 0
    // by always replying inside it, which the alternation below arranges.
    const order = [0, 3, 1, 2, 4, 5, 8, 7, 6];
    let s = newGame();
    // Prime: player 1 must be sent into board 0 to start.
    s = applyMove(s, at(1, 0)); // p1 plays elsewhere, sends p2 to board 0
    for (const c of order) {
      if (s.cells[at(0, c)] !== null) continue;
      s = applyMove(s, at(0, c));
      // Send the opponent straight back to board 0 unless it is finished.
      if (s.boards[0] === null) s = applyMove(s, at(c, 0));
    }
    expect(s.boards[0]).toBe('draw');
    expect(boardsWon(s)).toEqual({ 1: 0, 2: 0 });
  });
});

describe('free moves', () => {
  it('frees the mover when sent to a won board', () => {
    let s = winTopRow(newGame(), 3, 8); // p1 wins board 3
    // Get someone to play cell 3 so the opponent is sent to won board 3.
    s = applyMove(s, at(2, 3)); // p2 plays cell 3 -> would send p1 to board 3
    expect(s.boards[3]).toBe(1);
    expect(s.activeBoard).toBeNull();
    expect(legalBoards(s)).not.toContain(3);
    expect(legalBoards(s).length).toBeGreaterThan(1);
  });

  it('never leaves a player with no legal move while the game is live', () => {
    // Random-ish but deterministic playout: always take the first legal cell.
    let s = newGame();
    let guard = 0;
    while (!s.winner && guard++ < 81) {
      const cells = legalCells(s);
      expect(cells.length).toBeGreaterThan(0);
      s = applyMove(s, cells[0]);
    }
    expect(s.winner).not.toBeNull();
    expect(legalCells(s)).toEqual([]);
  });
});

describe('winning', () => {
  it('wins the game on three won sub-boards in a row', () => {
    // Player 1 wins boards 0, 1, 2 (the top row of the macro grid).
    // Board 8 is the dump where player 2 replies.
    let s = newGame();
    for (const b of [0, 1, 2]) {
      s = winTopRow(s, b, 8);
      if (s.winner) break;
      // Hand the turn back to player 1 via a reply that sends them onward.
      if (s.turn === 2) s = applyMove(s, at(s.activeBoard ?? 8, 8));
    }
    expect(s.winner).toBe(1);
    expect(s.winLine).toEqual([0, 1, 2]);
    expect(legalCells(s)).toEqual([]);
    expect(legalBoards(s)).toEqual([]);
  });

  it('treats a drawn sub-board as neutral in a line', () => {
    // Hand-built state: boards 0 and 2 won by player 1, board 1 drawn.
    const s: UtttState = {
      ...newGame(),
      boards: [1, 'draw', 1, null, null, null, null, null, null],
    };
    // Player 1 completing nothing new: the top row is not a win for anyone.
    const after = applyMove({ ...s, activeBoard: 3, turn: 1 }, at(3, 0));
    expect(after.winner).toBeNull();
  });

  it('draws when all nine boards are decided with no line', () => {
    // Boards alternate so no player owns a line; the last one is filled by
    // the move under test.
    const boards: UtttState['boards'] = [1, 2, 1, 2, 1, 2, 2, 1, null];
    const cells = Array(81).fill(null);
    // Board 8 needs to fill without a three-in-a-row on the final move.
    //   1 2 1
    //   1 2 2
    //   2 1 _   <- cell 8 played last, giving 2 1 1: no line
    const b8 = [1, 2, 1, 1, 2, 2, 2, 1, null];
    for (let c = 0; c < 9; c++) cells[at(8, c)] = b8[c];

    const s: UtttState = {
      ...newGame(),
      cells,
      boards,
      activeBoard: 8,
      turn: 1,
    };
    const after = applyMove(s, at(8, 8));
    expect(after.boards[8]).toBe('draw');
    expect(after.winner).toBe('draw');
  });
});

describe('purity', () => {
  it('does not mutate the state it is given (the undo stack holds references)', () => {
    const before = applyMove(newGame(), at(4, 4));
    const cellsCopy = before.cells.slice();
    const boardsCopy = before.boards.slice();

    applyMove(before, at(4, 0));

    expect(before.cells).toEqual(cellsCopy);
    expect(before.boards).toEqual(boardsCopy);
    expect(before.activeBoard).toBe(4);
    expect(before.turn).toBe(2);
  });
});
