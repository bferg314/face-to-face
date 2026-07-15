/**
 * Mancala (Kalah) engine.
 *
 * Pit layout is the standard flat array of 14, counterclockwise:
 * indices 0–5 are Player 1's pits (left to right from their seat), 6 is
 * Player 1's store, 7–12 are Player 2's pits, 13 is Player 2's store.
 */

export type PlayerId = 1 | 2;

export const STORE: Record<PlayerId, number> = { 1: 6, 2: 13 };

export interface MancalaState {
  pits: number[];
  turn: PlayerId;
  winner: PlayerId | 'draw' | null;
  lastMove: {
    pit: number;
    /** Pits/stores that received a seed, in sowing order. */
    path: number[];
    /** Seeds captured by the move (0 = no capture). */
    captured: number;
    /** Opponent pit that was raided, or null. */
    capturedFrom: number | null;
    extraTurn: boolean;
  } | null;
}

export const other = (p: PlayerId): PlayerId => (p === 1 ? 2 : 1);

export const ownsPit = (player: PlayerId, i: number) =>
  player === 1 ? i >= 0 && i <= 5 : i >= 7 && i <= 12;

export function newGame(): MancalaState {
  const pits = Array(14).fill(4);
  pits[STORE[1]] = 0;
  pits[STORE[2]] = 0;
  return { pits, turn: 1, winner: null, lastMove: null };
}

export function legalPits(state: MancalaState): number[] {
  if (state.winner) return [];
  const pits: number[] = [];
  for (let i = 0; i < 14; i++) {
    if (ownsPit(state.turn, i) && state.pits[i] > 0) pits.push(i);
  }
  return pits;
}

export function applyMove(state: MancalaState, pit: number): MancalaState {
  const pits = state.pits.slice();
  let seeds = pits[pit];
  pits[pit] = 0;

  const skip = STORE[other(state.turn)];
  const myStore = STORE[state.turn];
  const path: number[] = [];
  let pos = pit;
  while (seeds > 0) {
    pos = (pos + 1) % 14;
    if (pos === skip) continue;
    pits[pos]++;
    seeds--;
    path.push(pos);
  }

  const extraTurn = pos === myStore;

  let captured = 0;
  let capturedFrom: number | null = null;
  if (!extraTurn && ownsPit(state.turn, pos) && pits[pos] === 1) {
    const opposite = 12 - pos;
    if (pits[opposite] > 0) {
      captured = pits[opposite] + 1;
      capturedFrom = opposite;
      pits[myStore] += captured;
      pits[pos] = 0;
      pits[opposite] = 0;
    }
  }

  let winner: MancalaState['winner'] = null;
  let turn = extraTurn ? state.turn : other(state.turn);

  const side1 = pits.slice(0, 6).reduce((a, b) => a + b, 0);
  const side2 = pits.slice(7, 13).reduce((a, b) => a + b, 0);
  if (side1 === 0 || side2 === 0) {
    // One side is empty: each player sweeps their remaining seeds home.
    pits[STORE[1]] += side1;
    pits[STORE[2]] += side2;
    for (let i = 0; i < 6; i++) pits[i] = 0;
    for (let i = 7; i < 13; i++) pits[i] = 0;
    winner =
      pits[STORE[1]] === pits[STORE[2]]
        ? 'draw'
        : pits[STORE[1]] > pits[STORE[2]]
          ? 1
          : 2;
  }

  return {
    pits,
    turn,
    winner,
    lastMove: { pit, path, captured, capturedFrom, extraTurn },
  };
}
