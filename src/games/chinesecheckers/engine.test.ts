import { describe, expect, it } from 'vitest';
import {
  HOLES,
  MARBLES,
  NEIGHBOURS,
  POINT_OF,
  POS,
  applyMove,
  holesOf,
  homeOf,
  marblesHome,
  movable,
  movesFrom,
  newGame,
  opposite,
  targetOf,
  type CcState,
  type PlayerId,
  type PointName,
} from './engine';

const POINTS: PointName[] = [
  'up',
  'up-right',
  'down-right',
  'down',
  'down-left',
  'up-left',
];

/** The hole nearest the middle of the star — handy for building positions. */
const CENTRE = POS.reduce(
  (best, p, i) =>
    Math.hypot(p.x - 0.5, p.y - 0.5) < Math.hypot(POS[best].x - 0.5, POS[best].y - 0.5)
      ? i
      : best,
  0,
);

/** The hole two steps from `from` in direction `dir`, where a jump lands. */
function landing(from: number, dir: number): number | null {
  const over = NEIGHBOURS[from][dir];
  return over === null ? null : NEIGHBOURS[over][dir];
}

/** An empty board with just the marbles named, and player 1 to move. */
function position(
  marbles: Array<[number, PlayerId]>,
  over: Partial<CcState> = {},
): CcState {
  const board = Array(HOLES).fill(null);
  for (const [hole, player] of marbles) board[hole] = player;
  return { ...newGame(2), board, ...over };
}

describe('the board', () => {
  it('is the 121-hole star: a hexagon and six ten-hole points', () => {
    expect(HOLES).toBe(121);
    for (const point of POINTS) expect(holesOf(point)).toHaveLength(MARBLES);
    expect(POINT_OF.filter((p) => p === null)).toHaveLength(61);
  });

  it('gives every hole a place of its own', () => {
    const seen = new Set(POS.map((p) => `${p.x.toFixed(4)},${p.y.toFixed(4)}`));
    expect(seen.size).toBe(HOLES);
  });

  it('has the classic row counts, top to bottom', () => {
    const rows = new Map<string, number>();
    for (const p of POS) {
      const key = p.y.toFixed(4);
      rows.set(key, (rows.get(key) ?? 0) + 1);
    }
    const counts = [...rows.entries()]
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([, n]) => n);
    expect(counts).toEqual([
      1, 2, 3, 4, 13, 12, 11, 10, 9, 10, 11, 12, 13, 4, 3, 2, 1,
    ]);
  });

  it('joins holes symmetrically, six ways at most', () => {
    for (let i = 0; i < HOLES; i++) {
      expect(NEIGHBOURS[i]).toHaveLength(6);
      NEIGHBOURS[i].forEach((n, dir) => {
        if (n === null) return;
        // The neighbour in direction d has this hole back the other way.
        expect(NEIGHBOURS[n][(dir + 3) % 6]).toBe(i);
      });
    }
    // The middle of the board is surrounded; the tip of a point has one way in.
    expect(NEIGHBOURS[CENTRE].every((n) => n !== null)).toBe(true);
  });

  it('puts every point across from another', () => {
    for (const point of POINTS) {
      expect(opposite(opposite(point))).toBe(point);
      expect(opposite(point)).not.toBe(point);
    }
    expect(opposite('up')).toBe('down');
    expect(opposite('up-left')).toBe('down-right');
  });
});

describe('setting up', () => {
  it('seats two players across from each other', () => {
    const s = newGame(2);
    expect(homeOf(1, 2)).toBe('down');
    expect(homeOf(2, 2)).toBe('up');
    expect(targetOf(1, 2)).toBe('up');
    expect(s.board.filter((c) => c === 1)).toHaveLength(MARBLES);
    expect(s.board.filter((c) => c === 2)).toHaveLength(MARBLES);
    expect(s.turn).toBe(1);
    expect(s.winner).toBeNull();
  });

  it('gives three players alternating points, each aiming at an empty one', () => {
    const s = newGame(3);
    expect([1, 2, 3].map((p) => homeOf(p as PlayerId, 3))).toEqual([
      'down',
      'up-left',
      'up-right',
    ]);
    for (const p of [1, 2, 3] as PlayerId[]) {
      const target = holesOf(targetOf(p, 3));
      expect(target.every((h) => s.board[h] === null)).toBe(true);
    }
  });

  it('gives four players two facing pairs', () => {
    const s = newGame(4);
    const homes = [1, 2, 3, 4].map((p) => homeOf(p as PlayerId, 4));
    expect(homes).toEqual(['down', 'down-left', 'up', 'up-right']);
    // Each player runs at the triangle another player is sitting in.
    expect(targetOf(1, 4)).toBe(homeOf(3, 4));
    expect(targetOf(2, 4)).toBe(homeOf(4, 4));
    expect(s.board.filter((c) => c !== null)).toHaveLength(4 * MARBLES);
  });

  it('leaves the two spare points empty in the four-player game', () => {
    const s = newGame(4);
    for (const point of ['down-right', 'up-left'] as PointName[]) {
      expect(holesOf(point).every((h) => s.board[h] === null)).toBe(true);
    }
  });
});

describe('moving', () => {
  it('steps to any touching empty hole', () => {
    const s = position([[CENTRE, 1]]);
    expect(movesFrom(s, CENTRE).sort()).toEqual(
      [...NEIGHBOURS[CENTRE].filter((n) => n !== null)].sort(),
    );
  });

  it('will not move an opponent marble, or an empty hole', () => {
    const s = position([[CENTRE, 2]]);
    expect(movesFrom(s, CENTRE)).toEqual([]);
    expect(movesFrom(s, NEIGHBOURS[CENTRE][0]!)).toEqual([]);
  });

  it('jumps a touching marble to the hole straight beyond', () => {
    const over = NEIGHBOURS[CENTRE][0]!;
    const land = landing(CENTRE, 0)!;
    const s = position([
      [CENTRE, 1],
      [over, 2],
    ]);
    expect(movesFrom(s, CENTRE)).toContain(land);
    // The hole it hopped over is not somewhere it may stop.
    expect(movesFrom(s, CENTRE)).not.toContain(over);
  });

  it('jumps its own marbles just the same', () => {
    const over = NEIGHBOURS[CENTRE][0]!;
    const s = position([
      [CENTRE, 1],
      [over, 1],
    ]);
    expect(movesFrom(s, CENTRE)).toContain(landing(CENTRE, 0)!);
  });

  it('will not jump two marbles in a row', () => {
    const over = NEIGHBOURS[CENTRE][0]!;
    const land = landing(CENTRE, 0)!;
    const s = position([
      [CENTRE, 1],
      [over, 2],
      [land, 2],
    ]);
    expect(movesFrom(s, CENTRE)).not.toContain(land);
    expect(movesFrom(s, CENTRE)).not.toContain(landing(land, 0));
  });

  it('chains jumps, and lets the marble stop anywhere along the way', () => {
    // Two hops in a line: over a marble, land, then over another and land.
    const first = NEIGHBOURS[CENTRE][0]!;
    const stop = landing(CENTRE, 0)!;
    const second = NEIGHBOURS[stop][0]!;
    const far = landing(stop, 0)!;
    const s = position([
      [CENTRE, 1],
      [first, 2],
      [second, 2],
    ]);
    const moves = movesFrom(s, CENTRE);
    expect(moves).toContain(stop); // stopping after one hop
    expect(moves).toContain(far); // or carrying on
  });

  it('turns a corner mid-chain', () => {
    const first = NEIGHBOURS[CENTRE][0]!;
    const stop = landing(CENTRE, 0)!;
    // From the landing hole, hop again in a different direction.
    const second = NEIGHBOURS[stop][2]!;
    const corner = landing(stop, 2)!;
    const s = position([
      [CENTRE, 1],
      [first, 2],
      [second, 2],
    ]);
    expect(movesFrom(s, CENTRE)).toContain(corner);
  });
});

describe('turns', () => {
  it('hands over after a move', () => {
    const s = newGame(2);
    const from = movable(s)[0];
    const next = applyMove(s, { from, to: movesFrom(s, from)[0] });
    expect(next.turn).toBe(2);
    expect(next.board[from]).toBeNull();
    expect(next.lastMove?.from).toBe(from);
  });

  it('goes round the table with four', () => {
    let s = newGame(4);
    for (const expected of [2, 3, 4, 1]) {
      const from = movable(s)[0];
      s = applyMove(s, { from, to: movesFrom(s, from)[0] });
      expect(s.turn).toBe(expected);
    }
  });

  it('only offers marbles that have somewhere to go', () => {
    const s = newGame(2);
    // Opening position: only the front rows of the triangle can move at all.
    const moves = movable(s);
    expect(moves.length).toBeGreaterThan(0);
    expect(moves.every((h) => s.board[h] === 1)).toBe(true);
    expect(moves.every((h) => movesFrom(s, h).length > 0)).toBe(true);
  });
});

describe('winning', () => {
  it('wins the moment the last marble lands home', () => {
    const target = holesOf(targetOf(1, 2));
    const last = target[target.length - 1];
    const spare = NEIGHBOURS[last]!.find(
      (n) => n !== null && !target.includes(n),
    ) as number;
    const s = position([...target.slice(0, -1).map((h) => [h, 1] as [number, PlayerId]), [spare, 1]]);
    expect(marblesHome(s, 1)).toBe(MARBLES - 1);

    const won = applyMove(s, { from: spare, to: last });
    expect(marblesHome(won, 1)).toBe(MARBLES);
    expect(won.winner).toBe(1);
    // The game stops dead: no more moves, and the turn never passes.
    expect(won.turn).toBe(1);
    expect(movable(won)).toEqual([]);
    expect(movesFrom(won, last)).toEqual([]);
  });

  it('does not win on another player’s marbles filling the triangle', () => {
    const target = holesOf(targetOf(1, 2));
    const s = position(target.map((h) => [h, 2] as [number, PlayerId]));
    expect(marblesHome(s, 1)).toBe(0);
    expect(s.winner).toBeNull();
  });
});
