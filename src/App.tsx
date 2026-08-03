import { useEffect, useState } from 'react';
import { SettingsModal } from './components/SettingsModal';
import { COMING_SOON, GAMES, type GameId } from './games/registry';
import { loadSettings, saveSettings, type Settings } from './settings';

type Screen = 'home' | GameId;

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => saveSettings(settings), [settings]);

  const active = GAMES.find((g) => g.id === screen);

  return (
    <div className="app" data-theme={settings.theme} data-pieces={settings.pieceStyle}>
      {active ? (
        <active.Component
          settings={settings}
          settingsOpen={settingsOpen}
          onExit={() => setScreen('home')}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      ) : (
        <Home
          onPlay={(game) => setScreen(game)}
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
        {GAMES.map((g) => (
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
