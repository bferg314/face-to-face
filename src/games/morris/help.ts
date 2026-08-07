import type { GameHelp } from '../../components/HelpModal';

export const morrisHelp: GameHelp = {
  title: 'Nine Men’s Morris',
  objective:
    'Line up three of your men to take your opponent’s, until they are down to two men or have nowhere left to go.',
  sections: [
    {
      heading: 'Placing',
      items: [
        'You each start with nine men in hand. Take turns tapping any empty point to place one — Player 1 goes first.',
        'The placing phase ends when all eighteen men are on the board.',
      ],
    },
    {
      heading: 'Moving',
      items: [
        'Once your men are all placed, tap one of them and then an empty point joined to it by a line.',
        'Men only travel along the drawn lines, one point per turn, and never jump over another man.',
        'Flying: down to your last three men, you may move to any empty point on the board. Turn this off in Settings for the stricter game.',
      ],
    },
    {
      heading: 'Mills',
      items: [
        'Three of your men in a row along one line is a mill. Closing one lets you take an opponent’s man off the board straight away.',
        'You cannot take a man that stands in a mill of its own — unless every one of their men does.',
        'A mill can be opened and closed again as often as you like: each time it closes, it takes another man.',
      ],
    },
    {
      heading: 'Winning',
      items: [
        'You win when your opponent is down to two men, or cannot make a legal move on their turn.',
        'The game is a draw if the same position comes up three times, or if fifty moves pass with no mill closed and no man taken.',
      ],
    },
  ],
};
