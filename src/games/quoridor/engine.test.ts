import { describe, expect, it } from 'vitest';
import {
  SIZE,
  applyMove,
  atGoal,
  blocked,
  distanceToGoal,
  idx,
  legalWalls,
  newGame,
  pawnMoves,
  wallId,
  type Orientation,
  type QuoridorState,
} from './engine';

/** Place walls straight into a state, for setting a position up. */
function withWalls(
  state: QuoridorState,
  ...walls: Array<[Orientation, number, number]>
): QuoridorState {
  const next = state.walls.slice();
  for (const [orient, r, c] of walls) next[wallId(orient, r, c)] = 1;
  return { ...state, walls: next };
}

const at = (state: QuoridorState, ...pawns: number[]): QuoridorState => ({
  ...state,
  pawns: Object.fromEntries(pawns.map((cell, i) => [i + 1, cell])) as QuoridorState['pawns'],
});

/** Play moves, asserting each is legal first. */
function play(state: QuoridorState, ...moves: Array<number | [Orientation, number, number]>) {
  return moves.reduce<QuoridorState>((s, move) => {
    if (typeof move === 'number') {
      expect(pawnMoves(s), `pawn to ${move} must be legal`).toContain(move);
      return applyMove(s, { kind: 'pawn', to: move });
    }
    const wall = wallId(...move);
    expect(legalWalls(s), `wall ${move} must be legal`).toContain(wall);
    return applyMove(s, { kind: 'wall', wall });
  }, state);
}

describe('newGame', () => {
  it('faces two players off across the board, ten walls each', () => {
    const s = newGame(2);
    expect(s.pawns[1]).toBe(idx(8, 4));
    expect(s.pawns[2]).toBe(idx(0, 4));
    expect(s.wallsLeft).toEqual({ 1: 10, 2: 10 });
    expect(s.walls.every((w) => w === null)).toBe(true);
    expect(s.turn).toBe(1);
    expect(s.winner).toBeNull();
  });

  it('seats four players on the four sides, five walls each', () => {
    const s = newGame(4);
    // Turn order matches GameShell's ring: bottom, left, top, right.
    expect(s.pawns[1]).toBe(idx(8, 4));
    expect(s.pawns[2]).toBe(idx(4, 0));
    expect(s.pawns[3]).toBe(idx(0, 4));
    expect(s.pawns[4]).toBe(idx(4, 8));
    expect(s.wallsLeft).toEqual({ 1: 5, 2: 5, 3: 5, 4: 5 });
  });

  it('sends each player to the far side', () => {
    expect(atGoal(idx(0, 3), 1, 2)).toBe(true);
    expect(atGoal(idx(8, 3), 1, 2)).toBe(false);
    expect(atGoal(idx(8, 0), 2, 2)).toBe(true);
    // Four-player: the left seat crosses to the right edge, and back again.
    expect(atGoal(idx(2, 8), 2, 4)).toBe(true);
    expect(atGoal(idx(2, 0), 4, 4)).toBe(true);
  });
});

describe('pawn moves', () => {
  it('steps one square, and not off the board', () => {
    const s = newGame(2);
    expect(pawnMoves(s)).toEqual([idx(7, 4), idx(8, 3), idx(8, 5)]);
  });

  it('will not cross a wall', () => {
    const s = withWalls(newGame(2), ['h', 7, 4]);
    // The wall lies between rows 7 and 8 across columns 4 and 5.
    expect(pawnMoves(s)).toEqual([idx(8, 3), idx(8, 5)]);
    expect(blocked(s.walls, idx(8, 4), -1, 0)).toBe(true);
    expect(blocked(s.walls, idx(8, 5), -1, 0)).toBe(true);
    expect(blocked(s.walls, idx(8, 3), -1, 0)).toBe(false);
  });

  it('hops an opponent standing in the way', () => {
    const s = at(newGame(2), idx(4, 4), idx(3, 4));
    expect(pawnMoves(s)).toContain(idx(2, 4));
    expect(pawnMoves(s)).not.toContain(idx(3, 4));
    // Straight over, so no diagonals on offer.
    expect(pawnMoves(s)).not.toContain(idx(3, 3));
    expect(pawnMoves(s)).not.toContain(idx(3, 5));
  });

  it('goes around when a wall stands behind the opponent', () => {
    const s = withWalls(at(newGame(2), idx(4, 4), idx(3, 4)), ['h', 2, 4]);
    expect(pawnMoves(s)).not.toContain(idx(2, 4));
    expect(pawnMoves(s)).toContain(idx(3, 3));
    expect(pawnMoves(s)).toContain(idx(3, 5));
  });

  it('goes around when the opponent stands against the board edge', () => {
    const s = at(newGame(2), idx(1, 4), idx(0, 4));
    expect(pawnMoves(s)).toContain(idx(0, 3));
    expect(pawnMoves(s)).toContain(idx(0, 5));
  });

  it('goes around when a third pawn blocks the landing square', () => {
    const s = at(newGame(4), idx(4, 4), idx(3, 4), idx(2, 4), idx(8, 8));
    expect(pawnMoves(s)).not.toContain(idx(2, 4));
    expect(pawnMoves(s)).toContain(idx(3, 3));
    expect(pawnMoves(s)).toContain(idx(3, 5));
  });
});

describe('walls', () => {
  it('takes one from the stock and passes the turn', () => {
    const s = play(newGame(2), ['h', 4, 4]);
    expect(s.wallsLeft[1]).toBe(9);
    expect(s.walls[wallId('h', 4, 4)]).toBe(1);
    expect(s.turn).toBe(2);
  });

  it('refuses a slot that is taken, crossed or overlapped', () => {
    const s = withWalls(newGame(2), ['h', 4, 4]);
    const legal = legalWalls(s);
    expect(legal).not.toContain(wallId('h', 4, 4)); // the same slot
    expect(legal).not.toContain(wallId('v', 4, 4)); // crossing it
    expect(legal).not.toContain(wallId('h', 4, 3)); // overlapping, left
    expect(legal).not.toContain(wallId('h', 4, 5)); // overlapping, right
    // A horizontal wall two along, or a vertical one beside it, is fine.
    expect(legal).toContain(wallId('h', 4, 6));
    expect(legal).toContain(wallId('v', 4, 5));
  });

  it('offers every slot on an empty board, both ways up', () => {
    expect(legalWalls(newGame(2))).toHaveLength(2 * 8 * 8);
  });

  it('offers none once the stock is spent', () => {
    const s = { ...newGame(2), wallsLeft: { ...newGame(2).wallsLeft, 1: 0 } };
    expect(legalWalls(s)).toEqual([]);
  });

  it('will not seal a player off from their goal', () => {
    // Player 1's pawn is boxed into the bottom-left corner by walls on two
    // sides; the wall that would close the last gap is refused.
    const s = withWalls(
      at(newGame(2), idx(8, 0), idx(0, 4)),
      ['v', 7, 0],
      ['h', 7, 1],
    );
    expect(distanceToGoal(s.walls, s.pawns[1], 1, 2)).not.toBeNull();
    const sealing = wallId('h', 7, 0);
    expect(legalWalls(s)).not.toContain(sealing);
    // And the search agrees: with it, there is no way out at all.
    const sealed = withWalls(s, ['h', 7, 0]);
    expect(distanceToGoal(sealed.walls, sealed.pawns[1], 1, 2)).toBeNull();
  });

  it('allows a wall that only makes the journey longer', () => {
    const s = newGame(2);
    const wall = wallId('h', 7, 4);
    expect(legalWalls(s)).toContain(wall);
    const after = applyMove(s, { kind: 'wall', wall });
    expect(distanceToGoal(after.walls, after.pawns[1], 1, 2)).toBe(9);
  });
});

describe('distanceToGoal', () => {
  it('counts the straight run from the start', () => {
    const s = newGame(2);
    expect(distanceToGoal(s.walls, s.pawns[1], 1, 2)).toBe(SIZE - 1);
    expect(distanceToGoal(s.walls, s.pawns[2], 2, 2)).toBe(SIZE - 1);
  });

  it('is zero standing on the goal side', () => {
    const s = newGame(2);
    expect(distanceToGoal(s.walls, idx(0, 2), 1, 2)).toBe(0);
  });
});

describe('endings', () => {
  it('wins by reaching the far side', () => {
    const s = at(newGame(2), idx(1, 4), idx(7, 4));
    const won = play(s, idx(0, 4));
    expect(won.winner).toBe(1);
    expect(pawnMoves(won)).toEqual([]);
    expect(legalWalls(won)).toEqual([]);
  });

  it('wins from the side seats too', () => {
    const s = at(newGame(4), idx(8, 4), idx(4, 7), idx(0, 4), idx(4, 8));
    const moved = play(s, idx(7, 4)); // player 1 steps, handing over to 2
    expect(moved.turn).toBe(2);
    const won = play(moved, idx(3, 7)); // 2 steps up... no goal yet
    expect(won.winner).toBeNull();
  });

  it('draws on the third repetition of a position', () => {
    // Both pawns shuffle between two squares. The position after player 1's
    // step comes up for the third time on the ninth ply.
    let s = at(newGame(2), idx(4, 4), idx(2, 4));
    s = play(
      s,
      idx(4, 3), idx(2, 3),
      idx(4, 4), idx(2, 4),
      idx(4, 3), idx(2, 3),
      idx(4, 4), idx(2, 4),
      idx(4, 3),
    );
    expect(s.winner).toBe('draw');
  });
});
