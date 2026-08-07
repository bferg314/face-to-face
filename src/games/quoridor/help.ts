import type { GameHelp } from '../../components/HelpModal';

export const quoridorHelp: GameHelp = {
  title: 'Quoridor',
  objective:
    'Walk your pawn to the far side of the board — the side tinted your colour — before your opponent reaches theirs.',
  sections: [
    {
      heading: 'Your turn',
      items: [
        'Each turn you do one of two things: move your pawn one square, or place one wall. You cannot do both.',
        'Pawns move one square up, down, left or right, never diagonally and never through a wall.',
        'Player 1 starts at the bottom and heads for the top; with four players everyone crosses to the opposite side.',
      ],
    },
    {
      heading: 'Walls',
      items: [
        'Tap a groove between two squares to stand a wall there. A wall is two squares long and blocks both squares it runs past, for everyone.',
        'Two players hold ten walls each, four players hold five. Spend them well — once they are gone, all you can do is walk.',
        'Walls cannot overlap or cross one another.',
      ],
    },
    {
      heading: 'The one rule walls must keep',
      items: [
        'A wall may never shut a player out: everyone must always have some way through to their own side, however long.',
        'Grooves where a wall would break that rule cannot be tapped, and the preview turns red.',
      ],
    },
    {
      heading: 'Meeting face to face',
      items: [
        'If an opponent stands in the square you want, hop straight over them to the square behind.',
        'If that square is taken, walled off, or off the board, step diagonally around them instead.',
      ],
    },
    {
      heading: 'Winning',
      items: [
        'The first pawn to reach any square on its goal side wins at once.',
        'With move hints on, each panel counts the shortest run home from where that pawn stands.',
      ],
    },
  ],
};
