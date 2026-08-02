import type { GameHelp } from '../../components/HelpModal';

export const utttHelp: GameHelp = {
  title: 'Ultimate Tic-Tac-Toe',
  objective:
    'Win three small boards in a row on the big grid — across, down, or diagonally.',
  sections: [
    {
      heading: 'Placing marks',
      items: [
        'Nine small tic-tac-toe boards sit in a big three-by-three grid.',
        'Player 1 is ✕ and goes first; Player 2 is ○. Tap any empty square in a highlighted board.',
      ],
    },
    {
      heading: 'Where you must play',
      items: [
        'The square you pick inside a small board decides where your opponent plays next: the matching small board in the big grid.',
        'Play the top-right square of a board and your opponent must play in the top-right board.',
        'That can send them straight back into the board you just played in.',
      ],
    },
    {
      heading: 'Free moves',
      items: [
        'The first move of the game can go anywhere.',
        'If you are sent to a board that is already won or completely full, you may play in any board still open instead.',
      ],
    },
    {
      heading: 'Winning',
      items: [
        'Three in a row wins a small board, and that board closes — no more moves in it.',
        'Win three small boards in a row on the big grid to win the game.',
        'A small board that fills up with no winner counts for neither player.',
        'If every small board is decided and nobody has a line, the game is a draw.',
      ],
    },
  ],
};
