/**
 * Chinese Checkers engine.
 *
 * The board is the 121-hole star: a hexagon of 61 holes with a ten-hole
 * triangle on each of its six sides. Holes are held in cube coordinates
 * (x + y + z = 0), which give all six directions the same shape — the hexagon
 * is every hole within four steps of the middle, and each triangle is the ten
 * holes just beyond one of its sides.
 *
 * Holes are numbered once, in reading order down the screen, so a move is a
 * pair of plain numbers and the UI can lay the board out from `POS`.
 *
 * Rule choices:
 *  - A turn is one step to a touching hole, or a jump over a single touching
 *    marble — any colour — to the empty hole straight beyond. Jumps chain, and
 *    you may stop anywhere along the chain, so `movesFrom` returns every hole
 *    a chain can reach rather than making you play it hop by hop.
 *  - Two players face each other, three take alternating points, four take two
 *    facing pairs — always leaving each player's target empty at the start,
 *    and always in the seat order GameShell uses.
 *  - You win the moment your last marble lands in the triangle across the
 *    board. Marbles are never captured and never leave the board.
 */

export type PlayerId = 1 | 2 | 3 | 4;
export type PlayerCount = 2 | 3 | 4;
export type Cell = PlayerId | null;

export interface CcMove {
  from: number;
  to: number;
}

export interface CcState {
  players: PlayerCount;
  /** One entry per hole, in `POS` order: who stands there, or nobody. */
  board: Cell[];
  turn: PlayerId;
  winner: PlayerId | null;
  lastMove: CcMove | null;
}

/** Marbles each player starts with — one triangle's worth. */
export const MARBLES = 10;
/** Steps from the middle to the edge of the central hexagon. */
const RADIUS = 4;

interface Hex {
  x: number;
  y: number;
  z: number;
}

/**
 * The six triangles, each named for where it sits once drawn. A triangle is
 * the holes beyond one side of the hexagon: `axis` is the coordinate that
 * runs past the edge, `sign` which way.
 */
const POINTS = [
  { name: 'up', axis: 'z', sign: -1 },
  { name: 'up-right', axis: 'x', sign: 1 },
  { name: 'down-right', axis: 'y', sign: -1 },
  { name: 'down', axis: 'z', sign: 1 },
  { name: 'down-left', axis: 'x', sign: -1 },
  { name: 'up-left', axis: 'y', sign: 1 },
] as const;

export type PointName = (typeof POINTS)[number]['name'];

/** The triangle directly across the board from each one. */
export const opposite = (point: PointName): PointName =>
  POINTS[(POINTS.findIndex((p) => p.name === point) + 3) % 6].name;

const inHexagon = (h: Hex) =>
  Math.abs(h.x) <= RADIUS && Math.abs(h.y) <= RADIUS && Math.abs(h.z) <= RADIUS;

/** Which triangle a hole belongs to, if any. */
function pointOf(h: Hex): PointName | null {
  if (inHexagon(h)) return null;
  for (const { name, axis, sign } of POINTS) {
    // Beyond one edge of the hexagon, and inside the other two — which is
    // exactly the ten-hole triangle sitting on that edge.
    const beyond = h[axis] * sign > RADIUS;
    const others = (['x', 'y', 'z'] as const)
      .filter((a) => a !== axis)
      .every((a) => Math.abs(h[a]) <= RADIUS);
    if (beyond && others) return name;
  }
  return null;
}

function buildBoard() {
  const hexes: Hex[] = [];
  const span = RADIUS + MARBLES; // no hole reaches further than this
  for (let x = -span; x <= span; x++) {
    for (let y = -span; y <= span; y++) {
      const z = -x - y;
      const h = { x, y, z };
      if (inHexagon(h) || pointOf(h) !== null) hexes.push(h);
    }
  }

  // Pointy-top hex layout: the up and down triangles come out as points, and
  // the other four sit at the diagonals.
  const place = (h: Hex) => ({ px: h.x + h.z / 2, py: (h.z * Math.sqrt(3)) / 2 });

  // Reading order, top row first, so the DOM order matches what you see.
  hexes.sort((a, b) => {
    const pa = place(a);
    const pb = place(b);
    return pa.py - pb.py || pa.px - pb.px;
  });

  const raw = hexes.map(place);
  const minX = Math.min(...raw.map((p) => p.px));
  const maxX = Math.max(...raw.map((p) => p.px));
  const minY = Math.min(...raw.map((p) => p.py));
  const maxY = Math.max(...raw.map((p) => p.py));
  // One scale for both axes, or the star would be stretched to a square and
  // the holes would stop sitting at the corners of regular hexagons. The star
  // is the taller way, so it fills the height and is centred across.
  const spanX = maxX - minX;
  const spanY = maxY - minY;
  const scale = 1 / Math.max(spanX, spanY);
  const padX = (1 - spanX * scale) / 2;
  const padY = (1 - spanY * scale) / 2;

  const key = (h: Hex) => `${h.x},${h.y}`;
  const at = new Map(hexes.map((h, i) => [key(h), i]));

  const DIRS: Hex[] = [
    { x: 1, y: -1, z: 0 },
    { x: 1, y: 0, z: -1 },
    { x: 0, y: 1, z: -1 },
    { x: -1, y: 1, z: 0 },
    { x: -1, y: 0, z: 1 },
    { x: 0, y: -1, z: 1 },
  ];

  const step = (h: Hex, d: Hex, times: number) =>
    at.get(key({ x: h.x + d.x * times, y: h.y + d.y * times, z: h.z + d.z * times })) ??
    null;

  return {
    hexes,
    /** Screen position of each hole, 0-1 across a square board. */
    pos: raw.map((p) => ({
      x: (p.px - minX) * scale + padX,
      y: (p.py - minY) * scale + padY,
    })),
    /** How far apart two touching holes sit, in the same 0-1 units. */
    spacing: scale,
    /** Touching holes, by direction; null where the star ends. */
    neighbours: hexes.map((h) => DIRS.map((d) => step(h, d, 1))),
    /** The hole two along in each direction — where a jump lands. */
    landings: hexes.map((h) => DIRS.map((d) => step(h, d, 2))),
    points: hexes.map(pointOf),
  };
}

const BOARD = buildBoard();

export const HOLES = BOARD.hexes.length;
export const POS = BOARD.pos;
/** Gap between touching holes, as a fraction of the board — the UI sizes the
    marbles from it, so nothing has to restate the geometry. */
export const SPACING = BOARD.spacing;
export const NEIGHBOURS = BOARD.neighbours;
export const POINT_OF = BOARD.points;

/** The holes of one triangle. */
export const holesOf = (point: PointName): number[] =>
  POINT_OF.reduce<number[]>((hs, p, i) => (p === point ? [...hs, i] : hs), []);

/**
 * Which triangle each player starts in, by player count. Two face each other,
 * three alternate so every target is empty, four take two facing pairs — and
 * in each case the order matches GameShell's seats: bottom, left, top, right.
 */
const SEATS: Record<PlayerCount, PointName[]> = {
  2: ['down', 'up'],
  3: ['down', 'up-left', 'up-right'],
  4: ['down', 'down-left', 'up', 'up-right'],
};

export const homeOf = (player: PlayerId, players: PlayerCount): PointName =>
  SEATS[players][player - 1];

export const targetOf = (player: PlayerId, players: PlayerCount): PointName =>
  opposite(homeOf(player, players));

export const playerList = (state: CcState): PlayerId[] =>
  Array.from({ length: state.players }, (_, i) => (i + 1) as PlayerId);

export const nextPlayer = (p: PlayerId, players: PlayerCount): PlayerId =>
  ((p % players) + 1) as PlayerId;

export function newGame(players: PlayerCount): CcState {
  const board: Cell[] = Array(HOLES).fill(null);
  for (let i = 0; i < players; i++) {
    const player = (i + 1) as PlayerId;
    for (const hole of holesOf(homeOf(player, players))) board[hole] = player;
  }
  return { players, board, turn: 1, winner: null, lastMove: null };
}

/**
 * Every hole the marble on `from` can reach this turn: one step to a touching
 * empty hole, or a chain of jumps, stopping wherever you like along it.
 */
export function movesFrom(state: CcState, from: number): number[] {
  if (state.winner || state.board[from] !== state.turn) return [];

  const reached = new Set<number>();
  for (const to of NEIGHBOURS[from]) {
    if (to !== null && state.board[to] === null) reached.add(to);
  }

  // Jump chains: hop a touching marble of any colour, land straight beyond,
  // and carry on from there.
  const jumped = new Set<number>([from]);
  const queue = [from];
  while (queue.length > 0) {
    const at = queue.pop()!;
    NEIGHBOURS[at].forEach((over, dir) => {
      if (over === null || state.board[over] === null) return;
      const land = BOARD.landings[at][dir];
      if (land === null || state.board[land] !== null || jumped.has(land)) return;
      jumped.add(land);
      reached.add(land);
      queue.push(land);
    });
  }
  return [...reached].sort((a, b) => a - b);
}

/** The marbles that have somewhere to go this turn. */
export function movable(state: CcState): number[] {
  if (state.winner) return [];
  const moves: number[] = [];
  for (let i = 0; i < HOLES; i++) {
    if (state.board[i] === state.turn && movesFrom(state, i).length > 0) moves.push(i);
  }
  return moves;
}

/** How many of a player's marbles are home in the triangle across the board. */
export function marblesHome(state: CcState, player: PlayerId): number {
  const target = targetOf(player, state.players);
  return holesOf(target).reduce(
    (n, hole) => (state.board[hole] === player ? n + 1 : n),
    0,
  );
}

export function applyMove(state: CcState, move: CcMove): CcState {
  const board = state.board.slice();
  board[move.to] = board[move.from];
  board[move.from] = null;

  const next: CcState = { ...state, board, lastMove: move };
  if (marblesHome(next, state.turn) === MARBLES) {
    next.winner = state.turn;
    return next;
  }
  next.turn = nextPlayer(state.turn, state.players);
  return next;
}
