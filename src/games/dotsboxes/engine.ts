/**
 * Dots & Boxes engine.
 *
 * The board is `size` × `size` boxes. Edges live in one flat index space so a
 * move is a plain number, like a uttt cell: the `size * (size + 1)` horizontal
 * edges first, then the `size * (size + 1)` vertical ones. Horizontal edge
 * (r, c) sits above box row r (r ∈ 0..size, c ∈ 0..size-1); vertical edge
 * (r, c) sits left of box column c (r ∈ 0..size-1, c ∈ 0..size). Every edge
 * borders one box (border) or two (interior), so "all boxes claimed" and
 * "all edges drawn" are the same moment — the game can't end on a dangling
 * non-completing move.
 *
 * Rule choices:
 *  - Drawing the fourth side of a box claims it for the mover, no matter who
 *    drew the other three, and the mover goes again. One edge can complete
 *    two boxes at once — both are claimed, still one extra turn. A "chain" is
 *    nothing special: just repeated completing moves.
 *  - The engine plays 2-4 players (`newGame(players)`); turn order is simple
 *    rotation via `next`. The UI currently seats only two.
 *  - When the last box is claimed, most boxes wins. Any tie for first —
 *    including a tie among a subset of 3-4 players — is 'draw', keeping the
 *    app-wide `winner: PlayerId | 'draw' | null` shape.
 */

export type PlayerId = 1 | 2 | 3 | 4;
export type PlayerCount = 2 | 3 | 4;
export type BoardSize = 4 | 6 | 8;

export interface DotsBoxesState {
  /** Boxes per side. */
  size: BoardSize;
  players: PlayerCount;
  /** 2 * size * (size+1) edges, horizontal block then vertical block.
      null = undrawn, a PlayerId = who drew it (colours the line). */
  edges: (PlayerId | null)[];
  /** size * size box owners, row-major. */
  boxes: (PlayerId | null)[];
  turn: PlayerId;
  winner: PlayerId | 'draw' | null;
  lastMove: {
    edge: number;
    player: PlayerId;
    /** Box indices this edge completed: [], one, or two of them. */
    completed: number[];
  } | null;
}

export const next = (p: PlayerId, players: PlayerCount): PlayerId =>
  ((p % players) + 1) as PlayerId;

export const hEdge = (size: number, r: number, c: number) => r * size + c;
export const vEdge = (size: number, r: number, c: number) =>
  size * (size + 1) + r * (size + 1) + c;

/** Edges of box (row-major index): [top, bottom, left, right]. */
export function boxEdges(size: number, box: number): [number, number, number, number] {
  const r = Math.floor(box / size);
  const c = box % size;
  return [hEdge(size, r, c), hEdge(size, r + 1, c), vEdge(size, r, c), vEdge(size, r, c + 1)];
}

/** The one or two boxes an edge borders. */
export function boxesOf(size: number, edge: number): number[] {
  const H = size * (size + 1);
  const boxes: number[] = [];
  if (edge < H) {
    const r = Math.floor(edge / size);
    const c = edge % size;
    if (r > 0) boxes.push((r - 1) * size + c);
    if (r < size) boxes.push(r * size + c);
  } else {
    const r = Math.floor((edge - H) / (size + 1));
    const c = (edge - H) % (size + 1);
    if (c > 0) boxes.push(r * size + c - 1);
    if (c < size) boxes.push(r * size + c);
  }
  return boxes;
}

export function newGame(players: PlayerCount = 2, size: BoardSize = 6): DotsBoxesState {
  return {
    size,
    players,
    edges: Array(2 * size * (size + 1)).fill(null),
    boxes: Array(size * size).fill(null),
    turn: 1,
    winner: null,
    lastMove: null,
  };
}

export function legalEdges(state: DotsBoxesState): number[] {
  if (state.winner) return [];
  const open: number[] = [];
  for (let e = 0; e < state.edges.length; e++) {
    if (state.edges[e] === null) open.push(e);
  }
  return open;
}

/** Seats in play, in turn order. */
export function playerList(state: DotsBoxesState): PlayerId[] {
  return ([1, 2, 3, 4] as PlayerId[]).slice(0, state.players);
}

/** Boxes claimed per player. Absent seats stay at zero — iterate
    `playerList`, not the keys. */
export function scores(state: DotsBoxesState): Record<PlayerId, number> {
  const tally: Record<PlayerId, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const owner of state.boxes) {
    if (owner !== null) tally[owner]++;
  }
  return tally;
}

/**
 * Draws `edge` for the current player. Assumes it is legal — the UI gates on
 * `legalEdges`, matching how the other engines in this app work.
 */
export function applyMove(state: DotsBoxesState, edge: number): DotsBoxesState {
  const { size, players, turn } = state;
  const edges = state.edges.slice();
  edges[edge] = turn;

  const boxes = state.boxes.slice();
  const completed = boxesOf(size, edge).filter(
    (b) => boxes[b] === null && boxEdges(size, b).every((e) => edges[e] !== null),
  );
  for (const b of completed) boxes[b] = turn;

  let winner: DotsBoxesState['winner'] = null;
  if (boxes.every((b) => b !== null)) {
    const tally: Record<number, number> = {};
    for (const b of boxes) tally[b as number] = (tally[b as number] ?? 0) + 1;
    const best = Math.max(...Object.values(tally));
    const leaders = Object.keys(tally).filter((p) => tally[Number(p)] === best);
    winner = leaders.length === 1 ? (Number(leaders[0]) as PlayerId) : 'draw';
  }

  return {
    size,
    players,
    edges,
    boxes,
    turn: completed.length > 0 ? turn : next(turn, players),
    winner,
    lastMove: { edge, player: turn, completed },
  };
}
