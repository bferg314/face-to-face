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
import { ChessGame } from './chess/ChessGame';
import { chessHelp } from './chess/help';
import { ChessPiece } from './chess/pieces';
import { CcGame } from './chinesecheckers/CcGame';
import { ccHelp } from './chinesecheckers/help';
import { CcThumb } from './chinesecheckers/board';
import { QuoridorGame } from './quoridor/QuoridorGame';
import { quoridorHelp } from './quoridor/help';
import { QuoridorThumb } from './quoridor/board';
import { MorrisGame } from './morris/MorrisGame';
import { morrisHelp } from './morris/help';
import { MorrisThumb } from './morris/board';

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
  /** Games that are reshaped by a setting watch this to react when the
      player closes Settings, rather than mid-edit. */
  settingsOpen: boolean;
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
    meta: '2–4 players',
    thumb: (
      <>
        <span className="mini big db-thumb db-thumb-1" />
        <span className="mini big db-thumb db-thumb-2" />
      </>
    ),
    help: dotsBoxesHelp,
    Component: DotsBoxesGame,
  },
  {
    id: 'chess',
    title: 'Chess',
    meta: '2 players',
    thumb: (
      <>
        <ChessPiece type="n" className="cp-thumb cp-thumb-1" />
        <ChessPiece type="n" className="cp-thumb cp-thumb-2" />
      </>
    ),
    help: chessHelp,
    Component: ChessGame,
  },
  {
    id: 'morris',
    title: 'Nine Men’s Morris',
    meta: '2 players',
    thumb: <MorrisThumb />,
    help: morrisHelp,
    Component: MorrisGame,
  },
  {
    id: 'quoridor',
    title: 'Quoridor',
    meta: '2 or 4 players',
    thumb: <QuoridorThumb />,
    help: quoridorHelp,
    Component: QuoridorGame,
  },
  {
    id: 'chinese-checkers',
    title: 'Chinese Checkers',
    meta: '2–4 players',
    thumb: <CcThumb />,
    help: ccHelp,
    Component: CcGame,
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

/**
 * What one screen lying flat on a table can hold: everyone sees everything, so
 * a game needs no hidden hand; everyone reaches the same surface, so it plays
 * by tapping, not typing; and the app ships no assets, so it carries no
 * dictionary or artwork. Games that need any of the three belong elsewhere —
 * Boggle wanted all three at once, which is why it is no longer on this list.
 *
 * Player counts are capped at four: GameShell seats four chairs and the themes
 * carry four player colours.
 */
export const COMING_SOON: ComingSoonEntry[] = [
  // Glyphs are kept to shapes with wide font coverage: the chess and shrine
  // characters these reached for first came out as tofu on a bare system.
  { id: 'onitama', title: 'Onitama', meta: '2 players', glyph: '❖', glyphClass: 'big' },
  { id: 'connect-four', title: 'Connect Four', meta: '2 players', glyph: '●○' },
  { id: 'yacht', title: 'Yacht Dice', meta: '2–4 players', glyph: '⚄⚁' },
];
