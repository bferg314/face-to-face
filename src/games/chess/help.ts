import type { GameHelp } from '../../components/HelpModal';

export const chessHelp: GameHelp = {
  title: 'Chess',
  objective:
    'Trap the other player’s king so that it is attacked and cannot escape — checkmate.',
  sections: [
    {
      heading: 'Moving',
      items: [
        'Tap one of your pieces to pick it up; its legal squares are marked. Tap one to move there, or tap the piece again to put it down.',
        'The king steps one square in any direction. The queen slides any distance in any direction, the rook along ranks and files, the bishop along diagonals.',
        'The knight jumps in an L — two squares one way and one the other — and is the only piece that can leap over others.',
        'Pawns march forward one square, or two from their starting row, but capture diagonally. They can never move backwards.',
        'The board turns to face whoever is to move, so the player thinking always reads both armies the right way up.',
      ],
    },
    {
      heading: 'Special moves',
      items: [
        'Castling: if neither your king nor that rook has moved and the squares between them are empty, the king steps two towards the rook and the rook hops over to its far side. You cannot castle out of check, through an attacked square, or into one.',
        'En passant: a pawn that has just used its two-square opening move can be taken by an enemy pawn beside it, exactly as if it had only moved one square. The chance lasts for one turn only.',
        'Promotion: a pawn reaching the far end of the board becomes a queen, rook, bishop or knight — your choice, and you may already have one.',
      ],
    },
    {
      heading: 'Check & checkmate',
      items: [
        'When your king is attacked you are in check, and the king is marked. You must answer it: move the king, block the attack, or capture the attacker.',
        'You may never make a move that leaves your own king in check, so a piece shielding it cannot step out of the way.',
        'Check that cannot be answered is checkmate, and the game is over.',
      ],
    },
    {
      heading: 'Winning',
      items: [
        'Checkmate wins.',
        'If the player to move has no legal move but is not in check, the game is a stalemate — a draw, not a win.',
        'The game is also drawn if the same position comes up three times, if fifty moves pass with no capture and no pawn moved, or if neither side has enough material left to force mate.',
      ],
    },
  ],
};
