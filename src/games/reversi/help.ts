import type { GameHelp } from '../../components/HelpModal';

export const reversiHelp: GameHelp = {
  title: 'Reversi',
  objective:
    'Finish the game with more discs of your color on the board than your opponent.',
  sections: [
    {
      heading: 'Placing discs',
      items: [
        'Tap an empty highlighted square to place a disc. Player 1 (dark) moves first.',
        'A move must outflank the opponent: your new disc and one of your existing discs trap a straight line of enemy discs between them — horizontally, vertically, or diagonally.',
      ],
    },
    {
      heading: 'Flipping',
      items: [
        'Every enemy disc trapped in a line by your move flips to your color.',
        'A single move can flip lines in several directions at once.',
      ],
    },
    {
      heading: 'Passing',
      items: [
        'If you have no legal move, your turn is skipped automatically and your opponent moves again.',
      ],
    },
    {
      heading: 'Winning',
      items: [
        'The game ends when neither player can move — usually when the board is full.',
        'The player with more discs wins; equal counts are a draw.',
      ],
    },
  ],
};
