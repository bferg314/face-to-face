# Face to Face

A web-based collection of table games for 2–4 people sharing one screen —
designed for a tablet or laptop lying flat on the table between players.

**Games:** Checkers, Reversi, Mancala, Ultimate Tic-Tac-Toe, Dots & Boxes,
Chess, and Nine Men's Morris (playable now) · Quoridor, Chinese Checkers,
Onitama, Connect Four, and Yacht Dice (planned)

## Features

- **Checkers** with full American rules: multi-jumps, kings, optional
  forced-capture rule, undo, and win detection.
- **Reversi** with full rules: flip animations, legal-move hints, automatic
  passes when a player has no move, undo, and score tracking.
- **Mancala** (Kalah rules): extra turns, captures, end-of-game sweep, and a
  sowing animation that ripples along the pits.
- **Ultimate Tic-Tac-Toe** — nine small boards in a big grid, where the square
  you play decides which board your opponent plays in next. Free moves when
  you're sent to a board that's already finished, closed boards once won, and
  a draw when every board is decided with no line.
- **Dots & Boxes** for 2–4 players — complete a box to claim it and move
  again, with chains, double-box lines, and a choice of 4×4, 6×6, or 8×8
  boards.
- **Chess** with full rules: castling, en passant, promotion to any piece,
  check and checkmate, and every draw — stalemate, threefold repetition, the
  fifty-move rule, and insufficient material. The board turns to face whoever
  is to move, so the player thinking reads both armies the right way up.
- **Nine Men's Morris** with full rules: place nine men each, slide them along
  the lines, and close a mill to take one of your opponent's — sparing the men
  standing in mills of their own, unless every one of them is. Won by cutting
  the other side to two men or leaving them nowhere to go, drawn by repetition
  or fifty quiet moves, with the flying rule for the last three men optional.
- **Seating that faces the players.** Every panel is turned to read right way
  up from its own chair:
  - *2 players* choose between **across the table** (the far panel rotated
    180°) and **side by side** (both panels facing the same way).
  - *3–4 players* sit around the board — bottom, left, top, and right, so play
    passes around the table rather than across it. On a phone the ring
    collapses to a stack and the side panels give up their rotation.
- **Style customization** — four board themes (Walnut, Tournament, Midnight,
  Porcelain) and three piece styles (Classic, Flat, Glass), persisted in the
  browser.

## Development

```sh
npm install
npm run dev      # http://localhost:5173
npm test         # engine unit tests (Vitest)
npm run test:e2e # browser tests (Playwright)
```

## Docker

Every released version is published to the GitHub Container Registry as
`ghcr.io/bferg314/face-to-face`, for `linux/amd64` and `linux/arm64`. The
compose file in this repo runs it:

```sh
docker compose up -d
# open http://localhost:8080
```

`latest` follows the newest release. Pin a version with `TAG`:

```sh
TAG=0.5.0 docker compose up -d
```

The package is public, so none of this needs a login.

To build from a checkout instead of pulling — which is what you want when
working on the app:

```sh
docker compose -f docker-compose.build.yml up --build -d
```

## Releases

Versions are `0.<games>`: **0.5** is the seven games that are playable today,
each new game adds `.1`, and the collection reaches **1.0** when everything on
the planned list is in.

Pushing a `v*` tag runs `.github/workflows/release.yml`, which runs the engine
tests and then builds and pushes the image:

```sh
git tag v0.6.0 && git push origin v0.6.0
```

That publishes `0.6.0`, `0.6`, `v0.6.0` and `latest`.

## Project layout

- `src/games/registry.tsx` — the one list of games, playable and planned.
- `src/games/<game>/engine.ts` — pure rules engine (no UI), one per game.
- `src/games/<game>/engine.test.ts` — unit tests for that engine.
- `src/games/<game>/<Game>Game.tsx` — the game's UI: board and player panels.
- `src/games/<game>/help.ts` — the game's "How to play" content.
- `src/components/GameShell.tsx` — shared frame: control rail, seating
  layouts (it takes one panel per player and picks each seat), confirm dialogs.
- `src/components/PlayerPanel.tsx` — shared player panel; games supply their
  own status wording.
- `src/hooks/useGameHistory.ts` — the state and undo stack every game shares.
- `src/settings.ts` — shared settings (theme, piece style, seating, rules).
- `src/styles.css` — all themes and piece styles as CSS custom properties.

New games follow the same pattern: a pure engine module plus a game component
wrapped in `GameShell`, added as one entry to the `GAMES` array in
`src/games/registry.tsx` (and removed from `COMING_SOON` there). `App.tsx`
looks games up from that list and needs no edit.
