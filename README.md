# Face to Face

A web-based collection of table games for 2–4 people sharing one screen —
designed for a tablet or laptop lying flat on the table between players.

**Games:** Checkers, Reversi, Mancala, and Ultimate Tic-Tac-Toe (playable now) ·
Chess, Nine Men's Morris, Dots & Boxes, Yacht Dice, and Boggle (planned)

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
- **Two seating layouts** for 2-player games:
  - *Across the table* — the far player's panel is rotated 180° to face them.
  - *Side by side* — both player panels face the same direction.
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

```sh
docker compose up --build -d
# open http://localhost:8080
```

Or without compose:

```sh
docker build -t face-to-face .
docker run -d -p 8080:80 face-to-face
```

## Project layout

- `src/games/registry.tsx` — the one list of games, playable and planned.
- `src/games/<game>/engine.ts` — pure rules engine (no UI), one per game.
- `src/games/<game>/engine.test.ts` — unit tests for that engine.
- `src/games/<game>/<Game>Game.tsx` — the game's UI: board and player panels.
- `src/games/<game>/help.ts` — the game's "How to play" content.
- `src/components/GameShell.tsx` — shared frame: control rail, seating
  layouts (including rotating the far player's panel), confirm dialogs.
- `src/components/PlayerPanel.tsx` — shared player panel; games supply their
  own status wording.
- `src/hooks/useGameHistory.ts` — the state and undo stack every game shares.
- `src/settings.ts` — shared settings (theme, piece style, seating, rules).
- `src/styles.css` — all themes and piece styles as CSS custom properties.

New games follow the same pattern: a pure engine module plus a game component
wrapped in `GameShell`, added as one entry to the `GAMES` array in
`src/games/registry.tsx` (and removed from `COMING_SOON` there). `App.tsx`
looks games up from that list and needs no edit.
