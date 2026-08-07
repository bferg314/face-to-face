/**
 * The twelve categories of Yacht (1938), and what a hand of five dice is
 * worth in each.
 *
 * This is the original game, not its later cousin: there is no upper-section
 * bonus, Full House and Four of a Kind score the dice themselves rather than a
 * flat figure, and both straights are worth thirty.
 *
 * Anything that does not match scores nothing, and taking a nought on purpose
 * is a legal move — with five dice and twelve boxes it has to be.
 */

export type Category =
  | 'ones'
  | 'twos'
  | 'threes'
  | 'fours'
  | 'fives'
  | 'sixes'
  | 'fullHouse'
  | 'fourOfAKind'
  | 'littleStraight'
  | 'bigStraight'
  | 'choice'
  | 'yacht';

export interface CategoryInfo {
  id: Category;
  name: string;
  /** The numbers at the top, or the combinations below them. */
  section: 'upper' | 'lower';
  /** What it takes, for the scorecard's own explanation. */
  hint: string;
}

export const CATEGORIES: CategoryInfo[] = [
  { id: 'ones', name: 'Ones', section: 'upper', hint: 'Every 1' },
  { id: 'twos', name: 'Twos', section: 'upper', hint: 'Every 2' },
  { id: 'threes', name: 'Threes', section: 'upper', hint: 'Every 3' },
  { id: 'fours', name: 'Fours', section: 'upper', hint: 'Every 4' },
  { id: 'fives', name: 'Fives', section: 'upper', hint: 'Every 5' },
  { id: 'sixes', name: 'Sixes', section: 'upper', hint: 'Every 6' },
  { id: 'fullHouse', name: 'Full House', section: 'lower', hint: 'Three and a pair' },
  {
    id: 'fourOfAKind',
    name: 'Four of a Kind',
    section: 'lower',
    hint: 'Four alike, and their total',
  },
  {
    id: 'littleStraight',
    name: 'Little Straight',
    section: 'lower',
    hint: '1-2-3-4-5, for 30',
  },
  { id: 'bigStraight', name: 'Big Straight', section: 'lower', hint: '2-3-4-5-6, for 30' },
  { id: 'choice', name: 'Choice', section: 'lower', hint: 'All five, whatever they are' },
  { id: 'yacht', name: 'Yacht', section: 'lower', hint: 'Five alike, for 50' },
];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

const sum = (dice: number[]) => dice.reduce((n, d) => n + d, 0);

/** How many of each face are showing, indexed 1-6. */
function counts(dice: number[]): number[] {
  const by = Array(7).fill(0);
  for (const die of dice) by[die]++;
  return by;
}

const faces = (dice: number[]) => [...new Set(dice)].sort((a, b) => a - b).join('');

export function scoreFor(category: Category, dice: number[]): number {
  if (dice.length === 0) return 0;
  const by = counts(dice);

  switch (category) {
    case 'ones':
    case 'twos':
    case 'threes':
    case 'fours':
    case 'fives':
    case 'sixes': {
      const face = CATEGORY_IDS.indexOf(category) + 1;
      return by[face] * face;
    }
    case 'fullHouse': {
      // Three of one face and two of another — five alike is not a house.
      const three = by.findIndex((n) => n === 3);
      const two = by.findIndex((n) => n === 2);
      return three > 0 && two > 0 ? sum(dice) : 0;
    }
    case 'fourOfAKind': {
      const face = by.findIndex((n) => n >= 4);
      return face > 0 ? face * 4 : 0;
    }
    case 'littleStraight':
      return faces(dice) === '12345' ? 30 : 0;
    case 'bigStraight':
      return faces(dice) === '23456' ? 30 : 0;
    case 'choice':
      return sum(dice);
    case 'yacht':
      return by.some((n) => n === 5) ? 50 : 0;
  }
}
