/**
 * Quoridor engine.
 *
 * A 9 × 9 board of cells, index = row * 9 + col, row 0 at the top. Each player
 * has one pawn and a stock of walls, and a turn is either one step of the pawn
 * or one wall. First pawn to reach the far side wins.
 *
 * Walls stand in the grooves between cells, two cells long, anchored on the
 * lattice of 8 × 8 interior intersections. A horizontal wall (r, c) lies
 * between rows r and r+1 and spans columns c and c+1; a vertical wall (r, c)
 * lies between columns c and c+1 and spans rows r and r+1. Both live in one
 * flat index space so a wall is a plain number, like a dots & boxes edge: the
 * 64 horizontal ones first, then the 64 vertical.
 *
 * Rule choices:
 *  - Jumping: with an opponent directly ahead, you take the square beyond it
 *    if that square is free and no wall stands behind them. If it isn't — a
 *    wall, the board edge, or a third pawn — you may step diagonally around
 *    them instead. Only ever one pawn is hopped: no chains.
 *  - A wall may never seal a player off. Every player must keep a path to
 *    their own goal side, which `legalWalls` enforces by search, so the game
 *    can't deadlock and a pawn always has somewhere to go.
 *  - Two players start facing each other; four players start on all four
 *    sides, in the seating order GameShell uses (bottom, left, top, right).
 *    Two-player games hold ten walls each, four-player games five.
 *  - Threefold repetition is a draw, the one way a game with no captures and
 *    a finite wall stock could otherwise run forever.
 */

export type PlayerId = 1 | 2 | 3 | 4;
export type PlayerCount = 2 | 4;
export type Orientation = 'h' | 'v';

/** Which edge of the board a player sits at, and so which one they aim for. */
export type Side = 'bottom' | 'left' | 'top' | 'right';

export type QuoridorMove =
  | { kind: 'pawn'; to: number }
  | { kind: 'wall'; wall: number };

export interface QuoridorState {
  players: PlayerCount;
  /** Cell each pawn stands on, by player id. */
  pawns: Record<PlayerId, number>;
  wallsLeft: Record<PlayerId, number>;
  /** 128 slots, horizontal block then vertical: who placed it, or null. */
  walls: (PlayerId | null)[];
  turn: PlayerId;
  winner: PlayerId | 'draw' | null;
  lastMove: QuoridorMove | null;
  /** Position key → times reached, for threefold repetition. */
  seen: Record<string, number>;
}

export const SIZE = 9;
/** Interior intersections per side: the anchors a wall can stand on. */
export const SLOTS = SIZE - 1;

export const idx = (row: number, col: number) => row * SIZE + col;
export const rowOf = (i: number) => Math.floor(i / SIZE);
export const colOf = (i: number) => i % SIZE;

export const wallId = (orient: Orientation, r: number, c: number) =>
  (orient === 'h' ? 0 : SLOTS * SLOTS) + r * SLOTS + c;
export const wallOrient = (w: number): Orientation =>
  w < SLOTS * SLOTS ? 'h' : 'v';
export const wallRow = (w: number) => Math.floor((w % (SLOTS * SLOTS)) / SLOTS);
export const wallCol = (w: number) => (w % (SLOTS * SLOTS)) % SLOTS;

const SIDES: Record<PlayerCount, Side[]> = {
  2: ['bottom', 'top'],
  4: ['bottom', 'left', 'top', 'right'],
};

const START: Record<Side, number> = {
  bottom: idx(SIZE - 1, 4),
  top: idx(0, 4),
  left: idx(4, 0),
  right: idx(4, SIZE - 1),
};

/** Players in turn order. */
export const playerList = (state: QuoridorState): PlayerId[] =>
  Array.from({ length: state.players }, (_, i) => (i + 1) as PlayerId);

export const nextPlayer = (p: PlayerId, players: PlayerCount): PlayerId =>
  ((p % players) + 1) as PlayerId;

/** The edge a player starts on. They aim for the opposite one. */
export const sideOf = (player: PlayerId, players: PlayerCount): Side =>
  SIDES[players][player - 1];

/** Whether `cell` is on the far side from where `player` began. */
export function atGoal(cell: number, player: PlayerId, players: PlayerCount): boolean {
  switch (sideOf(player, players)) {
    case 'bottom':
      return rowOf(cell) === 0;
    case 'top':
      return rowOf(cell) === SIZE - 1;
    case 'left':
      return colOf(cell) === SIZE - 1;
    case 'right':
      return colOf(cell) === 0;
  }
}

export function newGame(players: PlayerCount): QuoridorState {
  const pawns = {} as Record<PlayerId, number>;
  const wallsLeft = {} as Record<PlayerId, number>;
  const stock = players === 2 ? 10 : 5;
  for (let i = 0; i < players; i++) {
    const player = (i + 1) as PlayerId;
    pawns[player] = START[SIDES[players][i]];
    wallsLeft[player] = stock;
  }
  const state: QuoridorState = {
    players,
    pawns,
    wallsLeft,
    walls: Array(2 * SLOTS * SLOTS).fill(null),
    turn: 1,
    winner: null,
    lastMove: null,
    seen: {},
  };
  return { ...state, seen: { [positionKey(state)]: 1 } };
}

/**
 * The position as a string: the pawns, the player to move, and how many walls
 * stand. Walls are only ever added, so two positions with the same count hold
 * the same walls — no need to spell them out.
 */
function positionKey(state: QuoridorState): string {
  const pawns = playerList(state)
    .map((p) => state.pawns[p])
    .join(',');
  const placed = state.walls.reduce<number>((n, w) => (w === null ? n : n + 1), 0);
  return `${pawns}|${state.turn}|${placed}`;
}

const STEPS = [
  { dr: -1, dc: 0 },
  { dr: 1, dc: 0 },
  { dr: 0, dc: -1 },
  { dr: 0, dc: 1 },
] as const;

const has = (walls: (PlayerId | null)[], orient: Orientation, r: number, c: number) =>
  r >= 0 && r < SLOTS && c >= 0 && c < SLOTS && walls[wallId(orient, r, c)] !== null;

/**
 * Whether a wall stands between a cell and its neighbour one step away. Each
 * crossing is covered by two wall anchors — the one starting at this column
 * (or row) and the one starting just before it.
 */
export function blocked(
  walls: (PlayerId | null)[],
  from: number,
  dr: number,
  dc: number,
): boolean {
  const r = rowOf(from);
  const c = colOf(from);
  if (dr === 1) return has(walls, 'h', r, c) || has(walls, 'h', r, c - 1);
  if (dr === -1) return has(walls, 'h', r - 1, c) || has(walls, 'h', r - 1, c - 1);
  if (dc === 1) return has(walls, 'v', r, c) || has(walls, 'v', r - 1, c);
  return has(walls, 'v', r, c - 1) || has(walls, 'v', r - 1, c - 1);
}

const onBoard = (r: number, c: number) => r >= 0 && r < SIZE && c >= 0 && c < SIZE;

/** The neighbour one step away, if it is on the board and no wall is between. */
function step(
  walls: (PlayerId | null)[],
  from: number,
  dr: number,
  dc: number,
): number | null {
  const r = rowOf(from) + dr;
  const c = colOf(from) + dc;
  if (!onBoard(r, c)) return null;
  if (blocked(walls, from, dr, dc)) return null;
  return idx(r, c);
}

/**
 * Where the pawn to move may go: a step to each open neighbour, and where an
 * opponent stands in the way, the hop over them or the two ways around.
 */
export function pawnMoves(state: QuoridorState): number[] {
  if (state.winner) return [];
  const from = state.pawns[state.turn];
  const occupied = new Set(playerList(state).map((p) => state.pawns[p]));
  // A set, not a list: with pawns both ahead and beside you, two directions
  // can offer the same diagonal way around.
  const moves = new Set<number>();

  for (const { dr, dc } of STEPS) {
    const ahead = step(state.walls, from, dr, dc);
    if (ahead === null) continue;
    if (!occupied.has(ahead)) {
      moves.add(ahead);
      continue;
    }
    // Someone is standing there: hop them if the far square is clear.
    const beyond = step(state.walls, ahead, dr, dc);
    if (beyond !== null && !occupied.has(beyond)) {
      moves.add(beyond);
      continue;
    }
    // Blocked behind them, so go around: sideways from where they stand.
    for (const turn of [
      { dr: dc, dc: dr },
      { dr: -dc, dc: -dr },
    ]) {
      const around = step(state.walls, ahead, turn.dr, turn.dc);
      if (around !== null && !occupied.has(around)) moves.add(around);
    }
  }
  return [...moves].sort((a, b) => a - b);
}

/**
 * Steps from a pawn to its goal side, ignoring the other pawns — the measure
 * the no-sealing-off rule needs, and the one worth showing as a hint. Returns
 * null when the goal cannot be reached at all.
 */
export function distanceToGoal(
  walls: (PlayerId | null)[],
  from: number,
  player: PlayerId,
  players: PlayerCount,
): number | null {
  const seen = new Uint8Array(SIZE * SIZE);
  let frontier = [from];
  seen[from] = 1;
  let steps = 0;
  while (frontier.length > 0) {
    const nextUp: number[] = [];
    for (const cell of frontier) {
      if (atGoal(cell, player, players)) return steps;
      for (const { dr, dc } of STEPS) {
        const to = step(walls, cell, dr, dc);
        if (to !== null && !seen[to]) {
          seen[to] = 1;
          nextUp.push(to);
        }
      }
    }
    frontier = nextUp;
    steps++;
  }
  return null;
}

/** Whether every player can still reach their own goal side. */
function everyoneHasAPath(state: QuoridorState, walls: (PlayerId | null)[]): boolean {
  return playerList(state).every(
    (p) => distanceToGoal(walls, state.pawns[p], p, state.players) !== null,
  );
}

/** Whether a wall would overlap or cross one already standing. */
function slotFree(walls: (PlayerId | null)[], wall: number): boolean {
  const orient = wallOrient(wall);
  const r = wallRow(wall);
  const c = wallCol(wall);
  // Crossing: the other orientation on this same intersection.
  if (has(walls, orient === 'h' ? 'v' : 'h', r, c)) return false;
  if (has(walls, orient, r, c)) return false;
  // Overlap: the same orientation half a wall along.
  return orient === 'h'
    ? !has(walls, 'h', r, c - 1) && !has(walls, 'h', r, c + 1)
    : !has(walls, 'v', r - 1, c) && !has(walls, 'v', r + 1, c);
}

/** Every wall the player to move may place. */
export function legalWalls(state: QuoridorState): number[] {
  if (state.winner || state.wallsLeft[state.turn] === 0) return [];
  const legal: number[] = [];
  for (let wall = 0; wall < state.walls.length; wall++) {
    if (!slotFree(state.walls, wall)) continue;
    const walls = state.walls.slice();
    walls[wall] = state.turn;
    if (everyoneHasAPath(state, walls)) legal.push(wall);
  }
  return legal;
}

export function applyMove(state: QuoridorState, move: QuoridorMove): QuoridorState {
  const next: QuoridorState = { ...state, lastMove: move };

  if (move.kind === 'pawn') {
    next.pawns = { ...state.pawns, [state.turn]: move.to };
    if (atGoal(move.to, state.turn, state.players)) {
      next.winner = state.turn;
      return next;
    }
  } else {
    const walls = state.walls.slice();
    walls[move.wall] = state.turn;
    next.walls = walls;
    next.wallsLeft = {
      ...state.wallsLeft,
      [state.turn]: state.wallsLeft[state.turn] - 1,
    };
  }

  next.turn = nextPlayer(state.turn, state.players);

  const key = positionKey(next);
  const seenCount = (state.seen[key] ?? 0) + 1;
  next.seen = { ...state.seen, [key]: seenCount };
  if (seenCount >= 3) next.winner = 'draw';
  return next;
}
