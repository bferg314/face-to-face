import type { GameHelp } from '../../components/HelpModal';

export const ccHelp: GameHelp = {
  title: 'Chinese Checkers',
  objective:
    'Walk all ten of your marbles across the star into the point opposite the one you started in — the point ringed in your colour.',
  sections: [
    {
      heading: 'Moving',
      items: [
        'Tap one of your marbles, then tap where it should go. Only marbles with somewhere to go can be picked up.',
        'A marble steps into any touching empty hole, in any of the six directions. There is no forward or backward here.',
      ],
    },
    {
      heading: 'Jumping',
      items: [
        'A marble may hop over a single touching marble — yours or anyone else’s — into the empty hole straight beyond it.',
        'Jumps chain: land, hop again, and keep going as far as the board allows, turning corners on the way.',
        'Every hole a chain can reach is offered at once, so you can stop wherever you like rather than tapping out each hop. Nothing is ever captured — the marble you hop stays put.',
      ],
    },
    {
      heading: 'The star',
      items: [
        'Your own point is tinted your colour, and the point you are running for is ringed in it.',
        'Two players face each other. Three take alternating points, so everyone runs at an empty one. Four take two facing pairs, and you run into a point somebody is still moving out of.',
      ],
    },
    {
      heading: 'Winning',
      items: [
        'The first player to fill the far point with all ten of their marbles wins.',
        'Each panel counts how many of that player’s marbles have landed.',
      ],
    },
  ],
};
