import type { GameHelp } from '../../components/HelpModal';

export const dotsBoxesHelp: GameHelp = {
  title: 'Dots & Boxes',
  objective:
    'Claim more boxes than anyone else by drawing the lines that complete them.',
  sections: [
    {
      heading: 'Drawing lines',
      items: [
        'The board is a grid of dots. On your turn, tap the gap between two neighbouring dots to draw a line there.',
        'Any undrawn line, anywhere on the board, is a legal move.',
      ],
    },
    {
      heading: 'Claiming boxes',
      items: [
        'Drawing the fourth side of a box claims it in your colour and scores a point — even if the other sides were drawn by someone else.',
        'One line can finish two boxes at once. You claim both.',
      ],
    },
    {
      heading: 'Extra turns',
      items: [
        'Completing a box means you move again immediately.',
        'Boxes often fall in chains — one careless line can hand your opponent a whole run of them.',
      ],
    },
    {
      heading: 'Winning',
      items: [
        'The game ends when every box is claimed.',
        'Most boxes wins. If the top score is shared, the game is a draw.',
      ],
    },
  ],
};
