import { describe, expect, it } from 'vitest';
import {
  applyMove,
  counts,
  idx,
  movesFor,
  newGame,
  other,
  type Cell,
  type ReversiState,
} from './engine';

/** Look up the legal move landing on `to`, failing the test if there isn't one. */
function moveTo(state: ReversiState, to: number) {
  const move = movesFor(state.board, state.turn).find((m) => m.to === to);
  expect(move, `expected a legal move to ${to}`).toBeDefined();
  return move!;
}

const play = (state: ReversiState, to: number) => applyMove(state, moveTo(state, to));

/** Build a board from a picture: '.' empty, '1'/'2' a player's disc. */
function board(rows: string[]): Cell[] {
  const cells: Cell[] = [];
  for (const row of rows) {
    for (const ch of row.replace(/\s/g, '')) {
      cells.push(ch === '1' ? 1 : ch === '2' ? 2 : null);
    }
  }
  expect(cells).toHaveLength(64);
  return cells;
}

/**
 * Deterministic playout preferring the `pick`th legal move, stopping when
 * `stop` is satisfied or the game ends.
 */
function playout(pick: number, stop: (s: ReversiState) => boolean = () => false) {
  let s = newGame();
  let guard = 0;
  while (!s.winner && guard++ < 64) {
    const moves = movesFor(s.board, s.turn);
    if (moves.length === 0) break;
    s = applyMove(s, moves[Math.min(pick, moves.length - 1)]);
    if (stop(s)) return s;
  }
  return s;
}

describe('newGame', () => {
  it('sets up the four centre discs with player 1 to move', () => {
    const s = newGame();
    expect(s.board[idx(3, 3)]).toBe(2);
    expect(s.board[idx(3, 4)]).toBe(1);
    expect(s.board[idx(4, 3)]).toBe(1);
    expect(s.board[idx(4, 4)]).toBe(2);
    expect(counts(s.board)).toEqual({ 1: 2, 2: 2 });
    expect(s.turn).toBe(1);
    expect(s.winner).toBeNull();
  });

  it('offers exactly the four standard opening moves', () => {
    // Each outflanks one of the two player-2 centre discs.
    const opening = movesFor(newGame().board, 1)
      .map((m) => m.to)
      .sort((a, b) => a - b);
    expect(opening).toEqual([idx(2, 3), idx(3, 2), idx(4, 5), idx(5, 4)]);
  });
});

describe('flipping', () => {
  it('flips the outflanked disc and hands over the turn', () => {
    const s = play(newGame(), idx(2, 3));
    expect(s.board[idx(2, 3)]).toBe(1);
    expect(s.board[idx(3, 3)]).toBe(1); // outflanked between (2,3) and (4,3)
    expect(s.board[idx(4, 4)]).toBe(2); // untouched, different line
    expect(counts(s.board)).toEqual({ 1: 4, 2: 1 });
    expect(s.turn).toBe(2);
    expect(s.lastMove).toBe(idx(2, 3));
    expect(s.lastFlips).toEqual([idx(3, 3)]);
  });

  it('flips in every direction at once', () => {
    // (4,2) is empty, ringed by player 2 discs, each backed by a player 1 disc.
    const ring: ReversiState = {
      ...newGame(),
      board: board([
        '........',
        '........',
        '11111...',
        '12221...',
        '12.21...',
        '12221...',
        '11111...',
        '........',
      ]),
      turn: 1,
    };
    const after = play(ring, idx(4, 2));
    for (const [r, c] of [
      [3, 1],
      [3, 2],
      [3, 3],
      [4, 1],
      [4, 3],
      [5, 1],
      [5, 2],
      [5, 3],
    ]) {
      expect(after.board[idx(r, c)], `(${r},${c}) should flip`).toBe(1);
    }
    expect(counts(after.board)[2]).toBe(0);
  });

  it('does not outflank across a gap', () => {
    const gapped = board([
      '........',
      '........',
      '........',
      '.1.2....',
      '........',
      '........',
      '........',
      '........',
    ]);
    expect(movesFor(gapped, 1).map((m) => m.to)).not.toContain(idx(3, 2));
  });

  it('never offers a move that flips nothing', () => {
    const s = playout(1);
    for (const player of [1, 2] as const) {
      for (const move of movesFor(s.board, player)) {
        expect(move.flips.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('passing', () => {
  it('passes a player with no move and lets the mover go again', () => {
    // Reached by real play rather than hand-built: pass positions are easy to
    // construct wrongly, and this proves the branch is reachable.
    const passed = playout(0, (s) => s.passed !== null);
    expect(passed.passed, 'expected a playout to force a pass').not.toBeNull();
    // The passed player is the one who is NOT to move: the mover goes again.
    expect(passed.turn).toBe(other(passed.passed!));
    expect(movesFor(passed.board, passed.passed!)).toHaveLength(0);
    expect(movesFor(passed.board, passed.turn).length).toBeGreaterThan(0);
    expect(passed.winner).toBeNull();
  });

  it('leaves the flag clear on an ordinary move', () => {
    // Note the flag is recomputed per move, not cleared on a schedule — the
    // same player can legitimately be passed over several turns running.
    expect(play(newGame(), idx(2, 3)).passed).toBeNull();
  });
});

describe('winning', () => {
  it('ends only when neither player can move', () => {
    for (const pick of [0, 1, 2]) {
      const end = playout(pick);
      expect(end.winner).not.toBeNull();
      expect(movesFor(end.board, 1)).toHaveLength(0);
      expect(movesFor(end.board, 2)).toHaveLength(0);
    }
  });

  it('scores the finished game by disc count', () => {
    for (const pick of [0, 1, 2]) {
      const end = playout(pick);
      const score = counts(end.board);
      const expected =
        score[1] === score[2] ? 'draw' : score[1] > score[2] ? 1 : 2;
      expect(end.winner).toBe(expected);
    }
  });

  it('calls an equal final board a draw', () => {
    // 30 v 33 with one empty cell; player 1 fills it and flips one disc,
    // landing exactly on 32-32.
    const s: ReversiState = {
      ...newGame(),
      board: board([
        '11111111',
        '11111111',
        '11111111',
        '1111112.',
        '22222222',
        '22222222',
        '22222222',
        '22222222',
      ]),
      turn: 1,
    };
    const after = play(s, idx(3, 7));
    expect(after.board.every((c) => c !== null)).toBe(true);
    expect(counts(after.board)).toEqual({ 1: 32, 2: 32 });
    expect(after.winner).toBe('draw');
  });
});

describe('purity', () => {
  it('does not mutate the state it is given', () => {
    const start = newGame();
    const snapshot = start.board.slice();
    play(start, idx(2, 3));
    expect(start.board).toEqual(snapshot);
    expect(start.turn).toBe(1);
    expect(start.lastMove).toBeNull();
  });
});
