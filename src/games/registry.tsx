import type { ComponentType, ReactNode } from 'react';
import type { GameHelp } from '../components/HelpModal';
import type { Settings } from '../settings';
import { CheckersGame } from './checkers/CheckersGame';
import { checkersHelp } from './checkers/help';
import { ReversiGame } from './reversi/ReversiGame';
import { reversiHelp } from './reversi/help';
import { MancalaGame } from './mancala/MancalaGame';
import { mancalaHelp } from './mancala/help';
import { UtttGame } from './uttt/UtttGame';
import { utttHelp } from './uttt/help';
import { Mark } from './uttt/Mark';
import { DotsBoxesGame } from './dotsboxes/DotsBoxesGame';
import { dotsBoxesHelp } from './dotsboxes/help';

/**
 * The single list of games. Adding a game means adding one entry to `GAMES`
 * (and removing it from `COMING_SOON`) — App.tsx looks games up from here and
 * needs no edit.
 *
 * This file is .tsx rather than .ts because `thumb` holds JSX.
 *
 * Imports are deliberately eager: the whole app is a few hundred KB with no
 * assets, so lazy loading would buy nothing and cost a Suspense boundary and a
 * loading flash on a tablet served over the LAN.
 */

/** Props every game screen takes. */
export interface GameProps {
  settings: Settings;
  onExit: () => void;
  onOpenSettings: () => void;
}

export interface GameEntry {
  id: string;
  title: string;
  /** Player count shown on the lobby card. */
  meta: string;
  /** Lobby card artwork. */
  thumb: ReactNode;
  help: GameHelp;
  Component: ComponentType<GameProps>;
}

export const GAMES = [
  {
    id: 'checkers',
    title: 'Checkers',
    meta: '2 players',
    thumb: (
      <>
        <span className="mini big p1" />
        <span className="mini big p2" />
      </>
    ),
    help: checkersHelp,
    Component: CheckersGame,
  },
  {
    id: 'reversi',
    title: 'Reversi',
    meta: '2 players',
    thumb: (
      <>
        <span className="mini big disc-dark" />
        <span className="mini big disc-light" />
      </>
    ),
    help: reversiHelp,
    Component: ReversiGame,
  },
  {
    id: 'mancala',
    title: 'Mancala',
    meta: '2 players',
    thumb: (
      <>
        <span className="mini big seed-thumb" />
        <span className="mini big seed-thumb" />
        <span className="mini big seed-thumb" />
      </>
    ),
    help: mancalaHelp,
    Component: MancalaGame,
  },
  {
    id: 'uttt',
    title: 'Ultimate Tic-Tac-Toe',
    meta: '2 players',
    thumb: (
      <>
        <Mark player={1} className="thumb-mark" />
        <Mark player={2} className="thumb-mark" />
      </>
    ),
    help: utttHelp,
    Component: UtttGame,
  },
  {
    id: 'dots-boxes',
    title: 'Dots & Boxes',
    // The engine plays 2-4; the card says 2 until GameShell can seat more.
    meta: '2 players',
    thumb: (
      <>
        <span className="mini big db-thumb db-thumb-1" />
        <span className="mini big db-thumb db-thumb-2" />
      </>
    ),
    help: dotsBoxesHelp,
    Component: DotsBoxesGame,
  },
] as const satisfies readonly GameEntry[];

export type GameId = (typeof GAMES)[number]['id'];

export interface ComingSoonEntry {
  id: string;
  title: string;
  meta: string;
  glyph: string;
  glyphClass?: string;
}

export const COMING_SOON: ComingSoonEntry[] = [
  { id: 'chess', title: 'Chess', meta: '2 players', glyph: '♞' },
  { id: 'morris', title: 'Nine Men’s Morris', meta: '2 players', glyph: '▣' },
  { id: 'yacht', title: 'Yacht Dice', meta: '2–4 players', glyph: '⚄⚁' },
  { id: 'boggle', title: 'Boggle', meta: '2–4 players', glyph: 'B', glyphClass: 'tile' },
];
