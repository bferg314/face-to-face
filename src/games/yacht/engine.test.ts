import { describe, expect, it } from 'vitest';
import { CATEGORIES, CATEGORY_IDS, scoreFor, type Category } from './scoring';
import {
  DICE,
  ROLLS,
  ROUNDS,
  available,
  bestCategory,
  dieValue,
  newGame,
  nextPlayer,
  roll,
  score,
  toggleHold,
  totals,
  type YachtState,
} from './engine';

/** A game with fixed dice, so a test reads the same every run. */
const game = (players: 2 | 3 | 4 = 2, seed = 12345) => newGame(players, seed);

/** Force a hand onto the table, as if it had been rolled. */
const withDice = (state: YachtState, dice: number[]): YachtState => ({
  ...state,
  dice,
  rollsLeft: 0,
});

describe('scoring a hand', () => {
  it('counts the numbers at the top', () => {
    expect(scoreFor('ones', [1, 1, 3, 4, 1])).toBe(3);
    expect(scoreFor('twos', [2, 2, 2, 4, 5])).toBe(6);
    expect(scoreFor('sixes', [6, 6, 6, 6, 6])).toBe(30);
    expect(scoreFor('fives', [1, 2, 3, 4, 6])).toBe(0);
  });

  it('pays a Full House the whole hand, and only for three and a pair', () => {
    expect(scoreFor('fullHouse', [3, 3, 3, 5, 5])).toBe(19);
    expect(scoreFor('fullHouse', [2, 2, 6, 6, 6])).toBe(22);
    expect(scoreFor('fullHouse', [3, 3, 3, 3, 5])).toBe(0); // four and a spare
    expect(scoreFor('fullHouse', [4, 4, 4, 4, 4])).toBe(0); // five alike is not a house
    expect(scoreFor('fullHouse', [1, 2, 3, 4, 5])).toBe(0);
  });

  it('pays Four of a Kind the four that made it, not the hand', () => {
    expect(scoreFor('fourOfAKind', [5, 5, 5, 5, 2])).toBe(20);
    expect(scoreFor('fourOfAKind', [3, 3, 3, 3, 3])).toBe(12); // five alike counts
    expect(scoreFor('fourOfAKind', [6, 6, 6, 2, 2])).toBe(0);
  });

  it('pays either straight thirty, and nothing for a broken one', () => {
    expect(scoreFor('littleStraight', [3, 1, 4, 5, 2])).toBe(30);
    expect(scoreFor('bigStraight', [6, 4, 2, 5, 3])).toBe(30);
    expect(scoreFor('littleStraight', [2, 3, 4, 5, 6])).toBe(0);
    expect(scoreFor('bigStraight', [1, 2, 3, 4, 5])).toBe(0);
    expect(scoreFor('littleStraight', [1, 2, 3, 4, 4])).toBe(0);
  });

  it('pays Choice whatever is showing, and Yacht fifty', () => {
    expect(scoreFor('choice', [6, 5, 4, 3, 2])).toBe(20);
    expect(scoreFor('yacht', [4, 4, 4, 4, 4])).toBe(50);
    expect(scoreFor('yacht', [4, 4, 4, 4, 1])).toBe(0);
  });

  it('has twelve boxes, each named and placed', () => {
    expect(CATEGORIES).toHaveLength(12);
    expect(CATEGORY_IDS).toHaveLength(ROUNDS);
    expect(new Set(CATEGORY_IDS).size).toBe(12);
    expect(CATEGORIES.filter((c) => c.section === 'upper')).toHaveLength(6);
    expect(CATEGORIES.every((c) => c.name && c.hint)).toBe(true);
  });

  it('scores an empty table as nothing at all', () => {
    for (const id of CATEGORY_IDS) expect(scoreFor(id, [])).toBe(0);
  });
});

describe('the dice', () => {
  it('always land between one and six', () => {
    for (let seed = 0; seed < 200; seed++) {
      for (let place = 0; place < DICE; place++) {
        const value = dieValue(seed, seed % 12, 1, seed % 3, place);
        expect(value).toBeGreaterThanOrEqual(1);
        expect(value).toBeLessThanOrEqual(6);
      }
    }
  });

  it('spreads over the six faces', () => {
    const seen = new Map<number, number>();
    for (let seed = 0; seed < 600; seed++) {
      const value = dieValue(seed, 0, 1, 0, 0);
      seen.set(value, (seen.get(value) ?? 0) + 1);
    }
    expect([...seen.keys()].sort()).toEqual([1, 2, 3, 4, 5, 6]);
    // Nothing like a proof of fairness — just that no face is starved.
    for (const count of seen.values()) expect(count).toBeGreaterThan(600 / 6 / 3);
  });

  it('gives the same hand to the same turn every time', () => {
    const first = roll(game());
    const again = roll(game());
    expect(first.dice).toEqual(again.dice);
    expect(first.dice).toHaveLength(DICE);
    expect(first.rollsLeft).toBe(ROLLS - 1);
  });

  it('deals different turns different dice', () => {
    const p1 = roll(game());
    const p2 = roll({ ...game(), turn: 2 });
    const later = roll({ ...game(), round: 4 });
    expect(p1.dice).not.toEqual(p2.dice);
    expect(p1.dice).not.toEqual(later.dice);
  });

  /**
   * The property the whole design rests on: what a place shows on a roll was
   * settled when the game was dealt. Undoing and keeping something different
   * cannot turn up better numbers, because the numbers were never waiting on
   * the decision.
   */
  it('shows the same faces in a place however the dice are kept', () => {
    const first = roll(game());

    const keepNone = roll(first);
    const keepTwo = roll(toggleHold(toggleHold(first, 0), 1));
    const keepAll = roll(
      [0, 1, 2, 3, 4].reduce((s, place) => toggleHold(s, place), first),
    );

    // Every place that was actually re-rolled shows the same thing each time.
    for (let place = 2; place < DICE; place++) {
      expect(keepTwo.dice[place]).toBe(keepNone.dice[place]);
    }
    // And a kept die simply stays as it was.
    expect(keepTwo.dice.slice(0, 2)).toEqual(first.dice.slice(0, 2));
    expect(keepAll.dice).toEqual(first.dice);
  });

  it('runs out after three rolls', () => {
    let s = game();
    for (let i = 0; i < ROLLS; i++) s = roll(s);
    expect(s.rollsLeft).toBe(0);
    const spent = s.dice;
    expect(roll(s).dice).toEqual(spent); // a fourth roll changes nothing
    expect(roll(s)).toBe(s);
  });

  it('will not keep a die before the first roll, or after the last', () => {
    // The same instance back, not a copy: nothing happened.
    const fresh = game();
    expect(toggleHold(fresh, 0)).toBe(fresh);

    let s = fresh;
    for (let i = 0; i < ROLLS; i++) s = roll(s);
    expect(toggleHold(s, 0)).toBe(s);
  });
});

describe('taking a turn', () => {
  it('writes the hand into a box and passes the dice on', () => {
    const s = withDice(roll(game()), [3, 3, 3, 5, 5]);
    const after = score(s, 'fullHouse');
    expect(after.scores[1].fullHouse).toBe(19);
    expect(after.lastScored).toEqual({ player: 1, category: 'fullHouse', points: 19 });
    expect(after.turn).toBe(2);
    expect(after.dice).toEqual([]);
    expect(after.rollsLeft).toBe(ROLLS);
    expect(after.held.every((h) => !h)).toBe(true);
  });

  it('allows a nought on purpose, when nothing fits', () => {
    const s = withDice(roll(game()), [1, 1, 2, 3, 4]);
    const after = score(s, 'yacht');
    expect(after.scores[1].yacht).toBe(0);
    expect(after.turn).toBe(2);
  });

  it('will not write over a box already filled', () => {
    const s = score(withDice(roll(game()), [1, 1, 1, 1, 1]), 'ones');
    const back = { ...s, turn: 1 as const, dice: [2, 2, 2, 2, 2], rollsLeft: 0 };
    expect(score(back, 'ones')).toBe(back);
  });

  it('will not score before the dice are rolled', () => {
    const s = game();
    expect(score(s, 'choice')).toBe(s);
  });

  it('goes round the table and counts the rounds', () => {
    let s = game(3);
    expect(s.round).toBe(0);
    s = score(withDice(s, [1, 1, 1, 1, 1]), 'ones');
    expect([s.turn, s.round]).toEqual([2, 0]);
    s = score(withDice(s, [2, 2, 2, 2, 2]), 'twos');
    expect([s.turn, s.round]).toEqual([3, 0]);
    s = score(withDice(s, [3, 3, 3, 3, 3]), 'threes');
    expect([s.turn, s.round]).toEqual([1, 1]); // back to the top, next round
    expect(nextPlayer(3, 3)).toBe(1);
  });

  it('offers only the boxes still empty, with what they would pay', () => {
    const s = withDice(roll(game()), [2, 2, 2, 5, 5]);
    const options = available(s);
    expect(options).toHaveLength(12);
    expect(options.find((o) => o.category === 'fullHouse')?.points).toBe(16);
    expect(options.find((o) => o.category === 'twos')?.points).toBe(6);

    const after = score(s, 'fullHouse');
    const later = withDice({ ...after, turn: 1 }, [2, 2, 2, 5, 5]);
    expect(available(later).map((o) => o.category)).not.toContain('fullHouse');
    expect(available(later)).toHaveLength(11);
  });

  it('picks out the best box on the table', () => {
    expect(bestCategory(withDice(roll(game()), [4, 4, 4, 4, 4]))).toBe('yacht');
    expect(bestCategory(withDice(roll(game()), [1, 2, 3, 4, 5]))).toBe('littleStraight');
    expect(bestCategory(game())).toBeNull(); // nothing rolled yet
  });
});

describe('a whole game', () => {
  /** Play every box in order, taking whatever the dice give. */
  function playOut(players: 2 | 3 | 4): YachtState {
    let s = game(players, 99);
    for (let i = 0; i < ROUNDS * players; i++) {
      s = roll(s);
      const next = available(s)[0];
      s = score(s, next.category);
    }
    return s;
  }

  it('ends with every card full and the highest total winning', () => {
    const s = playOut(2);
    expect(s.round).toBe(ROUNDS);
    for (const player of [1, 2] as const) {
      expect(Object.keys(s.scores[player])).toHaveLength(ROUNDS);
    }
    const table = totals(s);
    expect(s.winner).not.toBeNull();
    if (s.winner !== 'draw') {
      const best = Math.max(table[1], table[2]);
      expect(table[s.winner as 1 | 2]).toBe(best);
      expect(table[1]).not.toBe(table[2]);
    }
  });

  it('plays the same way for four, and stops when the last box is filled', () => {
    const s = playOut(4);
    expect(s.winner).not.toBeNull();
    for (const player of [1, 2, 3, 4] as const) {
      expect(Object.keys(s.scores[player])).toHaveLength(ROUNDS);
    }
    // Nothing more can happen.
    expect(available(s)).toEqual([]);
    expect(roll(s)).toBe(s);
    expect(score(s, 'choice')).toBe(s);
  });

  it('calls a tie a draw', () => {
    const base = game(2, 7);
    const filled = Object.fromEntries(
      CATEGORY_IDS.map((id) => [id, id === 'choice' ? 20 : 0]),
    ) as Record<Category, number>;
    const nearlyDone: YachtState = {
      ...base,
      scores: { 1: filled, 2: { ...filled, choice: undefined } } as YachtState['scores'],
      turn: 2,
      dice: [4, 4, 4, 4, 4],
      rollsLeft: 0,
    };
    const done = score(nearlyDone, 'choice');
    expect(totals(done)[1]).toBe(totals(done)[2]);
    expect(done.winner).toBe('draw');
  });
});
