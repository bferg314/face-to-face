import type { GameHelp } from '../../components/HelpModal';

export const c4Help: GameHelp = {
  title: 'Connect Four',
  objective:
    'Get four of your discs in a row — across, upwards, or on either diagonal — before your opponent does.',
  sections: [
    {
      heading: 'Dropping',
      items: [
        'Tap anywhere in a column to drop a disc into it. It falls to the lowest empty space, so where it lands is up to the board, not you.',
        'Player 1 goes first. A full column can no longer be tapped.',
      ],
    },
    {
      heading: 'Winning',
      items: [
        'Four of your discs in an unbroken line wins at once — across, straight up, or diagonally either way.',
        'The winning line lights up when it lands.',
        'If the board fills with nobody making four, the game is a draw.',
      ],
    },
    {
      heading: 'Hints',
      items: [
        'With move hints on, a column that would win for you this turn is outlined. It only ever marks your own winning drop — spotting the one your opponent needs, and taking it first, is still your job.',
      ],
    },
  ],
};
