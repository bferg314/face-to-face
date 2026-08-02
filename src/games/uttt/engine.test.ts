import { describe, expect, it } from 'vitest';
import {
  applyMove,
  boardsWon,
  legalBoards,
  legalCells,
  newGame,
  type UtttState,
} from './engine';

/** Global index of cell `c` in sub-board `b`. */
const at = (b: number, c: number) => b * 9 + c;

/**
 * Play a sequence of moves, asserting each one is legal first.
 *
 * `applyMove` trusts its caller (the UI gates on `legalCells`), so tests that
 * mean to describe real play have to check legality themselves — otherwise
 * they can assert about positions no game could reach.
 */
function playLegal(state: UtttState, ...cells: number[]) {
  return cells.reduce((s, cell) => {
    expect(legalCells(s), `cell ${cell} must be legal`).toContain(cell);
    return applyMove(s, cell);
  }, state);
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
    const s = playLegal(newGame(), at(0, 5));
    expect(s.activeBoard).toBe(5);
    expect(legalBoards(s)).toEqual([5]);
    expect(legalCells(s)).toEqual([45, 46, 47, 48, 49, 50, 51, 52, 53]);
  });

  it('confines the opponent to the same board when cell index equals board index', () => {
    const s = playLegal(newGame(), at(4, 4));
    expect(s.activeBoard).toBe(4);
    expect(legalCells(s)).not.toContain(at(4, 4));
    expect(legalCells(s)).toHaveLength(8);
    expect(legalCells(s).every((i) => Math.floor(i / 9) === 4)).toBe(true);
  });
});

describe('winning a sub-board', () => {
  /**
   * A fully legal game in which player 1 takes board 0's top row. Player 2 is
   * shuttled through boards 3, 1 and 2, each time playing the cell that sends
   * player 1 back into board 0.
   */
  const wonBoard0 = () =>
    playLegal(
      newGame(),
      at(3, 3), // p1 free opening -> p2 to board 3
      at(3, 0), // p2 -> p1 to board 0
      at(0, 1), // p1 takes 0.1 -> p2 to board 1
      at(1, 0), // p2 -> p1 to board 0
      at(0, 2), // p1 takes 0.2 -> p2 to board 2
      at(2, 0), // p2 -> p1 to board 0
      at(0, 0), // p1 takes 0.0 and wins board 0
    );

  it('records the winner, the deciding board, and the winning line', () => {
    const s = wonBoard0();
    expect(s.boards[0]).toBe(1);
    expect(s.lastMove?.decided).toBe(0);
    expect(s.lastMove?.line).toEqual([at(0, 0), at(0, 1), at(0, 2)]);
    expect(boardsWon(s)).toEqual({ 1: 1, 2: 0 });
    expect(s.winner).toBeNull(); // one board is not the game
  });

  it('closes the won board and frees whoever is sent there', () => {
    const s = wonBoard0();
    // That winning move was cell 0, which points back at board 0 — already
    // won, so player 2 gets a free move rather than being stuck.
    expect(s.activeBoard).toBeNull();
    expect(legalBoards(s)).not.toContain(0);
    expect(legalBoards(s)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    // The won board's empty cells are no longer playable.
    expect(legalCells(s).some((i) => Math.floor(i / 9) === 0)).toBe(false);
    expect(s.cells[at(0, 4)]).toBeNull(); // still empty, just closed
  });
});

describe('free moves', () => {
  it('never leaves a player with no legal move while the game is live', () => {
    // Deterministic playouts, each preferring a different legal cell, so the
    // invariant is checked across a range of real games rather than one line.
    for (const pick of [0, 1, 2, 3]) {
      let s = newGame();
      let guard = 0;
      while (!s.winner && guard++ < 81) {
        const cells = legalCells(s);
        expect(cells.length, `pick=${pick} guard=${guard}`).toBeGreaterThan(0);
        s = applyMove(s, cells[Math.min(pick, cells.length - 1)]);
      }
      expect(s.winner).not.toBeNull();
      expect(legalCells(s)).toEqual([]);
      expect(legalBoards(s)).toEqual([]);
    }
  });

  it('reaches drawn sub-boards in real play, and they count for nobody', () => {
    // Walk deterministic playouts until one produces a filled-but-unwon board.
    let found: UtttState | null = null;
    for (let pick = 0; pick < 9 && !found; pick++) {
      let s = newGame();
      let guard = 0;
      while (!s.winner && guard++ < 81) {
        const cells = legalCells(s);
        s = applyMove(s, cells[Math.min(pick, cells.length - 1)]);
        if (s.boards.includes('draw')) {
          found = s;
          break;
        }
      }
    }
    expect(found, 'expected some playout to fill a board without a winner').not.toBeNull();
    const drawn = found!.boards.indexOf('draw');
    expect(legalBoards(found!)).not.toContain(drawn);
    // A drawn board contributes to neither player's score.
    const score = boardsWon(found!);
    expect(score[1] + score[2]).toBe(
      found!.boards.filter((r) => r === 1 || r === 2).length,
    );
  });
});

describe('winning the game', () => {
  // These use constructed positions rather than long play sequences: the point
  // is how applyMove resolves the macro board, not how the position arose.
  it('wins on three won sub-boards in a row', () => {
    const s: UtttState = {
      ...newGame(),
      boards: [1, 1, null, 2, 2, null, null, null, null],
      activeBoard: 2,
      turn: 1,
    };
    // Player 1 takes board 2's top row with the move under test.
    const cells = s.cells.slice();
    cells[at(2, 0)] = 1;
    cells[at(2, 1)] = 1;
    const after = applyMove({ ...s, cells }, at(2, 2));

    expect(after.boards[2]).toBe(1);
    expect(after.winner).toBe(1);
    expect(after.winLine).toEqual([0, 1, 2]);
    expect(legalCells(after)).toEqual([]);
    expect(legalBoards(after)).toEqual([]);
  });

  it('wins on a column and on a diagonal', () => {
    const column: UtttState = {
      ...newGame(),
      boards: [1, 2, null, 1, 2, null, null, null, null],
      turn: 1,
    };
    const cCells = column.cells.slice();
    cCells[at(6, 0)] = 1;
    cCells[at(6, 1)] = 1;
    expect(applyMove({ ...column, cells: cCells }, at(6, 2)).winLine).toEqual([0, 3, 6]);

    const diagonal: UtttState = {
      ...newGame(),
      boards: [1, 2, null, null, 1, 2, null, null, null],
      turn: 1,
    };
    const dCells = diagonal.cells.slice();
    dCells[at(8, 0)] = 1;
    dCells[at(8, 1)] = 1;
    expect(applyMove({ ...diagonal, cells: dCells }, at(8, 2)).winLine).toEqual([0, 4, 8]);
  });

  it('treats a drawn sub-board as neutral in a line', () => {
    // Boards 0 and 2 belong to player 1, board 1 is drawn: not a line.
    const s: UtttState = {
      ...newGame(),
      boards: [1, 'draw', 1, null, null, null, null, null, null],
      activeBoard: 3,
      turn: 1,
    };
    const after = applyMove(s, at(3, 0));
    expect(after.winner).toBeNull();
    expect(after.winLine).toBeNull();
  });

  it('draws when all nine boards are decided with no line', () => {
    // Eight boards decided with no line; the move under test fills the ninth
    // without completing one.
    const cells = Array(81).fill(null);
    //   board 8:  1 2 1 / 1 2 2 / 2 1 _   -> last cell gives 2 1 1, no line
    const b8 = [1, 2, 1, 1, 2, 2, 2, 1, null];
    for (let c = 0; c < 9; c++) cells[at(8, c)] = b8[c];

    const s: UtttState = {
      ...newGame(),
      cells,
      boards: [1, 2, 1, 2, 1, 2, 2, 1, null],
      activeBoard: 8,
      turn: 1,
    };
    const after = applyMove(s, at(8, 8));
    expect(after.boards[8]).toBe('draw');
    expect(after.winner).toBe('draw');
    expect(after.winLine).toBeNull();
  });
});

describe('purity', () => {
  it('does not mutate the state it is given (the undo stack holds references)', () => {
    const before = playLegal(newGame(), at(4, 4));
    const cellsCopy = before.cells.slice();
    const boardsCopy = before.boards.slice();

    applyMove(before, at(4, 0));

    expect(before.cells).toEqual(cellsCopy);
    expect(before.boards).toEqual(boardsCopy);
    expect(before.activeBoard).toBe(4);
    expect(before.turn).toBe(2);
  });
});
