# Face to Face

A web-based collection of table games for 2–4 people sharing one screen —
designed for a tablet or laptop lying flat on the table between players.

**Games:** Checkers and Reversi (playable now) · Chess, Mancala, Nine Men's
Morris, Ultimate Tic-Tac-Toe, Dots & Boxes, Yacht Dice, and Boggle (planned)

## Features

- **Checkers** with full American rules: multi-jumps, kings, optional
  forced-capture rule, undo, and win detection.
- **Reversi** with full rules: flip animations, legal-move hints, automatic
  passes when a player has no move, undo, and score tracking.
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

- `src/games/<game>/engine.ts` — pure rules engine (no UI), one per game.
- `src/games/<game>/<Game>Game.tsx` — the game's UI: board and player panels.
- `src/components/GameShell.tsx` — shared frame: control rail, seating
  layouts (including rotating the far player's panel), confirm dialogs.
- `src/settings.ts` — shared settings (theme, piece style, seating, rules).
- `src/styles.css` — all themes and piece styles as CSS custom properties.

New games follow the same pattern: a pure engine module plus a game component
wrapped in `GameShell`, registered in the lists at the top of `src/App.tsx`.
