import { describe, expect, it } from 'vitest';
import {
  applyMove,
  boxEdges,
  boxesOf,
  hEdge,
  vEdge,
  legalEdges,
  newGame,
  next,
  playerList,
  scores,
  type DotsBoxesState,
  type PlayerId,
} from './engine';

/**
 * Plays edges one at a time, asserting each is legal first. `applyMove`
 * trusts its caller, so tests must never assert about unreachable positions.
 */
function playLegal(state: DotsBoxesState, ...edges: number[]) {
  return edges.reduce((s, edge) => {
    expect(legalEdges(s), `edge ${edge} must be legal`).toContain(edge);
    return applyMove(s, edge);
  }, state);
}

/** A finished-but-for-`openEdge` 4x4 board with the given box owners. */
function endgame(
  owners: (PlayerId | null)[],
  openEdge: number,
  turn: PlayerId,
  players: 2 | 3 | 4 = 2,
): DotsBoxesState {
  const edges: (PlayerId | null)[] = Array(40).fill(1);
  edges[openEdge] = null;
  return { ...newGame(players, 4), edges, boxes: owners.slice(), turn };
}

describe('newGame', () => {
  it('sizes the board to 2n(n+1) edges and n² boxes', () => {
    for (const [size, edgeCount, boxCount] of [
      [4, 40, 16],
      [6, 84, 36],
      [8, 144, 64],
    ] as const) {
      const s = newGame(2, size);
      expect(s.edges).toHaveLength(edgeCount);
      expect(s.boxes).toHaveLength(boxCount);
      expect(s.edges.every((e) => e === null)).toBe(true);
      expect(s.boxes.every((b) => b === null)).toBe(true);
      expect(legalEdges(s)).toHaveLength(edgeCount);
    }
  });

  it('records the player count and starts with player 1', () => {
    const s = newGame(3, 4);
    expect(s.players).toBe(3);
    expect(playerList(s)).toEqual([1, 2, 3]);
    expect(s.turn).toBe(1);
    expect(s.winner).toBeNull();
    expect(s.lastMove).toBeNull();
  });
});

describe('edge indexing', () => {
  it('round-trips: each of a box’s four edges borders that box', () => {
    const size = 4;
    for (let box = 0; box < size * size; box++) {
      for (const edge of boxEdges(size, box)) {
        expect(boxesOf(size, edge)).toContain(box);
      }
    }
  });

  it('border edges touch one box, interior edges two', () => {
    // 4x4: h-edge (0,0) is on the top border; h-edge (1,0) splits boxes 0 and 4.
    expect(boxesOf(4, hEdge(4, 0, 0))).toEqual([0]);
    expect(boxesOf(4, hEdge(4, 1, 0))).toEqual([0, 4]);
    // v-edge (0,0) is on the left border; v-edge (0,1) splits boxes 0 and 1.
    expect(boxesOf(4, vEdge(4, 0, 0))).toEqual([0]);
    expect(boxesOf(4, vEdge(4, 0, 1))).toEqual([0, 1]);
  });
});

describe('turns', () => {
  it('a non-completing move records the drawer and passes the turn', () => {
    const s = playLegal(newGame(2, 4), hEdge(4, 0, 0));
    expect(s.edges[hEdge(4, 0, 0)]).toBe(1);
    expect(s.turn).toBe(2);
    expect(s.lastMove).toEqual({ edge: hEdge(4, 0, 0), player: 1, completed: [] });
  });

  it('next() rotates and wraps for each player count', () => {
    expect(next(1, 2)).toBe(2);
    expect(next(2, 2)).toBe(1);
    expect(next(3, 3)).toBe(1);
    expect(next(4, 4)).toBe(1);
  });
});

describe('completing a box', () => {
  // Box 0 on a 4x4 board: top 0, bottom 4, left 20, right 21.
  const threeSides = () => playLegal(newGame(2, 4), 0, 4, 20); // p1, p2, p1

  it('the fourth side claims the box for its completer, whoever drew the rest', () => {
    const s = playLegal(threeSides(), 21); // p2 completes
    expect(s.boxes[0]).toBe(2);
    expect(scores(s)[2]).toBe(1);
    expect(s.lastMove?.completed).toEqual([0]);
  });

  it('the completer keeps the turn, then passes it with a non-completing move', () => {
    const s = playLegal(threeSides(), 21);
    expect(s.turn).toBe(2);
    const t = playLegal(s, vEdge(4, 0, 2)); // completes nothing
    expect(t.lastMove?.completed).toEqual([]);
    expect(t.turn).toBe(1);
  });

  it('one edge can complete two boxes at once', () => {
    // Boxes 0 and 1 each miss only their shared edge v(0,1) = 21.
    const shared = vEdge(4, 0, 1);
    const base = newGame(2, 4);
    const edges = base.edges.slice();
    for (const box of [0, 1]) {
      for (const e of boxEdges(4, box)) edges[e] = 1;
    }
    edges[shared] = null;
    const s = playLegal({ ...base, edges }, shared);
    expect(s.boxes[0]).toBe(1);
    expect(s.boxes[1]).toBe(1);
    expect(scores(s)[1]).toBe(2);
    expect(s.turn).toBe(1);
    expect(s.lastMove?.completed).toEqual([0, 1]);
  });
});

describe('game end', () => {
  // Box 0's left edge v(0,0) = 20 borders no other box, so it can be the
  // one edge standing without a second box also being open.
  const lastEdge = vEdge(4, 0, 0);

  it('claiming the last box resolves the winner — not necessarily the mover', () => {
    // 9 boxes to p1, 6 to p2; p2 claims the last for 9-7. p1 still wins.
    const boxes: (PlayerId | null)[] = [null, ...Array(9).fill(1), ...Array(6).fill(2)];
    const s = playLegal(endgame(boxes, lastEdge, 2), lastEdge);
    expect(s.boxes.every((b) => b !== null)).toBe(true);
    expect(scores(s)).toEqual({ 1: 9, 2: 7, 3: 0, 4: 0 });
    expect(s.winner).toBe(1);
    expect(legalEdges(s)).toEqual([]);
  });

  it('a shared top score is a draw', () => {
    // 7 to p1, 8 to p2; p1 claims the last for 8-8.
    const boxes: (PlayerId | null)[] = [null, ...Array(7).fill(1), ...Array(8).fill(2)];
    const s = playLegal(endgame(boxes, lastEdge, 1), lastEdge);
    expect(s.winner).toBe('draw');
  });

  it('the final move ends the game even though it earned an extra turn', () => {
    const boxes: (PlayerId | null)[] = [null, ...Array(9).fill(1), ...Array(6).fill(2)];
    const s = playLegal(endgame(boxes, lastEdge, 2), lastEdge);
    expect(s.turn).toBe(2); // kept the turn…
    expect(legalEdges(s)).toEqual([]); // …but there is nothing left to play
  });
});

describe('full playout', () => {
  it('a greedy game terminates with every box claimed and a consistent result', () => {
    let s = newGame(2, 4);
    const completing = (state: DotsBoxesState, edge: number) =>
      boxesOf(state.size, edge).some(
        (b) =>
          state.boxes[b] === null &&
          boxEdges(state.size, b).filter((e) => state.edges[e] !== null).length === 3,
      );

    for (let guard = 0; s.winner === null; guard++) {
      expect(guard, 'playout must terminate').toBeLessThan(41);
      const open = legalEdges(s);
      const move = open.find((e) => completing(s, e)) ?? open[0];
      s = playLegal(s, move);
    }

    const score = scores(s);
    expect(s.boxes.every((b) => b !== null)).toBe(true);
    expect(s.edges.every((e) => e !== null)).toBe(true);
    expect(score[1] + score[2]).toBe(16);
    if (s.winner === 'draw') expect(score[1]).toBe(score[2]);
    else expect(score[s.winner as PlayerId]).toBe(Math.max(score[1], score[2]));
  });
});

describe('3 and 4 players', () => {
  it('non-completing moves rotate through every seat and wrap', () => {
    // Top-row horizontal edges never complete anything this early.
    const three = playLegal(newGame(3, 4), 0, 1, 2);
    expect(three.turn).toBe(1);
    const four = playLegal(newGame(4, 4), 0, 1, 2, 3);
    expect(four.edges.slice(0, 4)).toEqual([1, 2, 3, 4]);
    expect(four.turn).toBe(1);
  });

  it('completing a box keeps the turn at any player count', () => {
    const boxes: (PlayerId | null)[] = [null, ...Array(8).fill(1), ...Array(4).fill(2), ...Array(3).fill(3)];
    const s = playLegal(endgame(boxes, vEdge(4, 0, 0), 3, 3), vEdge(4, 0, 0));
    expect(s.boxes[0]).toBe(3);
    expect(s.turn).toBe(3);
  });

  it('a tie for first among a subset of players is a draw', () => {
    // p1 and p2 finish 7-7 with p3 on 2.
    const boxes: (PlayerId | null)[] = [null, ...Array(6).fill(1), ...Array(7).fill(2), ...Array(2).fill(3)];
    const s = playLegal(endgame(boxes, vEdge(4, 0, 0), 1, 3), vEdge(4, 0, 0));
    expect(scores(s)).toEqual({ 1: 7, 2: 7, 3: 2, 4: 0 });
    expect(s.winner).toBe('draw');
  });
});

describe('purity', () => {
  it('applyMove never mutates its input — the undo stack holds references', () => {
    const s = playLegal(newGame(2, 4), 0, 4, 20);
    const edges = s.edges.slice();
    const boxes = s.boxes.slice();
    const turn = s.turn;
    applyMove(s, 21);
    expect(s.edges).toEqual(edges);
    expect(s.boxes).toEqual(boxes);
    expect(s.turn).toBe(turn);
    expect(s.winner).toBeNull();
  });
});
