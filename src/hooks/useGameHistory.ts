import { useState } from 'react';

/**
 * Shared undo stack for every game: the current state plus a stack of the
 * states that preceded it. Games own their engine's state shape; this only
 * needs to see `winner` to know whether a game is still in progress.
 */
type HasWinner = { winner: string | number | null };

export function useGameHistory<S extends HasWinner>(createGame: () => S) {
  const [state, setState] = useState<S>(createGame);
  const [past, setPast] = useState<S[]>([]);

  return {
    state,
    past,

    /** Push the current state onto the undo stack and advance to `next`. */
    play(next: S) {
      // `state` is read from the render closure on purpose. Pushing from
      // inside a setState updater would double-push under StrictMode, which
      // double-invokes updaters.
      setPast((p) => [...p, state]);
      setState(next);
    },

    /**
     * Revise the current state without touching the undo stack — for changes
     * that aren't moves, e.g. a rule setting toggled mid-game. Return the same
     * state to opt out.
     */
    amend(revise: (s: S) => S) {
      setState(revise);
    },

    undo() {
      if (past.length === 0) return;
      setState(past[past.length - 1]);
      setPast((p) => p.slice(0, -1));
    },

    /**
     * Takes no arguments so it can be passed straight to `onClick` without
     * the event landing in a parameter. `createGame` is a fresh closure each
     * render, so games whose setup depends on settings (checkers' forced-
     * capture rule) get the live value without a ref.
     */
    newMatch() {
      setState(createGame());
      setPast([]);
    },

    gameInProgress: past.length > 0 && !state.winner,
    undoDisabled: past.length === 0,
  };
}
