import type { ReactNode } from 'react';
import type { PieceType } from './engine';

/**
 * The six pieces, drawn rather than typed.
 *
 * The obvious way to render chess is the Unicode glyphs ♚♛♜♝♞♟, and it was how
 * this screen was first built — but U+265A–265F is in no font this app can
 * count on. A machine with a thin font stack (and a tablet is exactly that)
 * renders the whole board as empty boxes. These paths are the only way the
 * pieces look the same on every screen the app gets carried to.
 *
 * All six share a 24×24 grid, a plinth on the same baseline, and the same
 * heights, so they read as one set. They are filled with the player's colour
 * and outlined in a darker cast of it — see `.cp` in styles.css — which is
 * what keeps a pale army visible on a pale square.
 *
 * Lives in its own file so the game registry can draw a lobby thumbnail
 * without importing the whole game screen, exactly as uttt's Mark does.
 */

/** The plinth every piece stands on. */
const base = <rect x="5.2" y="19.3" width="13.6" height="3.2" rx="1.3" />;

/** The collar between a piece's body and its plinth. */
const collar = <path d="M5.9 16.1h12.2l.5 2.9H5.4z" />;

const PIECES: Record<PieceType, ReactNode> = {
  p: (
    <>
      <circle cx="12" cy="7.4" r="3.1" />
      <path d="M9.3 11h5.4c0 3.3-1.2 5.2-1.5 8.3h-2.4c-.3-3.1-1.5-5-1.5-8.3z" />
      {base}
    </>
  ),
  r: (
    <>
      <path d="M6.5 3.6h2.6v1.9h1.9V3.6h2v1.9h1.9V3.6h2.6v4.7l-1.7 1.5v6.3h-7.6V9.8L6.5 8.3z" />
      {collar}
      {base}
    </>
  ),
  n: (
    <>
      <path d="M8.6 19c0-3.7 1-6.2 3.1-8L7.1 12.4 6.6 9.6c1.6-.4 2.8-1.2 3.6-2.4l1.6-2.6 1.1 2.7 1.3-2.4 1 2.6 1.5-1.7c2 2 2.9 5 2.9 9.1V19z" />
      <circle className="ink" cx="13.3" cy="8.4" r="0.75" />
      {collar}
      {base}
    </>
  ),
  b: (
    <>
      <path d="M12 3c1 0 1.9.8 1.9 1.9 0 .5-.2 1-.6 1.3 2 1.6 3.4 3.8 3.4 5.9 0 2.1-1.5 3.6-3.4 4h-2.6c-1.9-.4-3.4-1.9-3.4-4 0-2.1 1.4-4.3 3.4-5.9-.4-.3-.6-.8-.6-1.3C10.1 3.8 11 3 12 3z" />
      <path className="ink" d="M11.4 7.6h1.2v1.5h1.5v1.2h-1.5v1.5h-1.2v-1.5H9.9V9.1h1.5z" />
      {collar}
      {base}
    </>
  ),
  q: (
    <>
      <path d="M5.3 15.6 4.4 6.6l3.2 4L9.4 4.4l1.6 6.2L12 3.3l1 7.3 1.6-6.2 1.8 6.2 3.2-4-.9 9z" />
      <circle cx="4.4" cy="5.5" r="1.3" />
      <circle cx="9.4" cy="3.4" r="1.2" />
      <circle cx="12" cy="2.4" r="1.4" />
      <circle cx="14.6" cy="3.4" r="1.2" />
      <circle cx="19.6" cy="5.5" r="1.3" />
      {collar}
      {base}
    </>
  ),
  k: (
    <>
      <path d="M11 2.1h2v1.8h1.8v2H13v1.6h-2V5.9H9.2v-2H11z" />
      <path d="M5.8 15.6c-1.3-2.7-.7-5.7 1.6-6.6 2-.8 3.6.5 4.6 2.1 1-1.6 2.6-2.9 4.6-2.1 2.3.9 2.9 3.9 1.6 6.6z" />
      {collar}
      {base}
    </>
  ),
};

export function ChessPiece({
  type,
  className,
}: {
  type: PieceType;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`cp${className ? ` ${className}` : ''}`}
      data-piece={type}
      aria-hidden="true"
    >
      {PIECES[type]}
    </svg>
  );
}
