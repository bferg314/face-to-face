/**
 * The sixteen movement cards.
 *
 * Offsets are from the mover's own side of the board: `dx` to their right,
 * `dy` forward, away from them. The engine mirrors both for player 2, so a
 * card means the same thing in either hand.
 *
 * Each card in the real deck carries a red or blue stamp, and the stamp on the
 * fifth card decides who opens. `starts` is that stamp, named for what it
 * does — eight cards each, so the deal picks the first player exactly as the
 * deck does.
 */

export type CardId =
  | 'tiger'
  | 'dragon'
  | 'frog'
  | 'rabbit'
  | 'crab'
  | 'elephant'
  | 'goose'
  | 'rooster'
  | 'monkey'
  | 'mantis'
  | 'horse'
  | 'ox'
  | 'crane'
  | 'boar'
  | 'eel'
  | 'cobra';

export interface Card {
  id: CardId;
  name: string;
  /** Where the piece may go, relative to where it stands. */
  moves: ReadonlyArray<{ dx: number; dy: number }>;
  /** The player who opens when this card is the one left over. */
  starts: 1 | 2;
}

const move = (dx: number, dy: number) => ({ dx, dy });

export const CARDS: Record<CardId, Card> = {
  tiger: { id: 'tiger', name: 'Tiger', starts: 2, moves: [move(0, 2), move(0, -1)] },
  dragon: {
    id: 'dragon',
    name: 'Dragon',
    starts: 1,
    moves: [move(-2, 1), move(2, 1), move(-1, -1), move(1, -1)],
  },
  frog: {
    id: 'frog',
    name: 'Frog',
    starts: 1,
    moves: [move(-2, 0), move(-1, 1), move(1, -1)],
  },
  rabbit: {
    id: 'rabbit',
    name: 'Rabbit',
    starts: 2,
    moves: [move(2, 0), move(1, 1), move(-1, -1)],
  },
  crab: {
    id: 'crab',
    name: 'Crab',
    starts: 2,
    moves: [move(0, 1), move(-2, 0), move(2, 0)],
  },
  elephant: {
    id: 'elephant',
    name: 'Elephant',
    starts: 1,
    moves: [move(-1, 1), move(1, 1), move(-1, 0), move(1, 0)],
  },
  goose: {
    id: 'goose',
    name: 'Goose',
    starts: 2,
    moves: [move(-1, 1), move(-1, 0), move(1, 0), move(1, -1)],
  },
  rooster: {
    id: 'rooster',
    name: 'Rooster',
    starts: 1,
    moves: [move(1, 1), move(1, 0), move(-1, 0), move(-1, -1)],
  },
  monkey: {
    id: 'monkey',
    name: 'Monkey',
    starts: 2,
    moves: [move(-1, 1), move(1, 1), move(-1, -1), move(1, -1)],
  },
  mantis: {
    id: 'mantis',
    name: 'Mantis',
    starts: 1,
    moves: [move(-1, 1), move(1, 1), move(0, -1)],
  },
  horse: {
    id: 'horse',
    name: 'Horse',
    starts: 1,
    moves: [move(0, 1), move(-1, 0), move(0, -1)],
  },
  ox: { id: 'ox', name: 'Ox', starts: 2, moves: [move(0, 1), move(1, 0), move(0, -1)] },
  crane: {
    id: 'crane',
    name: 'Crane',
    starts: 2,
    moves: [move(0, 1), move(-1, -1), move(1, -1)],
  },
  boar: {
    id: 'boar',
    name: 'Boar',
    starts: 1,
    moves: [move(0, 1), move(-1, 0), move(1, 0)],
  },
  eel: {
    id: 'eel',
    name: 'Eel',
    starts: 2,
    moves: [move(-1, 1), move(-1, -1), move(1, 0)],
  },
  cobra: {
    id: 'cobra',
    name: 'Cobra',
    starts: 1,
    moves: [move(1, 1), move(1, -1), move(-1, 0)],
  },
};

export const CARD_IDS = Object.keys(CARDS) as CardId[];
