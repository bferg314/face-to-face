import type { GameHelp } from '../../components/HelpModal';

export const checkersHelp: GameHelp = {
  title: 'Checkers',
  objective:
    'Capture all of your opponent’s pieces, or leave them with no legal move.',
  sections: [
    {
      heading: 'Moving',
      items: [
        'Tap one of your pieces, then tap a highlighted square to move there.',
        'Regular pieces move one square diagonally, toward your opponent, onto an empty dark square.',
      ],
    },
    {
      heading: 'Capturing',
      items: [
        'Jump diagonally over an adjacent enemy piece onto the empty square beyond it to capture it.',
        'If the same piece can jump again right away, it keeps jumping — all in the same turn.',
        'With Forced captures on (see Settings), you must jump whenever a jump is available.',
      ],
    },
    {
      heading: 'Kings',
      items: [
        'A piece that reaches the far end of the board is crowned a king.',
        'Kings move and jump both forward and backward.',
      ],
    },
    {
      heading: 'Winning',
      items: [
        'You win when your opponent has no pieces left, or has no legal move on their turn.',
      ],
    },
  ],
};
