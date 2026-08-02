import { describe, expect, it } from 'vitest';
import {
  applyMove,
  legalPits,
  newGame,
  other,
  ownsPit,
  STORE,
  type MancalaState,
} from './engine';

/** A state with hand-placed pit counts, everything else at defaults. */
function position(pits: number[], turn: 1 | 2 = 1): MancalaState {
  expect(pits).toHaveLength(14);
  return { ...newGame(), pits: pits.slice(), turn };
}

/** Play a sequence of pits, asserting each is legal first. */
function playLegal(state: MancalaState, ...pits: number[]) {
  return pits.reduce((s, pit) => {
    expect(legalPits(s), `pit ${pit} must be legal`).toContain(pit);
    return applyMove(s, pit);
  }, state);
}

const totalSeeds = (s: MancalaState) => s.pits.reduce((a, b) => a + b, 0);

describe('newGame', () => {
  it('deals four seeds to each of the twelve pits, stores empty', () => {
    const s = newGame();
    expect(s.pits).toHaveLength(14);
    expect(s.pits[STORE[1]]).toBe(0);
    expect(s.pits[STORE[2]]).toBe(0);
    expect(totalSeeds(s)).toBe(48);
    expect(s.turn).toBe(1);
    expect(s.winner).toBeNull();
  });

  it('offers each player only their own non-empty pits', () => {
    expect(legalPits(newGame())).toEqual([0, 1, 2, 3, 4, 5]);
    expect(legalPits({ ...newGame(), turn: 2 })).toEqual([7, 8, 9, 10, 11, 12]);
    expect(ownsPit(1, 6)).toBe(false); // a store is not a sowable pit
    expect(ownsPit(2, 13)).toBe(false);
  });

  it('skips empty pits when listing legal moves', () => {
    const s = position([0, 4, 0, 4, 0, 4, 0, 4, 4, 4, 4, 4, 4, 0]);
    expect(legalPits(s)).toEqual([1, 3, 5]);
  });
});

describe('sowing', () => {
  it('sows one seed per pit counterclockwise and records the path', () => {
    const s = playLegal(newGame(), 0);
    expect(s.pits[0]).toBe(0);
    expect(s.pits.slice(1, 5)).toEqual([5, 5, 5, 5]);
    expect(s.pits[5]).toBe(4); // only four seeds, so pit 5 is untouched
    expect(s.lastMove?.path).toEqual([1, 2, 3, 4]);
    expect(totalSeeds(s)).toBe(48);
  });

  it('drops a seed in your own store as it passes', () => {
    // Pit 5 is adjacent to player 1's store.
    const s = playLegal(newGame(), 5);
    expect(s.pits[STORE[1]]).toBe(1);
    expect(s.lastMove?.path).toContain(STORE[1]);
  });

  it('skips the opponent’s store entirely', () => {
    // 12 seeds in pit 0 wrap right around past player 2's store.
    const s = applyMove(position([12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]), 0);
    expect(s.pits[STORE[2]]).toBe(0);
    expect(s.lastMove?.path).not.toContain(STORE[2]);
    expect(s.pits[STORE[1]]).toBe(1);
    expect(totalSeeds(s)).toBe(12);
  });
});

describe('extra turns', () => {
  it('gives another turn when the last seed lands in your own store', () => {
    // Pit 2 is four pits from the store, and opens with exactly four seeds.
    const s = playLegal(newGame(), 2);
    expect(s.pits[STORE[1]]).toBe(1);
    expect(s.lastMove?.extraTurn).toBe(true);
    expect(s.turn).toBe(1);
  });

  it('hands over the turn otherwise', () => {
    const s = playLegal(newGame(), 0);
    expect(s.lastMove?.extraTurn).toBe(false);
    expect(s.turn).toBe(2);
  });

  it('works the same for player 2', () => {
    // Pit 9 is four pits from player 2's store.
    const s = playLegal({ ...newGame(), turn: 2 }, 9);
    expect(s.pits[STORE[2]]).toBe(1);
    expect(s.lastMove?.extraTurn).toBe(true);
    expect(s.turn).toBe(2);
  });
});

describe('capturing', () => {
  it('captures the opposite pit when the last seed lands in your own empty pit', () => {
    // One seed in pit 0 lands in the empty pit 1; pit 11 opposite holds 5.
    const s = position([1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0]);
    const after = applyMove(s, 0);
    expect(after.lastMove?.captured).toBe(6); // the 5 opposite plus the lander
    expect(after.lastMove?.capturedFrom).toBe(11);
    expect(after.pits[STORE[1]]).toBe(6);
    expect(after.pits[1]).toBe(0);
    expect(after.pits[11]).toBe(0);
    expect(totalSeeds(after)).toBe(6);
  });

  it('does not capture when the pit opposite is empty', () => {
    // Pit 11 (opposite pit 1) is empty. Player 2 keeps seeds in pit 7 so the
    // end-of-game sweep does not fire and confuse the assertion.
    const s = position([1, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0]);
    const after = applyMove(s, 0);
    expect(after.lastMove?.captured).toBe(0);
    expect(after.lastMove?.capturedFrom).toBeNull();
    expect(after.pits[1]).toBe(1); // the seed stays put
    expect(after.pits[STORE[1]]).toBe(0);
    expect(after.winner).toBeNull();
  });

  it('does not capture on the opponent’s side', () => {
    // Pit 5 holds five seeds: store, 7, 8, 9, then a landing in empty pit 10,
    // which belongs to player 2 — no capture. Pit 0 keeps player 1's side
    // occupied so the game does not end here.
    const s = position([1, 0, 0, 0, 0, 5, 0, 0, 2, 0, 0, 0, 0, 0]);
    const after = applyMove(s, 5);
    expect(after.lastMove?.captured).toBe(0);
    expect(after.lastMove?.capturedFrom).toBeNull();
    expect(after.pits[10]).toBe(1);
    expect(after.winner).toBeNull();
  });

  it('does not capture when the last seed lands in your own occupied pit', () => {
    const s = position([1, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0]);
    const after = applyMove(s, 0);
    expect(after.lastMove?.captured).toBe(0);
    expect(after.pits[1]).toBe(4);
    expect(after.pits[11]).toBe(5);
  });
});

describe('winning', () => {
  it('sweeps the remaining side home when one side empties', () => {
    // Player 1's last seed empties their side; player 2 sweeps 3+2 = 5.
    const s = position([0, 0, 0, 0, 0, 1, 10, 0, 3, 0, 2, 0, 0, 9]);
    const after = applyMove(s, 5); // lands in player 1's store: side 1 now empty
    expect(after.pits.slice(0, 6).every((n) => n === 0)).toBe(true);
    expect(after.pits.slice(7, 13).every((n) => n === 0)).toBe(true);
    expect(after.pits[STORE[1]]).toBe(11);
    expect(after.pits[STORE[2]]).toBe(14); // 9 + the swept 5
    expect(after.winner).toBe(2);
    expect(totalSeeds(after)).toBe(25);
  });

  it('declares a draw on equal stores', () => {
    const s = position([0, 0, 0, 0, 0, 1, 5, 0, 0, 0, 0, 0, 0, 6]);
    const after = applyMove(s, 5);
    expect(after.pits[STORE[1]]).toBe(6);
    expect(after.pits[STORE[2]]).toBe(6);
    expect(after.winner).toBe('draw');
  });

  it('offers no moves once the game is over', () => {
    const s = position([0, 0, 0, 0, 0, 1, 5, 0, 0, 0, 0, 0, 0, 9]);
    const after = applyMove(s, 5);
    expect(after.winner).toBe(2);
    expect(legalPits(after)).toEqual([]);
  });

  it('conserves seeds across a full playout', () => {
    let s = newGame();
    let guard = 0;
    while (!s.winner && guard++ < 500) {
      const pits = legalPits(s);
      expect(pits.length).toBeGreaterThan(0);
      s = applyMove(s, pits[0]);
      expect(totalSeeds(s)).toBe(48);
    }
    expect(s.winner).not.toBeNull();
    expect(s.pits[STORE[1]] + s.pits[STORE[2]]).toBe(48);
  });
});

describe('purity', () => {
  it('does not mutate the state it is given', () => {
    const start = newGame();
    const snapshot = start.pits.slice();
    applyMove(start, 0);
    expect(start.pits).toEqual(snapshot);
    expect(start.turn).toBe(1);
    expect(other(start.turn)).toBe(2);
  });
});
