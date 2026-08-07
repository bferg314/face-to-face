/**
 * Yacht engine.
 *
 * Five dice, three rolls a turn, twelve boxes to fill. On your turn you roll,
 * keep any dice you like, roll the rest up to twice more, and then write the
 * hand into one of your empty boxes — even for nothing, if nothing fits. When
 * every box on every card is full, the highest total wins.
 *
 * The dice are the only random thing in the collection, and they are not
 * random at all: `dieValue` is a pure function of the game's seed, the round,
 * whose turn it is, which roll it is, and *which of the five places* the die
 * sits in. That last part is what makes undo safe. Whichever dice you keep,
 * the places you re-roll show values that were settled the moment the game
 * was dealt — so no amount of undoing and re-rolling finds you better dice,
 * and undo goes back to being what it is everywhere else: a way to take back
 * a decision. Scoring the wrong box, which is the one unrecoverable mistake
 * in this game, becomes recoverable.
 */

import { CATEGORY_IDS, scoreFor, type Category } from './scoring';

export type PlayerId = 1 | 2 | 3 | 4;
export type PlayerCount = 2 | 3 | 4;

export const DICE = 5;
export const ROLLS = 3;
export const ROUNDS = CATEGORY_IDS.length;

export interface YachtState {
  players: PlayerCount;
  seed: number;
  /** Which time round the table this is, 0 to 11. */
  round: number;
  turn: PlayerId;
  /** The five faces, or empty before this turn's first roll. */
  dice: number[];
  held: boolean[];
  rollsLeft: number;
  scores: Record<PlayerId, Partial<Record<Category, number>>>;
  lastScored: { player: PlayerId; category: Category; points: number } | null;
  winner: PlayerId | 'draw' | null;
}

/** A 32-bit mix, so a handful of small numbers gives one well-spread one. */
function hash(...parts: number[]): number {
  let h = 0x9e3779b9;
  for (const part of parts) {
    h ^= part + 0x6d2b79f5 + (h << 6) + (h >>> 2);
    h = Math.imul(h ^ (h >>> 15), 1 | h);
    h ^= h + Math.imul(h ^ (h >>> 7), 61 | h);
    h >>>= 0;
  }
  return h >>> 0;
}

/**
 * The face a given place shows, on a given roll, in a given turn. Depends on
 * the place rather than on what was kept, which is the whole point.
 */
export const dieValue = (
  seed: number,
  round: number,
  player: PlayerId,
  rollIndex: number,
  place: number,
): number => (hash(seed, round, player, rollIndex, place) % 6) + 1;

export const playerList = (state: YachtState): PlayerId[] =>
  Array.from({ length: state.players }, (_, i) => (i + 1) as PlayerId);

export const nextPlayer = (p: PlayerId, players: PlayerCount): PlayerId =>
  ((p % players) + 1) as PlayerId;

export function newGame(
  players: PlayerCount,
  seed: number = Math.floor(Math.random() * 0xffffffff),
): YachtState {
  const scores = {} as YachtState['scores'];
  for (let i = 0; i < players; i++) scores[(i + 1) as PlayerId] = {};
  return {
    players,
    seed,
    round: 0,
    turn: 1,
    dice: [],
    held: Array(DICE).fill(false),
    rollsLeft: ROLLS,
    scores,
    lastScored: null,
    winner: null,
  };
}

/** Roll every die that is not being kept. */
export function roll(state: YachtState): YachtState {
  if (state.winner || state.rollsLeft === 0) return state;
  const rollIndex = ROLLS - state.rollsLeft;
  const dice = Array.from({ length: DICE }, (_, place) =>
    state.held[place] && state.dice.length > 0
      ? state.dice[place]
      : dieValue(state.seed, state.round, state.turn, rollIndex, place),
  );
  return { ...state, dice, rollsLeft: state.rollsLeft - 1 };
}

/** Keep a die, or let it go again. Only means anything with a roll to come. */
export function toggleHold(state: YachtState, place: number): YachtState {
  if (state.winner || state.dice.length === 0 || state.rollsLeft === 0) return state;
  const held = state.held.slice();
  held[place] = !held[place];
  return { ...state, held };
}

/** The boxes this player has not filled, and what the dice would put in them. */
export function available(state: YachtState): Array<{ category: Category; points: number }> {
  if (state.winner) return [];
  const taken = state.scores[state.turn];
  return CATEGORY_IDS.filter((id) => taken[id] === undefined).map((category) => ({
    category,
    points: scoreFor(category, state.dice),
  }));
}

/** The best of them, for the hint. Null before the dice are rolled. */
export function bestCategory(state: YachtState): Category | null {
  if (state.dice.length === 0) return null;
  return available(state).reduce<{ category: Category; points: number } | null>(
    (best, option) => (best === null || option.points > best.points ? option : best),
    null,
  )?.category ?? null;
}

export const totals = (state: YachtState): Record<PlayerId, number> =>
  Object.fromEntries(
    playerList(state).map((p) => [
      p,
      Object.values(state.scores[p]).reduce<number>((n, v) => n + (v ?? 0), 0),
    ]),
  ) as Record<PlayerId, number>;

const cardFull = (state: YachtState, player: PlayerId) =>
  CATEGORY_IDS.every((id) => state.scores[player][id] !== undefined);

/** Write the hand into a box and hand the dice on. */
export function score(state: YachtState, category: Category): YachtState {
  if (state.winner || state.dice.length === 0) return state;
  if (state.scores[state.turn][category] !== undefined) return state;

  const points = scoreFor(category, state.dice);
  const scores = {
    ...state.scores,
    [state.turn]: { ...state.scores[state.turn], [category]: points },
  };
  const next: YachtState = {
    ...state,
    scores,
    lastScored: { player: state.turn, category, points },
    dice: [],
    held: Array(DICE).fill(false),
    rollsLeft: ROLLS,
    turn: nextPlayer(state.turn, state.players),
    round: state.turn === state.players ? state.round + 1 : state.round,
  };

  if (playerList(next).every((p) => cardFull(next, p))) {
    const table = totals(next);
    const best = Math.max(...Object.values(table));
    const winners = playerList(next).filter((p) => table[p] === best);
    next.winner = winners.length === 1 ? winners[0] : 'draw';
  }
  return next;
}
