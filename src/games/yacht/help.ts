import type { GameHelp } from '../../components/HelpModal';

export const yachtHelp: GameHelp = {
  title: 'Yacht Dice',
  objective:
    'Fill all twelve boxes on your card over twelve turns, and finish with more points than anybody else.',
  sections: [
    {
      heading: 'Your turn',
      items: [
        'Roll all five dice. Tap any you want to keep, then roll the rest — three rolls in all, and you can stop early.',
        'Keeping a die is free: tap it again to send it back into the next roll.',
        'When you are done rolling, tap a box on your column of the card to write the hand into it. That ends your turn.',
      ],
    },
    {
      heading: 'The boxes',
      items: [
        'Ones through Sixes score every die showing that number — three fours is twelve.',
        'Full House is three alike and a pair, and pays the whole hand. Four of a Kind pays just the four that made it.',
        'Little Straight is 1-2-3-4-5 and Big Straight is 2-3-4-5-6, both worth thirty. Choice pays whatever is showing, and Yacht — all five alike — pays fifty.',
        'Every box is used exactly once. If nothing fits, you must still write a nought somewhere, so spend the awkward boxes early.',
      ],
    },
    {
      heading: 'Undo, and the dice',
      items: [
        'Undo takes back a roll or a scored box, including a box tapped by mistake.',
        'It cannot fish for better dice: what each place will show was settled when the game began, so re-rolling after an undo turns up exactly the same numbers.',
      ],
    },
    {
      heading: 'Winning',
      items: [
        'The game ends when every card is full. The highest total wins, and an exact tie is a draw.',
        'With move hints on, the box worth the most right now is marked.',
      ],
    },
  ],
};
