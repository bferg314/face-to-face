import { describe, expect, it } from 'vitest';
import {
  applyMove,
  insufficientMaterial,
  idx,
  legalMoves,
  newGame,
  type Cell,
  type ChessState,
  type PieceType,
  type PlayerId,
  type PromotionType,
} from './engine';

/** Square index from its chess name: 'a1' is the bottom-left, index 56. */
const sq = (name: string) => idx(8 - Number(name[1]), name.charCodeAt(0) - 97);

/**
 * A position from Forsyth-Edwards notation, which is how every published perft
 * figure is written down. Lives here rather than in the engine: nothing in the
 * app parses FEN, and the engines in this app carry no API they don't use.
 *
 * FEN ranks run 8 → 1 and the engine's rows run top → bottom, so they line up
 * directly. Uppercase is White, which is Player 1.
 */
function fromFen(fen: string): ChessState {
  const [placement, side, rights, ep, halfmove] = fen.split(' ');
  const board: Cell[] = Array(64).fill(null);
  let id = 0;
  placement.split('/').forEach((rank, row) => {
    let col = 0;
    for (const ch of rank) {
      if (ch >= '1' && ch <= '8') {
        col += Number(ch);
        continue;
      }
      board[idx(row, col)] = {
        id: id++,
        player: ch === ch.toUpperCase() ? 1 : 2,
        type: ch.toLowerCase() as PieceType,
      };
      col++;
    }
  });

  return {
    board,
    turn: side === 'w' ? 1 : 2,
    winner: null,
    ending: null,
    enPassant: ep && ep !== '-' ? sq(ep) : null,
    castling: {
      1: { king: rights.includes('K'), queen: rights.includes('Q') },
      2: { king: rights.includes('k'), queen: rights.includes('q') },
    },
    halfmove: halfmove ? Number(halfmove) : 0,
    seen: {},
    capturedBy: { 1: [], 2: [] },
    lastMove: null,
  };
}

/**
 * Play one move written as UCI ('e2e4', 'a7a8q'), asserting it is legal first.
 *
 * `applyMove` trusts its caller (the UI gates on `legalMoves`), so tests that
 * mean to describe real play have to check legality themselves — otherwise
 * they can assert about positions no game could reach.
 */
function move(state: ChessState, uci: string): ChessState {
  const from = sq(uci.slice(0, 2));
  const to = sq(uci.slice(2, 4));
  const promote = (uci.slice(4) || undefined) as PromotionType | undefined;
  const found = legalMoves(state).find(
    (m) => m.from === from && m.to === to && m.promote === promote,
  );
  expect(found, `${uci} must be legal`).toBeDefined();
  return applyMove(state, found!);
}

const play = (state: ChessState, ...ucis: string[]) => ucis.reduce(move, state);

/** Whether `uci` is among the legal moves, without playing it. */
const canPlay = (state: ChessState, uci: string) =>
  legalMoves(state).some(
    (m) =>
      m.from === sq(uci.slice(0, 2)) &&
      m.to === sq(uci.slice(2, 4)) &&
      m.promote === ((uci.slice(4) || undefined) as PromotionType | undefined),
  );

const pieceAt = (state: ChessState, name: string) => state.board[sq(name)];

function perft(state: ChessState, depth: number): number {
  const moves = legalMoves(state);
  if (depth === 1) return moves.length;
  let nodes = 0;
  for (const m of moves) nodes += perft(applyMove(state, m), depth - 1);
  return nodes;
}

describe('newGame', () => {
  it('sets both armies up with Player 1 at the bottom, to move first', () => {
    const s = newGame();
    expect(s.board.filter(Boolean)).toHaveLength(32);
    expect(s.turn).toBe(1);
    expect(s.winner).toBeNull();
    expect(s.enPassant).toBeNull();
    expect(s.halfmove).toBe(0);

    expect(pieceAt(s, 'e1')).toMatchObject({ player: 1, type: 'k' });
    expect(pieceAt(s, 'd1')).toMatchObject({ player: 1, type: 'q' });
    expect(pieceAt(s, 'a1')).toMatchObject({ player: 1, type: 'r' });
    expect(pieceAt(s, 'e2')).toMatchObject({ player: 1, type: 'p' });
    expect(pieceAt(s, 'e8')).toMatchObject({ player: 2, type: 'k' });
    expect(pieceAt(s, 'd8')).toMatchObject({ player: 2, type: 'q' });
    expect(pieceAt(s, 'e7')).toMatchObject({ player: 2, type: 'p' });
    expect(pieceAt(s, 'e4')).toBeNull();
  });

  it('gives every piece a distinct id, and keeps it across a move', () => {
    const s = newGame();
    const ids = s.board.filter(Boolean).map((p) => p!.id);
    expect(new Set(ids).size).toBe(32);

    const knight = pieceAt(s, 'g1')!.id;
    expect(pieceAt(play(s, 'g1f3'), 'f3')!.id).toBe(knight);
  });
});

/**
 * Move-generation counts for known positions. These are the tests that matter
 * most: between them they walk millions of positions and will catch nearly any
 * rule slip, which no reasonable number of hand-written cases would.
 *
 * The two beyond the opening are the standard ones because the opening
 * position reaches neither castling nor en passant within these depths.
 */
describe('perft', () => {
  const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -';
  const KIWIPETE =
    'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq -';
  const ENDGAME = '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - -';

  it.each([
    ['opening', START, 1, 20],
    ['opening', START, 2, 400],
    ['opening', START, 3, 8902],
    ['kiwipete', KIWIPETE, 1, 48],
    ['kiwipete', KIWIPETE, 2, 2039],
    ['kiwipete', KIWIPETE, 3, 97862],
    ['endgame', ENDGAME, 1, 14],
    ['endgame', ENDGAME, 2, 191],
    ['endgame', ENDGAME, 3, 2812],
  ])('%s, depth %i', (_name, fen, depth, expected) => {
    expect(perft(fromFen(fen), depth as number)).toBe(expected);
  });

  // Its own case because it is the one that costs anything: ~200k positions,
  // a few hundred ms here, with the timeout raised for slower machines.
  it(
    'opening, depth 4',
    () => {
      expect(perft(fromFen(START), 4)).toBe(197281);
    },
    30_000,
  );

  it('counts the opening from newGame the same as from its FEN', () => {
    expect(perft(newGame(), 3)).toBe(8902);
  });
});

describe('castling', () => {
  const OPEN = 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq -';

  it('moves the rook alongside the king, keeping its id', () => {
    const s = fromFen(OPEN);
    const rook = pieceAt(s, 'h1')!.id;
    const after = play(s, 'e1g1');

    expect(pieceAt(after, 'g1')).toMatchObject({ player: 1, type: 'k' });
    expect(pieceAt(after, 'f1')).toMatchObject({ player: 1, type: 'r', id: rook });
    expect(pieceAt(after, 'e1')).toBeNull();
    expect(pieceAt(after, 'h1')).toBeNull();
  });

  it('puts the king on c1 and the rook on d1 queenside', () => {
    const after = play(fromFen(OPEN), 'e1c1');
    expect(pieceAt(after, 'c1')).toMatchObject({ type: 'k' });
    expect(pieceAt(after, 'd1')).toMatchObject({ type: 'r' });
    expect(pieceAt(after, 'a1')).toBeNull();
  });

  it('ends both rights once the king has castled', () => {
    const after = play(fromFen(OPEN), 'e1g1');
    expect(after.castling[1]).toEqual({ king: false, queen: false });
    // The other player's rights are untouched.
    expect(after.castling[2]).toEqual({ king: true, queen: true });
  });

  it('ends one side once that rook has moved, and both once the king has', () => {
    expect(play(fromFen(OPEN), 'h1g1').castling[1]).toEqual({
      king: false,
      queen: true,
    });
    expect(play(fromFen(OPEN), 'a1b1').castling[1]).toEqual({
      king: true,
      queen: false,
    });
    expect(play(fromFen(OPEN), 'e1f1').castling[1]).toEqual({
      king: false,
      queen: false,
    });
  });

  it('ends the right when the rook is captured on its own square', () => {
    const s = fromFen('r3k2r/8/8/8/8/8/8/R3K2R b KQkq -');
    const after = play(s, 'a8a1');
    expect(after.castling[1]).toEqual({ king: true, queen: false });
  });

  it('refuses to castle across an attacked square', () => {
    // The black rook on f8 covers f1, which the king would cross kingside.
    const s = fromFen('r4rk1/8/8/8/8/8/8/R3K2R w KQ -');
    expect(canPlay(s, 'e1g1')).toBe(false);
    expect(canPlay(s, 'e1c1')).toBe(true);
  });

  it('refuses to castle out of check, or into it', () => {
    expect(canPlay(fromFen('4rk2/8/8/8/8/8/8/R3K2R w KQ -'), 'e1g1')).toBe(false);
    expect(canPlay(fromFen('4rk2/8/8/8/8/8/8/R3K2R w KQ -'), 'e1c1')).toBe(false);
    // A rook on g8 covers the kingside destination but nothing else.
    const intoCheck = fromFen('r5k1/8/8/8/8/8/8/R3K1R1 w Q -');
    expect(canPlay(intoCheck, 'e1c1')).toBe(true);
  });

  it('refuses to castle through an occupied square', () => {
    expect(canPlay(fromFen('r3k2r/8/8/8/8/8/8/R3KB1R w KQ -'), 'e1g1')).toBe(false);
    expect(canPlay(fromFen('r3k2r/8/8/8/8/8/8/RN2K2R w KQ -'), 'e1c1')).toBe(false);
    // b1 alone still blocks queenside, even though the king never crosses it.
    expect(canPlay(fromFen('r3k2r/8/8/8/8/8/8/R3K2R w KQ -'), 'e1c1')).toBe(true);
  });
});

describe('en passant', () => {
  it('takes a pawn that is not on the square the capturer lands on', () => {
    // 1. e4 a6 2. e5 d5, and now the d-pawn can be taken in passing.
    const s = play(newGame(), 'e2e4', 'a7a6', 'e4e5', 'd7d5');
    expect(s.enPassant).toBe(sq('d6'));

    const after = play(s, 'e5d6');
    expect(pieceAt(after, 'd6')).toMatchObject({ player: 1, type: 'p' });
    expect(pieceAt(after, 'd5')).toBeNull();
    expect(pieceAt(after, 'e5')).toBeNull();
    expect(after.capturedBy[1]).toHaveLength(1);
    expect(after.capturedBy[1][0]).toMatchObject({ player: 2, type: 'p' });
  });

  it('is offered for one move only', () => {
    const s = play(newGame(), 'e2e4', 'a7a6', 'e4e5', 'd7d5');
    const later = play(s, 'g1f3', 'a6a5');
    expect(later.enPassant).toBeNull();
    expect(canPlay(later, 'e5d6')).toBe(false);
  });

  it('is illegal when it would expose the mover’s own king', () => {
    // White king e5, black rook h5: taking with the d-pawn empties the rank
    // between them, so d5xe6 e.p. is pinned out of existence.
    const s = fromFen('4k3/8/8/3pK2r/8/8/8/7R b - -');
    const afterDouble = play(s, 'e8d8');
    expect(afterDouble.enPassant).toBeNull();

    const pinned = fromFen('8/8/8/2pPK2r/8/8/8/4k3 w - c6');
    expect(canPlay(pinned, 'd5c6')).toBe(false);
  });
});

describe('promotion', () => {
  const PAWN_ON_SEVENTH = '4k3/P7/8/8/8/8/8/4K3 w - -';

  it('offers all four pieces on the same square', () => {
    const s = fromFen(PAWN_ON_SEVENTH);
    const promotions = legalMoves(s).filter((m) => m.to === sq('a8'));
    expect(promotions).toHaveLength(4);
    expect(promotions.map((m) => m.promote).sort()).toEqual(['b', 'n', 'q', 'r']);
  });

  it('changes the piece’s type but keeps its id, so the UI animates it', () => {
    const s = fromFen(PAWN_ON_SEVENTH);
    const pawn = pieceAt(s, 'a7')!.id;
    const after = play(s, 'a7a8n');
    expect(pieceAt(after, 'a8')).toMatchObject({ player: 1, type: 'n', id: pawn });
    expect(pieceAt(after, 'a7')).toBeNull();
  });

  it('promotes on a capture into the corner too', () => {
    const s = fromFen('1r2k3/P7/8/8/8/8/8/4K3 w - -');
    const after = play(s, 'a7b8q');
    expect(pieceAt(after, 'b8')).toMatchObject({ player: 1, type: 'q' });
    expect(after.capturedBy[1][0]).toMatchObject({ type: 'r' });
  });
});

describe('endings', () => {
  it('calls checkmate for the player who delivered it', () => {
    // Scholar's mate.
    const s = play(
      newGame(),
      'e2e4',
      'e7e5',
      'f1c4',
      'b8c6',
      'd1h5',
      'g8f6',
      'h5f7',
    );
    expect(s.winner).toBe(1);
    expect(s.ending).toBe('checkmate');
    expect(legalMoves(s)).toEqual([]);
  });

  it('calls checkmate against Player 1 as readily', () => {
    // Fool's mate.
    const s = play(newGame(), 'f2f3', 'e7e5', 'g2g4', 'd8h4');
    expect(s.winner).toBe(2);
    expect(s.ending).toBe('checkmate');
  });

  it('calls stalemate a draw', () => {
    const s = play(fromFen('7k/8/5QK1/8/8/8/8/8 w - -'), 'f6f7');
    expect(s.winner).toBe('draw');
    expect(s.ending).toBe('stalemate');
    expect(legalMoves(s)).toEqual([]);
  });

  it('draws on the hundredth quiet ply', () => {
    const s = play(fromFen('4k3/8/8/8/8/8/8/R3K2R w KQ - 99'), 'a1a2');
    expect(s.halfmove).toBe(100);
    expect(s.winner).toBe('draw');
    expect(s.ending).toBe('fifty-move');
  });

  it('resets the fifty-move count on a pawn move or a capture', () => {
    const quiet = play(fromFen('4k3/8/8/8/8/8/8/R3K2R w KQ - 40'), 'a1a2');
    expect(quiet.halfmove).toBe(41);

    const pawn = play(fromFen('4k3/8/8/8/8/8/P7/4K3 w - - 40'), 'a2a4');
    expect(pawn.halfmove).toBe(0);

    const capture = play(fromFen('4k3/8/8/8/8/8/6b1/4K2R w - - 40'), 'h1h8');
    expect(capture.halfmove).toBe(41); // rook took nothing on h8
    const real = play(fromFen('4k3/8/8/8/8/8/6b1/4K2R w - - 40'), 'h1h2');
    expect(real.halfmove).toBe(40 + 1);
  });

  it('draws on the third time a position is reached', () => {
    // Knights out and back, twice over — the opening position is the first
    // sighting, so the eighth ply is the third.
    const s = play(
      newGame(),
      'g1f3',
      'g8f6',
      'f3g1',
      'f6g8',
      'g1f3',
      'g8f6',
      'f3g1',
    );
    expect(s.winner).toBeNull();

    const drawn = play(s, 'f6g8');
    expect(drawn.winner).toBe('draw');
    expect(drawn.ending).toBe('repetition');
  });

  it('draws once neither side can force mate', () => {
    // White's bishop takes black's last piece, leaving king and bishop.
    const s = play(fromFen('4k3/8/8/8/8/8/6b1/4K2B w - -'), 'h1g2');
    expect(s.winner).toBe('draw');
    expect(s.ending).toBe('material');
  });

  it('prefers checkmate to any draw claim', () => {
    // Mate arrives on the hundredth quiet ply; it is a win, not a draw.
    const s = play(fromFen('6k1/8/8/8/8/8/6Q1/4K1R1 w - - 99'), 'g2g7');
    expect(s.halfmove).toBe(100);
    expect(s.winner).toBe(1);
    expect(s.ending).toBe('checkmate');
  });
});

describe('insufficientMaterial', () => {
  const material = (fen: string) => insufficientMaterial(fromFen(`${fen} w - -`).board);

  it('is true for bare kings and for a lone minor piece', () => {
    expect(material('4k3/8/8/8/8/8/8/4K3')).toBe(true);
    expect(material('4k3/8/8/8/8/8/8/3BK3')).toBe(true);
    expect(material('4k3/8/8/8/8/8/8/3NK3')).toBe(true);
    expect(material('3bk3/8/8/8/8/8/8/4K3')).toBe(true);
  });

  it('is true for two bishops on one colour of square', () => {
    // c1 and f8 are both dark.
    expect(material('5bk1/8/8/8/8/8/8/2B1K3')).toBe(true);
    // c1 is dark, c8 is light.
    expect(material('2b1k3/8/8/8/8/8/8/2B1K3')).toBe(false);
  });

  it('is false whenever mate can still be forced', () => {
    expect(material('4k3/8/8/8/8/8/P7/4K3')).toBe(false);
    expect(material('4k3/8/8/8/8/8/8/R3K3')).toBe(false);
    expect(material('4k3/8/8/8/8/8/8/3QK3')).toBe(false);
    // Two knights: mate is possible, just not forcible, so FIDE leaves this
    // one to the fifty-move rule.
    expect(material('4k3/8/8/8/8/8/8/2NNK3')).toBe(false);
  });
});

describe('check', () => {
  it('allows only the moves that answer it', () => {
    // 1. e4 e5 2. Bc4 Nc6 3. Qh5, and Black must deal with the threat on f7.
    const s = play(newGame(), 'e2e4', 'e7e5', 'f1c4', 'b8c6', 'd1h5', 'g7g6');
    // White's queen is now attacked by the g-pawn but not pinned: taking it is
    // legal, and so is retreating.
    expect(canPlay(s, 'h5e5')).toBe(true);

    const checked = play(s, 'h5e5');
    expect(legalMoves(checked).length).toBeGreaterThan(0);
    // Every reply must leave Black's king off the firing line.
    for (const m of legalMoves(checked)) {
      const after = applyMove(checked, m);
      expect(after.winner === 2).toBe(false);
    }
  });

  it('never lets a pinned piece abandon its king', () => {
    // The bishop on e2 is pinned to e1 by the rook on e8.
    const s = fromFen('4r2k/8/8/8/8/8/4B3/4K3 w - -');
    expect(canPlay(s, 'e2d3')).toBe(false);
    expect(canPlay(s, 'e2b5')).toBe(false);
    // Along the pin is fine.
    expect(canPlay(s, 'e1d1')).toBe(true);
  });
});

describe('applyMove', () => {
  it('does not mutate the state it was given', () => {
    const s = newGame();
    const before = JSON.stringify(s);
    play(s, 'e2e4');
    expect(JSON.stringify(s)).toBe(before);
  });

  it('records the last move and hands the turn over', () => {
    const s = play(newGame(), 'e2e4');
    expect(s.turn).toBe(2);
    expect(s.lastMove).toMatchObject({ from: sq('e2'), to: sq('e4'), captured: null });
  });

  it('keeps each player’s captures in their own tray', () => {
    const s = play(newGame(), 'e2e4', 'd7d5', 'e4d5', 'd8d5');
    expect(s.capturedBy[1].map((p: { type: PieceType }) => p.type)).toEqual(['p']);
    expect(s.capturedBy[2].map((p: { type: PieceType }) => p.type)).toEqual(['p']);
    expect(s.capturedBy[1][0].player).toBe(2 as PlayerId);
  });
});
