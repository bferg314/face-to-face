import { describe, expect, it } from 'vitest';
import {
  ADJACENT,
  MILLS,
  POINTS,
  POINT_COUNT,
  applyMove,
  applyRemoval,
  inMill,
  legalMoves,
  menOnBoard,
  millsAt,
  newGame,
  removableMen,
  type MorrisState,
} from './engine';

/**
 * Place or slide to each point in turn, asserting the move is legal first.
 *
 * `applyMove` trusts its caller (the UI gates on `legalMoves`), so tests that
 * mean to describe real play have to check legality themselves — otherwise
 * they can assert about positions no game could reach.
 *
 * A number is a placement or a slide to that point; a `[from, to]` pair is a
 * slide, and a `{ take: p }` is the removal owed after a mill.
 */
type Step = number | [number, number] | { take: number };

function play(state: MorrisState, ...steps: Step[]): MorrisState {
  return steps.reduce<MorrisState>((s, step) => {
    if (typeof step === 'object' && 'take' in step) {
      expect(removableMen(s), `point ${step.take} must be removable`).toContain(
        step.take,
      );
      return applyRemoval(s, step.take);
    }
    const move =
      typeof step === 'number'
        ? { from: null, to: step }
        : { from: step[0], to: step[1] };
    expect(
      legalMoves(s).some((m) => m.from === move.from && m.to === move.to),
      `move ${JSON.stringify(move)} must be legal`,
    ).toBe(true);
    return applyMove(s, move);
  }, state);
}

/** A state built directly, for endgames too long to reach by playing. */
function position(
  men: Partial<Record<number, 1 | 2>>,
  over: Partial<MorrisState> = {},
): MorrisState {
  const board = Array(POINT_COUNT).fill(null);
  for (const [p, owner] of Object.entries(men)) board[Number(p)] = owner;
  return {
    ...newGame(true),
    board,
    phase: 'move',
    inHand: { 1: 0, 2: 0 },
    ...over,
  };
}

describe('the board', () => {
  it('has 24 points on distinct lattice squares', () => {
    expect(POINTS).toHaveLength(POINT_COUNT);
    expect(new Set(POINTS.map((p) => `${p.x},${p.y}`)).size).toBe(POINT_COUNT);
    expect(POINTS.every((p) => p.x >= 0 && p.x <= 6 && p.y >= 0 && p.y <= 6)).toBe(true);
  });

  it('joins points only along drawn lines, symmetrically', () => {
    for (let p = 0; p < POINT_COUNT; p++) {
      for (const q of ADJACENT[p]) {
        expect(ADJACENT[q], `${q} should link back to ${p}`).toContain(p);
        // Neighbours share a row or a column, never a diagonal.
        const straight = POINTS[p].x === POINTS[q].x || POINTS[p].y === POINTS[q].y;
        expect(straight, `${p}-${q} must be a straight line`).toBe(true);
      }
    }
    // Corners have two neighbours, side midpoints three or four.
    expect(ADJACENT[0]).toEqual([1, 7]);
    expect(ADJACENT[1]).toEqual([0, 2, 9]);
    expect(ADJACENT[9]).toEqual([1, 8, 10, 17]);
    expect(ADJACENT[17]).toEqual([9, 16, 18]);
  });

  it('has sixteen mills, each three points in a line', () => {
    expect(MILLS).toHaveLength(16);
    for (const mill of MILLS) {
      expect(mill).toHaveLength(3);
      const sameRow = mill.every((p) => POINTS[p].y === POINTS[mill[0]].y);
      const sameCol = mill.every((p) => POINTS[p].x === POINTS[mill[0]].x);
      expect(sameRow || sameCol, `${mill} must be a line`).toBe(true);
    }
    // Every point belongs to exactly two mills: one along its ring, one across.
    for (let p = 0; p < POINT_COUNT; p++) {
      expect(MILLS.filter((m) => m.includes(p))).toHaveLength(2);
    }
  });
});

describe('newGame', () => {
  it('starts empty, with nine men each and player 1 placing', () => {
    const s = newGame(true);
    expect(s.board.every((c) => c === null)).toBe(true);
    expect(s.inHand).toEqual({ 1: 9, 2: 9 });
    expect(s.turn).toBe(1);
    expect(s.phase).toBe('place');
    expect(s.winner).toBeNull();
    expect(legalMoves(s)).toHaveLength(POINT_COUNT);
    expect(removableMen(s)).toEqual([]);
  });
});

describe('placing', () => {
  it('takes a man from the hand and passes the turn', () => {
    const s = play(newGame(true), 0);
    expect(s.board[0]).toBe(1);
    expect(s.inHand).toEqual({ 1: 8, 2: 9 });
    expect(s.turn).toBe(2);
    expect(s.phase).toBe('place');
  });

  it('offers only empty points', () => {
    const s = play(newGame(true), 0, 4);
    expect(legalMoves(s).map((m) => m.to)).not.toContain(0);
    expect(legalMoves(s).map((m) => m.to)).not.toContain(4);
    expect(legalMoves(s).every((m) => m.from === null)).toBe(true);
  });

  it('switches to sliding once both hands are empty', () => {
    // Eighteen placements down the two rings, with no mill closed: the men
    // alternate around the outer and middle rings.
    const order = [0, 8, 1, 9, 3, 11, 4, 12, 5, 13, 7, 15, 16, 18, 17, 19, 20, 22];
    const s = play(newGame(true), ...order);
    expect(s.inHand).toEqual({ 1: 0, 2: 0 });
    expect(s.phase).toBe('move');
    expect(s.millPoints).toEqual([]);
    expect(s.winner).toBeNull();
    expect(legalMoves(s).every((m) => m.from !== null)).toBe(true);
  });
});

describe('mills', () => {
  it('closing one holds the turn and asks for a man', () => {
    // Player 1 takes the top side of the outer ring: 0, 1, 2.
    const s = play(newGame(true), 0, 8, 1, 9, 2);
    expect(s.phase).toBe('remove');
    expect(s.turn).toBe(1);
    expect(s.millPoints).toEqual([0, 1, 2]);
    expect(millsAt(s.board, 1, 1)).toEqual([[0, 1, 2]]);
    expect(legalMoves(s)).toEqual([]);
    expect(removableMen(s)).toEqual([8, 9]);
  });

  it('removal takes the man and hands the turn over', () => {
    const s = play(newGame(true), 0, 8, 1, 9, 2, { take: 8 });
    expect(s.board[8]).toBeNull();
    expect(s.lastRemoved).toBe(8);
    expect(s.phase).toBe('place');
    expect(s.turn).toBe(2);
    expect(s.millPoints).toEqual([]);
    expect(menOnBoard(s.board, 2)).toBe(1);
  });

  it('spares men in a mill while any man stands outside one', () => {
    // Player 2 holds the mill 8-9-10 and one loose man on 15; player 1 slides
    // 3 → 2 to close 0-1-2 and may only take the loose man.
    const s = position({ 0: 1, 1: 1, 3: 1, 21: 1, 8: 2, 9: 2, 10: 2, 15: 2 });
    const milled = play(s, [3, 2]);
    expect(milled.phase).toBe('remove');
    expect(removableMen(milled)).toEqual([15]);
  });

  it('allows any man once every enemy man is in a mill', () => {
    const s = position({ 0: 1, 1: 1, 3: 1, 21: 1, 8: 2, 9: 2, 10: 2 });
    const milled = play(s, [3, 2]);
    expect(removableMen(milled)).toEqual([8, 9, 10]);
  });

  it('re-closes a mill the same man just left', () => {
    // 0-1-2 is player 1's mill; sliding 2 out to 3 and back closes it again.
    const s = position({ 0: 1, 1: 1, 2: 1, 8: 2, 9: 2, 15: 2 });
    const opened = play(s, [2, 3], [9, 17]);
    expect(inMill(opened.board, 0)).toBe(false);
    const reclosed = play(opened, [3, 2]);
    expect(reclosed.phase).toBe('remove');
    expect(reclosed.millPoints).toEqual([0, 1, 2]);
  });
});

describe('sliding', () => {
  it('moves along lines only', () => {
    const s = position({ 0: 1, 9: 1, 20: 1, 21: 1, 4: 2, 12: 2, 16: 2, 18: 2 });
    const from0 = legalMoves(s).filter((m) => m.from === 0);
    expect(from0.map((m) => m.to).sort((a, b) => a - b)).toEqual([1, 7]);
    // 9 sits on a spoke, so it reaches its ring neighbours and both rings.
    const from9 = legalMoves(s).filter((m) => m.from === 9);
    expect(from9.map((m) => m.to).sort((a, b) => a - b)).toEqual([1, 8, 10, 17]);
  });

  it('lets three men fly to any empty point when flying is on', () => {
    const s = position({ 0: 1, 9: 1, 20: 1, 4: 2, 12: 2, 16: 2, 18: 2 });
    const empties = s.board.filter((c) => c === null).length;
    expect(legalMoves(s)).toHaveLength(3 * empties);
    expect(legalMoves(s)).toContainEqual({ from: 0, to: 22 });
  });

  it('keeps three men walking when flying is off', () => {
    const s = position(
      { 0: 1, 9: 1, 20: 1, 4: 2, 12: 2, 16: 2, 18: 2 },
      { flying: false },
    );
    expect(legalMoves(s)).not.toContainEqual({ from: 0, to: 22 });
    expect(legalMoves(s).every((m) => ADJACENT[m.from!].includes(m.to))).toBe(true);
  });

  it('only flies at exactly three men', () => {
    const s = position({ 0: 1, 9: 1, 20: 1, 22: 1, 4: 2, 12: 2, 16: 2 });
    expect(legalMoves(s).every((m) => ADJACENT[m.from!].includes(m.to))).toBe(true);
  });
});

describe('endings', () => {
  it('loses the game at two men on the board', () => {
    // Player 1 slides 3 → 2 to close 0-1-2, then takes player 2's third man.
    const s = position({ 0: 1, 1: 1, 3: 1, 21: 1, 8: 2, 11: 2, 15: 2 });
    const done = play(s, [3, 2], { take: 8 });
    expect(done.winner).toBe(1);
    expect(done.ending).toBe('reduced');
    expect(legalMoves(done)).toEqual([]);
  });

  it('does not end the game at two men while men are still in hand', () => {
    const s = position(
      { 0: 1, 1: 1, 20: 1, 8: 2, 15: 2 },
      { phase: 'place', inHand: { 1: 4, 2: 4 } },
    );
    const done = play(s, 2, { take: 8 });
    expect(menOnBoard(done.board, 2)).toBe(1);
    expect(done.winner).toBeNull();
    expect(done.phase).toBe('place');
  });

  it('loses the game when every man is blocked', () => {
    // Player 2 sits on the three corners 0, 8 and 16; player 1 holds all six
    // of their neighbours. Flying is off, or three men would never be stuck.
    const s = position(
      { 0: 2, 8: 2, 16: 2, 1: 1, 7: 1, 9: 1, 15: 1, 17: 1, 23: 1, 20: 1 },
      { flying: false },
    );
    const done = play(s, [20, 21]);
    expect(done.turn).toBe(2);
    expect(legalMoves(done)).toEqual([]);
    expect(done.winner).toBe(1);
    expect(done.ending).toBe('blocked');
  });

  it('draws on the third repetition of a position', () => {
    // Both players shuffle one man back and forth: 0 ↔ 7 against 4 ↔ 5. The
    // position after player 1's 0 → 7 comes up for the third time on the ninth
    // ply, which is where the draw lands.
    const s = position({ 0: 1, 20: 1, 21: 1, 22: 1, 4: 2, 16: 2, 17: 2, 18: 2 });
    const shuffled = play(
      s,
      [0, 7], [4, 5], [7, 0], [5, 4],
      [0, 7], [4, 5], [7, 0], [5, 4],
      [0, 7],
    );
    expect(shuffled.winner).toBe('draw');
    expect(shuffled.ending).toBe('repetition');
  });

  it('draws after fifty moves with no mill and no man taken', () => {
    // Started one ply short of the limit: a quiet slide tips it over. Playing
    // out a hundred real plies would take a shuffle that never repeats a
    // position three times, which the repetition rule ends first by design.
    const s = position(
      { 0: 1, 20: 1, 21: 1, 22: 1, 4: 2, 16: 2, 17: 2, 18: 2 },
      { sinceAction: 99 },
    );
    const drawn = play(s, [0, 7]);
    expect(drawn.sinceAction).toBe(100);
    expect(drawn.winner).toBe('draw');
    expect(drawn.ending).toBe('no-mill');
  });

  it('resets the no-mill count when a mill is closed', () => {
    const s = position(
      { 0: 1, 1: 1, 3: 1, 21: 1, 8: 2, 9: 2, 10: 2, 15: 2 },
      { sinceAction: 99 },
    );
    const milled = play(s, [3, 2]);
    expect(milled.sinceAction).toBe(0);
    expect(milled.winner).toBeNull();
  });
});
