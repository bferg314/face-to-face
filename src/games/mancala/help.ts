import type { GameHelp } from '../../components/HelpModal';

export const mancalaHelp: GameHelp = {
  title: 'Mancala',
  objective:
    'Collect more seeds in your store — the large pit on your right — than your opponent.',
  sections: [
    {
      heading: 'Sowing',
      items: [
        'The six small pits nearest you are yours, and each starts with four seeds.',
        'Tap one of your pits to pick up all of its seeds and sow them one at a time, counterclockwise, into the pits that follow.',
        'Seeds drop into your own store as they pass it, but always skip your opponent’s store.',
      ],
    },
    {
      heading: 'Extra turns',
      items: [
        'If your last seed lands in your own store, you take another turn.',
      ],
    },
    {
      heading: 'Capturing',
      items: [
        'If your last seed lands in an empty pit on your side, you capture that seed plus all seeds in the opponent’s pit directly across — they all go to your store.',
      ],
    },
    {
      heading: 'Winning',
      items: [
        'The game ends when either side’s six pits are all empty. Each player then sweeps the seeds left on their own side into their store.',
        'The player with more seeds in their store wins; equal counts are a draw.',
      ],
    },
  ],
};
