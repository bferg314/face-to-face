import { useEffect, useState, type ReactNode } from 'react';
import { CheckersGame } from './games/checkers/CheckersGame';
import { ReversiGame } from './games/reversi/ReversiGame';
import { SettingsModal } from './components/SettingsModal';
import { loadSettings, saveSettings, type Settings } from './settings';

type GameId = 'checkers' | 'reversi';
type Screen = 'home' | GameId;

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => saveSettings(settings), [settings]);

  return (
    <div className="app" data-theme={settings.theme} data-pieces={settings.pieceStyle}>
      {screen === 'home' && (
        <Home
          onPlay={(game) => setScreen(game)}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      )}
      {screen === 'checkers' && (
        <CheckersGame
          settings={settings}
          onExit={() => setScreen('home')}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      )}
      {screen === 'reversi' && (
        <ReversiGame
          settings={settings}
          onExit={() => setScreen('home')}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      )}
      {settingsOpen && (
        <SettingsModal
          settings={settings}
          onChange={setSettings}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}

const PLAYABLE: Array<{
  id: GameId;
  title: string;
  meta: string;
  thumb: ReactNode;
}> = [
  {
    id: 'checkers',
    title: 'Checkers',
    meta: '2 players',
    thumb: (
      <>
        <span className="mini big p1" />
        <span className="mini big p2" />
      </>
    ),
  },
  {
    id: 'reversi',
    title: 'Reversi',
    meta: '2 players',
    thumb: (
      <>
        <span className="mini big disc-dark" />
        <span className="mini big disc-light" />
      </>
    ),
  },
];

const COMING_SOON: Array<{
  id: string;
  title: string;
  meta: string;
  glyph: string;
  glyphClass?: string;
}> = [
  { id: 'chess', title: 'Chess', meta: '2 players', glyph: '♞' },
  { id: 'mancala', title: 'Mancala', meta: '2 players', glyph: '🌰' },
  { id: 'morris', title: 'Nine Men’s Morris', meta: '2 players', glyph: '▣' },
  { id: 'ultimate-ttt', title: 'Ultimate Tic-Tac-Toe', meta: '2 players', glyph: '✕○' },
  { id: 'dots-boxes', title: 'Dots & Boxes', meta: '2–4 players', glyph: '∷' },
  { id: 'yacht', title: 'Yacht Dice', meta: '2–4 players', glyph: '⚄⚁' },
  { id: 'boggle', title: 'Boggle', meta: '2–4 players', glyph: 'B', glyphClass: 'tile' },
];

function Home({
  onPlay,
  onOpenSettings,
}: {
  onPlay: (game: GameId) => void;
  onOpenSettings: () => void;
}) {
  return (
    <div className="home">
      <button
        className="icon-btn corner"
        onClick={onOpenSettings}
        title="Settings"
        aria-label="Settings"
      >
        ⚙
      </button>
      <h1>Face to Face</h1>
      <p className="tagline">Table games for 2–4 players on one screen</p>
      <div className="game-cards">
        {PLAYABLE.map((g) => (
          <button
            key={g.id}
            className="game-card playable"
            onClick={() => onPlay(g.id)}
          >
            <span className="thumb">{g.thumb}</span>
            <h3>{g.title}</h3>
            <span className="meta">{g.meta}</span>
            <span className="play">Play</span>
          </button>
        ))}
        {COMING_SOON.map((g) => (
          <div key={g.id} className="game-card disabled">
            <span className={`thumb glyph ${g.glyphClass ?? ''}`}>{g.glyph}</span>
            <h3>{g.title}</h3>
            <span className="meta">{g.meta}</span>
            <span className="soon">Coming soon</span>
          </div>
        ))}
      </div>
    </div>
  );
}
