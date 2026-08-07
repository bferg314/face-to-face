import { describe, expect, it } from 'vitest';
import { CARDS, CARD_IDS, type CardId } from './cards';
import {
  ARCH,
  HAND,
  SIZE,
  applyDiscard,
  applyMove,
  colOf,
  deal,
  hasAnyMove,
  idx,
  movesFrom,
  movesWith,
  newGame,
  rowOf,
  target,
  type OnitamaState,
  type PlayerId,
} from './engine';

/** A fixed deal, so a test position is the same every run. */
const DEAL: CardId[] = ['tiger', 'crab', 'monkey', 'crane', 'boar'];

/** Play moves in turn, asserting each is legal first. */
function play(state: OnitamaState, ...moves: Array<[number, number, CardId]>) {
  return moves.reduce<OnitamaState>((s, [from, to, card]) => {
    expect(movesFrom(s, from, card), `${from}→${to} with ${card}`).toContain(to);
    return applyMove(s, { from, to, card });
  }, state);
}

/** A board with only the pieces named, and whatever cards are handy. */
function position(
  pieces: Array<[number, PlayerId, boolean?]>,
  over: Partial<OnitamaState> = {},
): OnitamaState {
  const base = newGame(DEAL);
  const board = Array(SIZE * SIZE).fill(null);
  for (const [cell, player, master] of pieces) {
    board[cell] = { player, master: master ?? false };
  }
  return { ...base, board, turn: 1, ...over };
}

describe('the deck', () => {
  it('has sixteen cards, each with two to four moves', () => {
    expect(CARD_IDS).toHaveLength(16);
    expect(new Set(CARD_IDS).size).toBe(16);
    for (const id of CARD_IDS) {
      const card = CARDS[id];
      expect(card.id).toBe(id);
      expect(card.name.length).toBeGreaterThan(0);
      expect(card.moves.length).toBeGreaterThanOrEqual(2);
      expect(card.moves.length).toBeLessThanOrEqual(4);
    }
  });

  it('keeps every offset on the board and off the middle', () => {
    for (const id of CARD_IDS) {
      for (const { dx, dy } of CARDS[id].moves) {
        expect(Math.abs(dx)).toBeLessThanOrEqual(2);
        expect(Math.abs(dy)).toBeLessThanOrEqual(2);
        expect(dx === 0 && dy === 0).toBe(false);
      }
      // No card repeats a square.
      const seen = CARDS[id].moves.map((m) => `${m.dx},${m.dy}`);
      expect(new Set(seen).size).toBe(seen.length);
    }
  });

  it('splits the opening stamp evenly, so either player may start', () => {
    const ones = CARD_IDS.filter((id) => CARDS[id].starts === 1);
    expect(ones).toHaveLength(8);
    expect(CARD_IDS.length - ones.length).toBe(8);
  });

  it('deals five different cards', () => {
    for (let i = 0; i < 50; i++) {
      const five = deal();
      expect(five).toHaveLength(5);
      expect(new Set(five).size).toBe(5);
      expect(five.every((c) => CARD_IDS.includes(c))).toBe(true);
    }
  });
});

describe('newGame', () => {
  it('lines both sides up with the Master on its arch', () => {
    const s = newGame(DEAL);
    for (let col = 0; col < SIZE; col++) {
      expect(s.board[idx(0, col)]).toEqual({ player: 2, master: col === 2 });
      expect(s.board[idx(4, col)]).toEqual({ player: 1, master: col === 2 });
    }
    expect(s.board[ARCH[1]]).toEqual({ player: 1, master: true });
    expect(s.board[ARCH[2]]).toEqual({ player: 2, master: true });
    expect(s.board.filter((p) => p !== null)).toHaveLength(10);
  });

  it('deals two cards each and leaves one spare', () => {
    const s = newGame(DEAL);
    expect(s.hands[1]).toEqual(['tiger', 'crab']);
    expect(s.hands[2]).toEqual(['monkey', 'crane']);
    expect(s.side).toBe('boar');
    expect(s.hands[1]).toHaveLength(HAND);
  });

  it('lets the spare card decide who opens', () => {
    // Boar opens for player 1, Crane for player 2.
    expect(newGame(DEAL).turn).toBe(CARDS.boar.starts);
    expect(newGame(['tiger', 'crab', 'monkey', 'boar', 'crane']).turn).toBe(
      CARDS.crane.starts,
    );
  });
});

describe('reading a card', () => {
  it('sends player 1 up the board and player 2 down it', () => {
    const from = idx(2, 2);
    // Tiger: two forward, one back.
    expect(target(from, { dx: 0, dy: 2 }, 1)).toBe(idx(0, 2));
    expect(target(from, { dx: 0, dy: -1 }, 1)).toBe(idx(3, 2));
    expect(target(from, { dx: 0, dy: 2 }, 2)).toBe(idx(4, 2));
    expect(target(from, { dx: 0, dy: -1 }, 2)).toBe(idx(1, 2));
  });

  it('mirrors sideways for player 2 as well', () => {
    const from = idx(2, 2);
    expect(target(from, { dx: 1, dy: 0 }, 1)).toBe(idx(2, 3));
    expect(target(from, { dx: 1, dy: 0 }, 2)).toBe(idx(2, 1));
  });

  it('drops offsets that would leave the board', () => {
    expect(target(idx(0, 0), { dx: 0, dy: 1 }, 1)).toBeNull();
    expect(target(idx(0, 0), { dx: -1, dy: 0 }, 1)).toBeNull();
    expect(target(idx(4, 4), { dx: 0, dy: 1 }, 2)).toBeNull();
  });
});

describe('moving', () => {
  it('offers a card’s squares, minus the ones your own pieces hold', () => {
    const s = newGame(DEAL);
    // Crab from the back row: two forward-left/right are off the board, the
    // one straight ahead is open.
    expect(movesFrom(s, idx(4, 2), 'crab')).toEqual([idx(3, 2)]);
    // Tiger's step back is blocked by nothing — there is no row behind.
    expect(movesFrom(s, idx(4, 0), 'tiger')).toEqual([idx(2, 0)]);
  });

  it('will not move a piece that is not yours, or with a card you do not hold', () => {
    const s = newGame(DEAL);
    expect(movesFrom(s, idx(0, 0), 'tiger')).toEqual([]);
    expect(movesFrom(s, idx(4, 0), 'monkey')).toEqual([]);
  });

  it('takes an enemy piece by landing on it', () => {
    const s = position([
      [idx(2, 2), 1],
      [idx(1, 2), 2],
      [ARCH[1], 1, true],
      [ARCH[2], 2, true],
    ]);
    expect(movesFrom(s, idx(2, 2), 'crab')).toContain(idx(1, 2));
    const after = play(s, [idx(2, 2), idx(1, 2), 'crab']);
    expect(after.board[idx(1, 2)]).toEqual({ player: 1, master: false });
    expect(after.board[idx(2, 2)]).toBeNull();
    expect(after.winner).toBeNull();
  });

  it('passes the turn and cycles the card', () => {
    const s = newGame(DEAL);
    const after = play(s, [idx(4, 2), idx(3, 2), 'crab']);
    expect(after.turn).toBe(2);
    expect(after.side).toBe('crab'); // the card just played is the new spare
    expect(after.hands[1]).toEqual(['tiger', 'boar']); // and the old spare is in hand
    expect(after.hands[2]).toEqual(['monkey', 'crane']); // untouched
    expect(after.lastMove).toEqual({ from: idx(4, 2), to: idx(3, 2), card: 'crab' });
  });

  it('cycles cards back and forth over two turns', () => {
    let s = newGame(DEAL);
    s = play(s, [idx(4, 2), idx(3, 2), 'crab']);
    s = play(s, [idx(0, 2), idx(1, 2), 'crane']);
    expect(s.side).toBe('crane');
    expect(s.hands[2]).toEqual(['monkey', 'crab']);
    expect(s.turn).toBe(1);
  });
});

describe('winning', () => {
  it('wins by taking the Master — the Way of the Stone', () => {
    const s = position([
      [idx(1, 2), 1],
      [idx(0, 2), 2, true],
      [ARCH[1], 1, true],
    ]);
    const won = play(s, [idx(1, 2), idx(0, 2), 'crab']);
    expect(won.winner).toBe(1);
    expect(won.ending).toBe('stone');
    expect(won.turn).toBe(1); // the game stops where it stands
    expect(movesWith(won, 'tiger')).toEqual([]);
    expect(hasAnyMove(won)).toBe(false);
  });

  it('wins by reaching the enemy arch — the Way of the Stream', () => {
    const s = position([
      [idx(1, 2), 1, true],
      [idx(4, 0), 2, true],
    ]);
    const won = play(s, [idx(1, 2), ARCH[2], 'crab']);
    expect(won.winner).toBe(1);
    expect(won.ending).toBe('stream');
  });

  it('is not the Way of the Stream for a Student', () => {
    const s = position([
      [idx(1, 2), 1],
      [ARCH[1], 1, true],
      [idx(4, 0), 2, true],
    ]);
    const after = play(s, [idx(1, 2), ARCH[2], 'crab']);
    expect(after.winner).toBeNull();
    expect(after.turn).toBe(2);
  });

  it('lets player 2 win the same two ways', () => {
    const stone = position(
      [
        [idx(3, 2), 2],
        [idx(4, 2), 1, true],
      ],
      { turn: 2 },
    );
    // Monkey's forward diagonals point down the board for player 2.
    expect(movesFrom(stone, idx(3, 2), 'monkey')).toContain(idx(4, 1));
    const won = applyMove(stone, { from: idx(3, 2), to: idx(4, 2), card: 'monkey' });
    expect(won.winner).toBe(2);
    expect(won.ending).toBe('stone');

    const stream = position([[idx(3, 2), 2, true]], { turn: 2 });
    const arrived = applyMove(stream, {
      from: idx(3, 2),
      to: ARCH[1],
      card: 'crane',
    });
    expect(arrived.winner).toBe(2);
    expect(arrived.ending).toBe('stream');
  });
});

describe('having no move', () => {
  /**
   * Genuinely stuck, and it takes some doing: player 1's whole force has
   * reached the top row, and Crab and Elephant between them only go forward
   * or sideways. Forward is off the board from there, and sideways is always
   * one of their own — so not one of the five can move.
   */
  const stuckPosition = () =>
    position(
      [
        [idx(0, 0), 1, true],
        [idx(0, 1), 1],
        [idx(0, 2), 1],
        [idx(0, 3), 1],
        [idx(0, 4), 1],
      ],
      { hands: { 1: ['crab', 'elephant'], 2: ['monkey', 'crane'] } },
    );

  it('spots a player who is stuck', () => {
    const stuck = stuckPosition();
    expect(hasAnyMove(stuck)).toBe(false);
    expect(movesWith(stuck, 'crab')).toEqual([]);
    expect(movesWith(stuck, 'elephant')).toEqual([]);
    // Nothing to do with whose turn it is: the position simply has no
    // player-2 pieces either, so neither side can move in it.
    expect(hasAnyMove({ ...stuck, turn: 2 })).toBe(false);
  });

  it('hands a card over without moving', () => {
    const stuck = stuckPosition();
    const passed = applyDiscard(stuck, 'crab');
    expect(passed.turn).toBe(2);
    expect(passed.side).toBe('crab');
    expect(passed.hands[1]).toEqual(['boar', 'elephant']);
    expect(passed.board).toEqual(stuck.board);
    expect(passed.lastMove).toBeNull();
  });

  it('will not discard a card that is not in hand', () => {
    const s = newGame(DEAL);
    expect(applyDiscard(s, 'monkey')).toBe(s);
  });
});

describe('a whole opening', () => {
  it('keeps the board and the five cards straight throughout', () => {
    let s = newGame(DEAL);
    const cards = () => [...s.hands[1], ...s.hands[2], s.side].sort();
    const before = cards();

    s = play(s, [idx(4, 2), idx(3, 2), 'crab']);
    s = play(s, [idx(0, 1), idx(1, 1), 'crane']);
    s = play(s, [idx(4, 0), idx(2, 0), 'tiger']);

    expect(cards()).toEqual(before); // the same five, wherever they are
    expect(new Set(cards()).size).toBe(5);
    expect(s.hands[1]).toHaveLength(HAND);
    expect(s.hands[2]).toHaveLength(HAND);
    expect(s.board.filter((p) => p !== null)).toHaveLength(10);
    // Nobody has strayed off their own side of the arithmetic.
    expect(s.board.every((p, i) => p === null || (rowOf(i) >= 0 && colOf(i) >= 0))).toBe(
      true,
    );
  });
});
