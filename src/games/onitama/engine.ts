/**
 * Onitama engine.
 *
 * A 5 × 5 board, index = row * 5 + col with row 0 at the top. Player 1 sits at
 * the bottom and player 2 at the top, matching where GameShell seats them.
 * Each player starts with a Master on the middle square of their back row —
 * their Temple Arch — and four Students either side of it.
 *
 * Five cards are dealt from the sixteen: two to each player and one left over.
 * A turn is: play one of your two cards, move one piece by one of its offsets,
 * then put that card down as the new spare and take the old spare into hand.
 * Cards therefore cycle between the players, and every one of them is face up
 * all game — the deal is the only random thing that ever happens.
 *
 * Rule choices:
 *  - Offsets are written from the mover's own side, and mirrored for player 2,
 *    so a card means the same to whoever holds it.
 *  - You win by taking the enemy Master (the Way of the Stone) or by landing
 *    your own Master on the enemy Temple Arch (the Way of the Stream).
 *  - A player with no legal move still has to swap: `applyDiscard` plays a
 *    card for nothing, which is the only way a turn passes without a move.
 */

import { CARDS, CARD_IDS, type CardId } from './cards';

export type PlayerId = 1 | 2;

export interface Piece {
  player: PlayerId;
  master: boolean;
}

export interface OnitamaMove {
  from: number;
  to: number;
  card: CardId;
}

export type Ending = 'stone' | 'stream' | null;

export interface OnitamaState {
  board: (Piece | null)[];
  /** Two cards each, in hand and face up. */
  hands: Record<PlayerId, CardId[]>;
  /** The card left over, which the player to move will take. */
  side: CardId;
  turn: PlayerId;
  winner: PlayerId | null;
  ending: Ending;
  lastMove: OnitamaMove | null;
}

export const SIZE = 5;
export const HAND = 2;

export const idx = (row: number, col: number) => row * SIZE + col;
export const rowOf = (i: number) => Math.floor(i / SIZE);
export const colOf = (i: number) => i % SIZE;
export const other = (p: PlayerId): PlayerId => (p === 1 ? 2 : 1);

/** Each player's Temple Arch: the middle of their own back row. */
export const ARCH: Record<PlayerId, number> = {
  1: idx(SIZE - 1, 2),
  2: idx(0, 2),
};

/** Five cards for a new game: two each and the spare, in that order. */
export function deal(random: () => number = Math.random): CardId[] {
  const pool = [...CARD_IDS];
  const picked: CardId[] = [];
  for (let i = 0; i < 5; i++) {
    picked.push(...pool.splice(Math.floor(random() * pool.length), 1));
  }
  return picked;
}

/**
 * `cards` is [player 1's two, player 2's two, the spare]. Passing it keeps a
 * game repeatable — tests deal by hand, the app deals at random.
 */
export function newGame(cards: CardId[] = deal()): OnitamaState {
  const board: (Piece | null)[] = Array(SIZE * SIZE).fill(null);
  for (let col = 0; col < SIZE; col++) {
    board[idx(0, col)] = { player: 2, master: col === 2 };
    board[idx(SIZE - 1, col)] = { player: 1, master: col === 2 };
  }
  const side = cards[4];
  return {
    board,
    hands: { 1: [cards[0], cards[1]], 2: [cards[2], cards[3]] },
    side,
    // The spare card's stamp opens the game, as it does on the table.
    turn: CARDS[side].starts,
    winner: null,
    ending: null,
    lastMove: null,
  };
}

/**
 * Where an offset lands, from `from`, for `player`. Player 2 reads the board
 * upside down, so both axes flip for them.
 */
export function target(
  from: number,
  offset: { dx: number; dy: number },
  player: PlayerId,
): number | null {
  const facing = player === 1 ? 1 : -1;
  const row = rowOf(from) - offset.dy * facing;
  const col = colOf(from) + offset.dx * facing;
  if (row < 0 || row >= SIZE || col < 0 || col >= SIZE) return null;
  return idx(row, col);
}

/** Where the piece on `from` may go with `card`. */
export function movesFrom(state: OnitamaState, from: number, card: CardId): number[] {
  const piece = state.board[from];
  if (state.winner || piece === null || piece.player !== state.turn) return [];
  if (!state.hands[state.turn].includes(card)) return [];

  const moves: number[] = [];
  for (const offset of CARDS[card].moves) {
    const to = target(from, offset, state.turn);
    if (to === null) continue;
    // Your own pieces block; anything else is a square to take.
    if (state.board[to]?.player === state.turn) continue;
    moves.push(to);
  }
  return moves;
}

/** Every move the card offers, across all of the mover's pieces. */
export function movesWith(state: OnitamaState, card: CardId): OnitamaMove[] {
  if (state.winner) return [];
  const moves: OnitamaMove[] = [];
  for (let from = 0; from < state.board.length; from++) {
    if (state.board[from]?.player !== state.turn) continue;
    for (const to of movesFrom(state, from, card)) moves.push({ from, to, card });
  }
  return moves;
}

/** Whether the player to move can do anything at all with either card. */
export function hasAnyMove(state: OnitamaState): boolean {
  return state.hands[state.turn].some((card) => movesWith(state, card).length > 0);
}

/** Put the played card down as the spare and take the old spare into hand. */
function swapCard(state: OnitamaState, card: CardId): Pick<OnitamaState, 'hands' | 'side'> {
  return {
    hands: {
      ...state.hands,
      [state.turn]: state.hands[state.turn].map((c) => (c === card ? state.side : c)),
    },
    side: card,
  };
}

export function applyMove(state: OnitamaState, move: OnitamaMove): OnitamaState {
  const board = state.board.slice();
  const piece = board[move.from]!;
  const taken = board[move.to];
  board[move.to] = piece;
  board[move.from] = null;

  const next: OnitamaState = {
    ...state,
    board,
    ...swapCard(state, move.card),
    lastMove: move,
  };

  if (taken?.master) {
    next.winner = state.turn;
    next.ending = 'stone';
    return next;
  }
  if (piece.master && move.to === ARCH[other(state.turn)]) {
    next.winner = state.turn;
    next.ending = 'stream';
    return next;
  }
  next.turn = other(state.turn);
  return next;
}

/**
 * Give up the turn by playing a card for nothing. Only reachable when there is
 * no legal move — the rules still make you hand a card over.
 */
export function applyDiscard(state: OnitamaState, card: CardId): OnitamaState {
  if (state.winner || !state.hands[state.turn].includes(card)) return state;
  return {
    ...state,
    ...swapCard(state, card),
    lastMove: null,
    turn: other(state.turn),
  };
}
