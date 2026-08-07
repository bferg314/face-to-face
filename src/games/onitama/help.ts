import type { GameHelp } from '../../components/HelpModal';

export const onitamaHelp: GameHelp = {
  title: 'Onitama',
  objective:
    'Take your opponent’s Master, or walk your own Master into the arch they started on.',
  sections: [
    {
      heading: 'The cards',
      items: [
        'Five cards are dealt from sixteen: two to each player and one spare beside the board. Every card is face up all game — there is nothing hidden here.',
        'Each card shows a grid: your piece in the middle, and a pip on every square it may move to. The pattern is drawn from your own side of the board, so it always means the same thing in your hand.',
        'The spare card decides who opens, and it is turned towards whoever is about to take it.',
      ],
    },
    {
      heading: 'Your turn',
      items: [
        'Tap one of your two cards, tap one of your pieces, then tap where it should go.',
        'A piece may land on an empty square or take an enemy piece. It can never land on one of your own, and it never jumps to a square the card does not show.',
        'Then the card you played goes to the side and you take the spare into your hand — so every card you use is handed to your opponent two turns later.',
      ],
    },
    {
      heading: 'Winning',
      items: [
        'The Way of the Stone: take the enemy Master.',
        'The Way of the Stream: land your own Master on the square the enemy Master started on — the arch marked in their colour.',
        'Students are only ever in the way. Reaching the far arch with one does nothing.',
      ],
    },
    {
      heading: 'When you cannot move',
      items: [
        'If neither card offers you a single legal move, you must still hand one over: tap a card and it goes to the side without a move being made.',
      ],
    },
  ],
};
