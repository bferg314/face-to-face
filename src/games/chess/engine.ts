/**
 * Chess engine.
 *
 * Board is a flat array of 64 cells, index = row * 8 + col, row 0 at the top —
 * the same shape as the checkers engine, so the two share their index helpers'
 * conventions. Player 1 starts at the bottom (rows 6–7), moves up, and moves
 * first; Player 2 starts at the top (rows 0–1) and moves down. In the usual
 * chess names Player 1 is White and a1 is index 56.
 *
 * Rule choices:
 *  - Full FIDE movement: castling, en passant, promotion to any of queen,
 *    rook, bishop or knight.
 *  - Legality is generate-then-filter. `pseudoMoves` ignores check entirely and
 *    `legalMoves` replays each move onto a scratch board, dropping any that
 *    leave the mover's own king attacked. Slower than pinned-piece bookkeeping
 *    and much harder to get wrong.
 *  - A promoting pawn move is four separate `Move`s, one per piece. The UI
 *    groups them by destination to raise its picker; keeping them separate is
 *    what makes the move counts in the tests line up with published ones.
 *  - Draws: stalemate, fifty-move, threefold repetition and insufficient
 *    material, all detected automatically. There is no resignation or draw
 *    offer — the control rail's New game covers both.
 */

export type PlayerId = 1 | 2;
export type PieceType = 'k' | 'q' | 'r' | 'b' | 'n' | 'p';
/** What a pawn may become. Kings can't be promoted to, pawns aren't a change. */
export type PromotionType = 'q' | 'r' | 'b' | 'n';

export interface Piece {
  /** Stable id assigned at setup, used for move animations in the UI. */
  id: number;
  player: PlayerId;
  type: PieceType;
}

export type Cell = Piece | null;

export interface Move {
  from: number;
  to: number;
  /** Square of the captured piece. Differs from `to` only for en passant. */
  captured: number | null;
  /** Present on a promoting pawn move. */
  promote?: PromotionType;
  /** Present on a castle: the rook moves alongside the king. */
  castle?: { rookFrom: number; rookTo: number };
}

/** Why the game stopped, for the win card and panel wording. */
export type Ending =
  | 'checkmate'
  | 'stalemate'
  | 'fifty-move'
  | 'repetition'
  | 'material';

export interface ChessState {
  board: Cell[];
  turn: PlayerId;
  winner: PlayerId | 'draw' | null;
  ending: Ending | null;
  /** Square a pawn has just stepped over, capturable en passant this turn. */
  enPassant: number | null;
  /** Cleared side by side as kings and rooks leave their home squares. */
  castling: Record<PlayerId, { king: boolean; queen: boolean }>;
  /** Plies since the last pawn move or capture; 100 is the fifty-move draw. */
  halfmove: number;
  /** Position key → times reached, for threefold repetition. Each state holds
      its own snapshot, so undo rewinds the count with everything else. */
  seen: Record<string, number>;
  /** Pieces each player has captured from their opponent. */
  capturedBy: Record<PlayerId, Piece[]>;
  lastMove: Move | null;
}

export const SIZE = 8;

export const idx = (row: number, col: number) => row * SIZE + col;
export const rowOf = (i: number) => Math.floor(i / SIZE);
export const colOf = (i: number) => i % SIZE;
export const isDark = (row: number, col: number) => (row + col) % 2 === 1;
export const other = (p: PlayerId): PlayerId => (p === 1 ? 2 : 1);

/** Rough worth of a piece, for the material edge shown on the panels. */
export const PIECE_VALUE: Record<PieceType, number> = {
  k: 0,
  q: 9,
  r: 5,
  b: 3,
  n: 3,
  p: 1,
};

const PROMOTIONS: readonly PromotionType[] = ['q', 'r', 'b', 'n'];

const inBounds = (row: number, col: number) =>
  row >= 0 && row < SIZE && col >= 0 && col < SIZE;

const at = (board: Cell[], row: number, col: number): Cell =>
  inBounds(row, col) ? board[idx(row, col)] : null;

/** Row a player's back rank sits on. */
const homeRow = (p: PlayerId) => (p === 1 ? SIZE - 1 : 0);
/** Row a player's pawns start on. */
const pawnRow = (p: PlayerId) => (p === 1 ? SIZE - 2 : 1);
/** Row a player's pawns promote on — the opponent's back rank. */
const promoRow = (p: PlayerId) => homeRow(other(p));
/** Row delta of one forward pawn step. */
const forward = (p: PlayerId) => (p === 1 ? -1 : 1);

type Dir = readonly [number, number];

const ORTHO: readonly Dir[] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];
const DIAG: readonly Dir[] = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
];
/** Every direction a king or queen moves in. */
const ROYAL: readonly Dir[] = [...ORTHO, ...DIAG];
const KNIGHT: readonly Dir[] = [
  [-2, -1],
  [-2, 1],
  [-1, -2],
  [-1, 2],
  [1, -2],
  [1, 2],
  [2, -1],
  [2, 1],
];

const BACK_RANK: readonly PieceType[] = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];

export function newGame(): ChessState {
  const board: Cell[] = Array(SIZE * SIZE).fill(null);
  let id = 0;
  for (const player of [2, 1] as PlayerId[]) {
    for (let c = 0; c < SIZE; c++) {
      board[idx(homeRow(player), c)] = { id: id++, player, type: BACK_RANK[c] };
      board[idx(pawnRow(player), c)] = { id: id++, player, type: 'p' };
    }
  }

  const state: ChessState = {
    board,
    turn: 1,
    winner: null,
    ending: null,
    enPassant: null,
    castling: { 1: { king: true, queen: true }, 2: { king: true, queen: true } },
    halfmove: 0,
    seen: {},
    capturedBy: { 1: [], 2: [] },
    lastMove: null,
  };
  // The opening position counts as the first sighting, so a shuffle back to it
  // is the second and third.
  return { ...state, seen: { [positionKey(state)]: 1 } };
}

/**
 * The position as a string, for repetition counting: placement, side to move,
 * castling rights and the en passant square, which is FIDE's definition of the
 * "same position" and not just the placement.
 *
 * The en passant square is included whenever a pawn has just stepped two,
 * where FIDE only counts it when the capture is actually available. The
 * difference can only ever miss a repetition, never invent one.
 */
function positionKey(state: ChessState): string {
  let placement = '';
  for (const cell of state.board) {
    placement += cell
      ? cell.player === 1
        ? cell.type.toUpperCase()
        : cell.type
      : '.';
  }
  const c = state.castling;
  const rights =
    `${c[1].king ? 'K' : ''}${c[1].queen ? 'Q' : ''}` +
    `${c[2].king ? 'k' : ''}${c[2].queen ? 'q' : ''}`;
  return `${placement} ${state.turn} ${rights || '-'} ${state.enPassant ?? '-'}`;
}

export function kingSquare(board: Cell[], player: PlayerId): number {
  for (let i = 0; i < board.length; i++) {
    const piece = board[i];
    if (piece && piece.player === player && piece.type === 'k') return i;
  }
  // Only reachable from a hand-built test position with no king on it.
  return -1;
}

/**
 * Walks one ray from (row, col) to the first occupied square. True when that
 * square holds a `by` piece that slides this way — `long` for the piece that
 * owns the direction, plus the queen, which owns them all.
 */
function rayHits(
  board: Cell[],
  row: number,
  col: number,
  [dr, dc]: Dir,
  by: PlayerId,
  long: PieceType,
): boolean {
  for (let i = 1; ; i++) {
    const r = row + dr * i;
    const c = col + dc * i;
    if (!inBounds(r, c)) return false;
    const piece = board[idx(r, c)];
    if (piece) return piece.player === by && (piece.type === long || piece.type === 'q');
  }
}

/**
 * Whether `player` attacks `square`. Scans outward from the square rather than
 * generating every enemy move, because this runs once per candidate move and
 * is the engine's hot path.
 */
export function attacked(board: Cell[], square: number, by: PlayerId): boolean {
  const row = rowOf(square);
  const col = colOf(square);

  // A pawn attacking this square sits one step *back* along its own direction
  // of travel, on either adjacent file.
  const pawnRowOfAttacker = row - forward(by);
  for (const dc of [-1, 1]) {
    const piece = at(board, pawnRowOfAttacker, col + dc);
    if (piece && piece.player === by && piece.type === 'p') return true;
  }
  for (const [dr, dc] of KNIGHT) {
    const piece = at(board, row + dr, col + dc);
    if (piece && piece.player === by && piece.type === 'n') return true;
  }
  for (const [dr, dc] of ROYAL) {
    const piece = at(board, row + dr, col + dc);
    if (piece && piece.player === by && piece.type === 'k') return true;
  }
  for (const dir of ORTHO) if (rayHits(board, row, col, dir, by, 'r')) return true;
  for (const dir of DIAG) if (rayHits(board, row, col, dir, by, 'b')) return true;
  return false;
}

export function inCheck(state: ChessState, player: PlayerId): boolean {
  const king = kingSquare(state.board, player);
  return king !== -1 && attacked(state.board, king, other(player));
}

/** The board a move produces, with none of the surrounding bookkeeping. */
function boardAfter(board: Cell[], move: Move): Cell[] {
  const next = board.slice();
  const mover = board[move.from]!;
  next[move.from] = null;
  // Cleared before the arrival, so a normal capture (where `captured` and `to`
  // are the same square) doesn't wipe the piece that just landed.
  if (move.captured !== null) next[move.captured] = null;
  next[move.to] = move.promote ? { ...mover, type: move.promote } : mover;
  if (move.castle) {
    next[move.castle.rookTo] = next[move.castle.rookFrom];
    next[move.castle.rookFrom] = null;
  }
  return next;
}

/** Castles available to `player`, ignoring where the king ends up. */
function castleMoves(state: ChessState, player: PlayerId): Move[] {
  const rights = state.castling[player];
  if (!rights.king && !rights.queen) return [];

  const row = homeRow(player);
  const king = idx(row, 4);
  // Castling out of check is illegal, as is crossing an attacked square. The
  // destination needs no test here: `legalMoves` drops any move that leaves
  // the mover in check, and that covers it.
  if (attacked(state.board, king, other(player))) return [];

  const moves: Move[] = [];
  const side = (
    right: 'king' | 'queen',
    rookCol: number,
    kingCol: number,
    rookToCol: number,
    between: number[],
  ) => {
    if (!rights[right]) return;
    const rook = state.board[idx(row, rookCol)];
    if (!rook || rook.player !== player || rook.type !== 'r') return;
    if (between.some((c) => state.board[idx(row, c)] !== null)) return;
    if (attacked(state.board, idx(row, rookToCol), other(player))) return;
    moves.push({
      from: king,
      to: idx(row, kingCol),
      captured: null,
      castle: { rookFrom: idx(row, rookCol), rookTo: idx(row, rookToCol) },
    });
  };
  // The rook's destination doubles as the square the king crosses, on both
  // sides — which is why `rookToCol` is what gets the attack test above.
  side('king', 7, 6, 5, [5, 6]);
  side('queen', 0, 2, 3, [1, 2, 3]);
  return moves;
}

/** Moves for the piece on `from`, without regard for the mover's own king. */
function pseudoMoves(state: ChessState, from: number): Move[] {
  const { board } = state;
  const piece = board[from];
  if (!piece) return [];

  const row = rowOf(from);
  const col = colOf(from);
  const moves: Move[] = [];

  const step = ([dr, dc]: Dir) => {
    const r = row + dr;
    const c = col + dc;
    if (!inBounds(r, c)) return;
    const target = board[idx(r, c)];
    if (!target) moves.push({ from, to: idx(r, c), captured: null });
    else if (target.player !== piece.player) {
      moves.push({ from, to: idx(r, c), captured: idx(r, c) });
    }
  };

  const slide = (dirs: readonly Dir[]) => {
    for (const [dr, dc] of dirs) {
      for (let i = 1; ; i++) {
        const r = row + dr * i;
        const c = col + dc * i;
        if (!inBounds(r, c)) break;
        const target = board[idx(r, c)];
        if (!target) {
          moves.push({ from, to: idx(r, c), captured: null });
          continue;
        }
        if (target.player !== piece.player) {
          moves.push({ from, to: idx(r, c), captured: idx(r, c) });
        }
        break;
      }
    }
  };

  // A pawn reaching the far rank becomes four moves, one per piece it may turn
  // into; anywhere else it is the single move it looks like.
  const pawnStep = (to: number, captured: number | null) => {
    if (rowOf(to) === promoRow(piece.player)) {
      for (const promote of PROMOTIONS) moves.push({ from, to, captured, promote });
    } else {
      moves.push({ from, to, captured });
    }
  };

  switch (piece.type) {
    case 'n':
      for (const dir of KNIGHT) step(dir);
      break;
    case 'k':
      for (const dir of ROYAL) step(dir);
      moves.push(...castleMoves(state, piece.player));
      break;
    case 'r':
      slide(ORTHO);
      break;
    case 'b':
      slide(DIAG);
      break;
    case 'q':
      slide(ROYAL);
      break;
    case 'p': {
      const dr = forward(piece.player);
      const ahead = row + dr;
      if (inBounds(ahead, col) && !board[idx(ahead, col)]) {
        pawnStep(idx(ahead, col), null);
        // The two-square opening step, only from the pawn's own rank and only
        // when both squares are clear. It can never promote.
        const twoAhead = row + 2 * dr;
        if (row === pawnRow(piece.player) && !board[idx(twoAhead, col)]) {
          moves.push({ from, to: idx(twoAhead, col), captured: null });
        }
      }
      for (const dc of [-1, 1]) {
        const c = col + dc;
        if (!inBounds(ahead, c)) continue;
        const to = idx(ahead, c);
        const target = board[to];
        if (target && target.player !== piece.player) pawnStep(to, to);
        // En passant is the one capture whose victim isn't on the square the
        // capturing pawn lands on.
        else if (!target && to === state.enPassant) {
          moves.push({ from, to, captured: idx(row, c) });
        }
      }
      break;
    }
  }

  return moves;
}

export function legalMoves(state: ChessState): Move[] {
  if (state.winner) return [];
  const moves: Move[] = [];
  for (let i = 0; i < state.board.length; i++) {
    const piece = state.board[i];
    if (!piece || piece.player !== state.turn) continue;
    for (const move of pseudoMoves(state, i)) {
      const after = boardAfter(state.board, move);
      const king = kingSquare(after, state.turn);
      if (king === -1 || !attacked(after, king, other(state.turn))) moves.push(move);
    }
  }
  return moves;
}

/**
 * True when neither side has the material to force mate: bare kings, a lone
 * minor piece, or two bishops on one colour of square. Two knights are left
 * out on purpose — mate is possible there, just not forcible, so FIDE leaves
 * that game to the fifty-move rule.
 */
export function insufficientMaterial(board: Cell[]): boolean {
  const bishops: number[] = [];
  let knights = 0;
  for (let i = 0; i < board.length; i++) {
    const piece = board[i];
    if (!piece || piece.type === 'k') continue;
    if (piece.type === 'b') bishops.push(i);
    else if (piece.type === 'n') knights++;
    // A pawn, rook or queen can still force it.
    else return false;
  }

  const minors = bishops.length + knights;
  if (minors <= 1) return true;
  if (knights > 0 || bishops.length !== 2) return false;
  // Same-coloured bishops can never cover the squares needed for mate, whether
  // they belong to one player or to both.
  return (
    isDark(rowOf(bishops[0]), colOf(bishops[0])) ===
    isDark(rowOf(bishops[1]), colOf(bishops[1]))
  );
}

/**
 * Plays `move` for the current player. Assumes it is legal — the UI gates on
 * `legalMoves`, matching how the other engines in this app work.
 */
export function applyMove(state: ChessState, move: Move): ChessState {
  const mover = state.board[move.from]!;
  const victim = move.captured !== null ? state.board[move.captured] : null;
  const board = boardAfter(state.board, move);

  const capturedBy = { 1: state.capturedBy[1], 2: state.capturedBy[2] };
  if (victim) capturedBy[state.turn] = [...capturedBy[state.turn], victim];

  const castling = {
    1: { ...state.castling[1] },
    2: { ...state.castling[2] },
  };
  if (mover.type === 'k') castling[mover.player] = { king: false, queen: false };
  // A rook leaving its corner ends that side's rights, and so does a rook being
  // taken on it. Touching either corner is enough of a test: a piece can only
  // arrive on one after the original rook left and cleared the right already.
  for (const player of [1, 2] as PlayerId[]) {
    const row = homeRow(player);
    for (const [right, col] of [
      ['king', 7],
      ['queen', 0],
    ] as const) {
      if (move.from === idx(row, col) || move.to === idx(row, col)) {
        castling[player][right] = false;
      }
    }
  }

  const steppedTwo =
    mover.type === 'p' && Math.abs(rowOf(move.to) - rowOf(move.from)) === 2;

  const next: ChessState = {
    board,
    turn: other(state.turn),
    winner: null,
    ending: null,
    enPassant: steppedTwo
      ? idx((rowOf(move.from) + rowOf(move.to)) / 2, colOf(move.from))
      : null,
    castling,
    halfmove: mover.type === 'p' || victim ? 0 : state.halfmove + 1,
    seen: state.seen,
    capturedBy,
    lastMove: move,
  };

  const key = positionKey(next);
  const seenCount = (state.seen[key] ?? 0) + 1;
  next.seen = { ...state.seen, [key]: seenCount };

  // Order matters: a mate delivered on the hundredth quiet ply is a win, not a
  // fifty-move draw.
  if (legalMoves(next).length === 0) {
    if (inCheck(next, next.turn)) {
      next.winner = state.turn;
      next.ending = 'checkmate';
    } else {
      next.winner = 'draw';
      next.ending = 'stalemate';
    }
  } else if (next.halfmove >= 100) {
    next.winner = 'draw';
    next.ending = 'fifty-move';
  } else if (seenCount >= 3) {
    next.winner = 'draw';
    next.ending = 'repetition';
  } else if (insufficientMaterial(board)) {
    next.winner = 'draw';
    next.ending = 'material';
  }

  return next;
}
