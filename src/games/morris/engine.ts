/**
 * Nine Men's Morris engine.
 *
 * The board is 24 points on a 7 × 7 lattice: three nested squares joined by a
 * spoke through the middle of each side. Points are numbered ring by ring —
 * outer 0-7, middle 8-15, inner 16-23 — each ring clockwise from its top-left
 * corner, so `p + 8` is always the point one ring inwards.
 *
 *     0-----------1-----------2      outer  x,y ∈ {0,3,6}
 *     |  8--------9-------10  |      middle x,y ∈ {1,3,5}
 *     |  | 16----17----18 |   |      inner  x,y ∈ {2,3,4}
 *     7 15 23          19 11  3
 *     |  | 22----21----20 |   |
 *     | 14--------13-------12 |
 *     6-----------5-----------4
 *
 * A game runs in three phases: both players place their nine men, then they
 * slide them along the lines, and closing a mill (three in a row) interrupts
 * either phase to remove one of the opponent's men.
 *
 * Player 1 places first.
 */

export type PlayerId = 1 | 2;
export type Cell = PlayerId | null;

/** What the player to move is being asked for. */
export type Phase = 'place' | 'move' | 'remove';

export type Ending = 'reduced' | 'blocked' | 'repetition' | 'no-mill' | null;

/** `from` is null for a placement — the man comes from the hand. */
export interface MorrisMove {
  from: number | null;
  to: number;
}

export interface MorrisState {
  board: Cell[];
  turn: PlayerId;
  phase: Phase;
  /** Men not yet placed. Nine each at the start. */
  inHand: Record<PlayerId, number>;
  /** Rule setting: three men left may move to any empty point. */
  flying: boolean;
  winner: PlayerId | 'draw' | null;
  ending: Ending;
  lastMove: MorrisMove | null;
  lastRemoved: number | null;
  /** The points of the mill (or mills) just closed, for the board highlight. */
  millPoints: number[];
  /** Plies of sliding with no mill closed and no man removed; 100 is a draw. */
  sinceAction: number;
  /** Position key → times reached, for threefold repetition. */
  seen: Record<string, number>;
}

export const POINT_COUNT = 24;
export const MEN_PER_PLAYER = 9;

/** Lattice coordinates, 0-6 each way, y downwards. Index is the point id. */
export const POINTS: ReadonlyArray<{ x: number; y: number }> = [
  { x: 0, y: 0 }, { x: 3, y: 0 }, { x: 6, y: 0 }, { x: 6, y: 3 },
  { x: 6, y: 6 }, { x: 3, y: 6 }, { x: 0, y: 6 }, { x: 0, y: 3 },
  { x: 1, y: 1 }, { x: 3, y: 1 }, { x: 5, y: 1 }, { x: 5, y: 3 },
  { x: 5, y: 5 }, { x: 3, y: 5 }, { x: 1, y: 5 }, { x: 1, y: 3 },
  { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 4, y: 2 }, { x: 4, y: 3 },
  { x: 4, y: 4 }, { x: 3, y: 4 }, { x: 2, y: 4 }, { x: 2, y: 3 },
];

export const other = (p: PlayerId): PlayerId => (p === 1 ? 2 : 1);

/** The ring a point sits on: 0 outer, 1 middle, 2 inner. */
export const ringOf = (p: number) => Math.floor(p / 8);
/** A point's position within its ring, 0-7 clockwise from the top-left. */
export const seatOf = (p: number) => p % 8;
/** Ring seats 1, 3, 5 and 7 are the side midpoints the spokes run through. */
export const isMidpoint = (p: number) => seatOf(p) % 2 === 1;

function buildAdjacency(): number[][] {
  const adj: number[][] = Array.from({ length: POINT_COUNT }, () => []);
  const link = (a: number, b: number) => {
    adj[a].push(b);
    adj[b].push(a);
  };
  for (let ring = 0; ring < 3; ring++) {
    const base = ring * 8;
    // Each ring is a cycle of corner, midpoint, corner, … so consecutive
    // seats are exactly the pairs joined by a drawn line.
    for (let seat = 0; seat < 8; seat++) {
      link(base + seat, base + ((seat + 1) % 8));
    }
  }
  // The spokes: each side's midpoint, outer to middle to inner.
  for (let seat = 1; seat < 8; seat += 2) {
    link(seat, 8 + seat);
    link(8 + seat, 16 + seat);
  }
  for (const list of adj) list.sort((a, b) => a - b);
  return adj;
}

/** Points reachable in one slide, by point id. */
export const ADJACENT: ReadonlyArray<readonly number[]> = buildAdjacency();

function buildMills(): number[][] {
  const mills: number[][] = [];
  for (let ring = 0; ring < 3; ring++) {
    const base = ring * 8;
    // The four sides of the ring: corner, midpoint, corner.
    for (let seat = 0; seat < 8; seat += 2) {
      mills.push([base + seat, base + seat + 1, base + ((seat + 2) % 8)]);
    }
  }
  // The four spokes, outer through middle to inner.
  for (let seat = 1; seat < 8; seat += 2) {
    mills.push([seat, 8 + seat, 16 + seat]);
  }
  return mills;
}

/** The sixteen lines of three: twelve ring sides and four spokes. */
export const MILLS: ReadonlyArray<readonly number[]> = buildMills();

/** Mills through each point, so mill checks don't scan all sixteen. */
const MILLS_THROUGH: ReadonlyArray<ReadonlyArray<readonly number[]>> = POINTS.map(
  (_, p) => MILLS.filter((m) => m.includes(p)),
);

export function newGame(flying: boolean): MorrisState {
  const state: MorrisState = {
    board: Array(POINT_COUNT).fill(null),
    turn: 1,
    phase: 'place',
    inHand: { 1: MEN_PER_PLAYER, 2: MEN_PER_PLAYER },
    flying,
    winner: null,
    ending: null,
    lastMove: null,
    lastRemoved: null,
    millPoints: [],
    sinceAction: 0,
    seen: {},
  };
  return { ...state, seen: { [positionKey(state)]: 1 } };
}

/**
 * The position as a string, for repetition counting: the men, the player to
 * move, and the phase. Only ever compared against other keys from the same
 * game, so the format just has to be unambiguous.
 */
function positionKey(state: MorrisState): string {
  return `${state.board.map((c) => c ?? '-').join('')}|${state.turn}|${state.phase}`;
}

export const menOnBoard = (board: Cell[], player: PlayerId) =>
  board.reduce<number>((n, cell) => (cell === player ? n + 1 : n), 0);

/** The mills through `point` that `player` owns outright. */
export function millsAt(
  board: Cell[],
  point: number,
  player: PlayerId,
): number[][] {
  return MILLS_THROUGH[point]
    .filter((mill) => mill.every((p) => board[p] === player))
    .map((mill) => [...mill]);
}

/** Whether the man standing on `point` is part of a closed mill. */
export function inMill(board: Cell[], point: number): boolean {
  const owner = board[point];
  return owner !== null && millsAt(board, point, owner).length > 0;
}

const emptyPoints = (board: Cell[]) =>
  board.reduce<number[]>((ps, cell, p) => (cell === null ? [...ps, p] : ps), []);

/**
 * Every move the player to move may make. Empty in the `remove` phase, which
 * `removableMen` answers instead, and empty once the game is over.
 */
export function legalMoves(state: MorrisState): MorrisMove[] {
  if (state.winner || state.phase === 'remove') return [];
  const { board, turn } = state;

  if (state.phase === 'place') {
    return emptyPoints(board).map((to) => ({ from: null, to }));
  }

  const empties = emptyPoints(board);
  const flies = state.flying && menOnBoard(board, turn) === 3;
  const moves: MorrisMove[] = [];
  for (let from = 0; from < POINT_COUNT; from++) {
    if (board[from] !== turn) continue;
    const targets = flies ? empties : ADJACENT[from].filter((p) => board[p] === null);
    for (const to of targets) moves.push({ from, to });
  }
  return moves;
}

/**
 * The opponent men that may be taken, after a mill. Men in a mill are spared
 * unless every one of them is in a mill, in which case any man will do.
 */
export function removableMen(state: MorrisState): number[] {
  if (state.winner || state.phase !== 'remove') return [];
  const victim = other(state.turn);
  const men: number[] = [];
  for (let p = 0; p < POINT_COUNT; p++) {
    if (state.board[p] === victim) men.push(p);
  }
  const open = men.filter((p) => !inMill(state.board, p));
  return open.length > 0 ? open : men;
}

/**
 * Hand the turn over and settle the game if it is over.
 *
 * Called with the board already updated and `turn` still on the player who
 * just acted. Losses and draws are only possible once the placing phase is
 * done: nobody can be starved of a legal move while there are 24 points and
 * at most 18 men, and no position repeats while men are still arriving.
 */
function advance(next: MorrisState): MorrisState {
  next.turn = other(next.turn);
  next.phase = next.inHand[next.turn] > 0 ? 'place' : 'move';

  const key = positionKey(next);
  const seenCount = (next.seen[key] ?? 0) + 1;
  next.seen = { ...next.seen, [key]: seenCount };

  if (next.phase !== 'move') return next;

  if (menOnBoard(next.board, next.turn) < 3) {
    next.winner = other(next.turn);
    next.ending = 'reduced';
  } else if (legalMoves(next).length === 0) {
    next.winner = other(next.turn);
    next.ending = 'blocked';
  } else if (next.sinceAction >= 100) {
    next.winner = 'draw';
    next.ending = 'no-mill';
  } else if (seenCount >= 3) {
    next.winner = 'draw';
    next.ending = 'repetition';
  }
  return next;
}

/**
 * Place or slide a man. The caller is trusted to pass a move from
 * `legalMoves` — the UI only offers those.
 */
export function applyMove(state: MorrisState, move: MorrisMove): MorrisState {
  const board = state.board.slice();
  const mover = state.turn;
  if (move.from !== null) board[move.from] = null;
  board[move.to] = mover;

  const inHand =
    move.from === null
      ? { ...state.inHand, [mover]: state.inHand[mover] - 1 }
      : state.inHand;

  const closed = millsAt(board, move.to, mover);
  const next: MorrisState = {
    ...state,
    board,
    inHand,
    lastMove: move,
    lastRemoved: null,
    millPoints: closed.flat(),
    // Only sliding counts towards the no-mill draw; the placing phase has its
    // own natural end.
    sinceAction: closed.length > 0 || state.phase !== 'move' ? 0 : state.sinceAction + 1,
  };

  // A mill takes a man — unless the opponent has none on the board yet, which
  // an early placing-phase mill can manage.
  if (closed.length > 0 && menOnBoard(board, other(mover)) > 0) {
    next.phase = 'remove';
    return next;
  }
  return advance(next);
}

/**
 * Take one of the opponent's men after a mill. `point` is trusted to come
 * from `removableMen`.
 */
export function applyRemoval(state: MorrisState, point: number): MorrisState {
  const board = state.board.slice();
  board[point] = null;

  const next: MorrisState = {
    ...state,
    board,
    lastRemoved: point,
    millPoints: [],
    sinceAction: 0,
  };

  // Being cut to two men while you still have men in hand is survivable, so
  // the reduced-to-two loss is left to `advance`, which only tests it once the
  // player robbed has finished placing.
  return advance(next);
}
