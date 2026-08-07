import type { CSSProperties, ReactNode } from 'react';
import type {
  CcPlayers,
  YachtPlayers,
  DotsBoxesPlayers,
  DotsBoxesSize,
  PieceStyle,
  QuoridorPlayers,
  Settings,
  ThemeId,
  ViewMode,
} from '../settings';

const THEMES: Array<{ id: ThemeId; label: string }> = [
  { id: 'walnut', label: 'Walnut' },
  { id: 'tournament', label: 'Tournament' },
  { id: 'midnight', label: 'Midnight' },
  { id: 'porcelain', label: 'Porcelain' },
];

const PIECE_STYLES: Array<{ id: PieceStyle; label: string }> = [
  { id: 'classic', label: 'Classic' },
  { id: 'flat', label: 'Flat' },
  { id: 'glass', label: 'Glass' },
];

const VIEWS: Array<{ id: ViewMode; label: string; hint: string }> = [
  { id: 'across', label: 'Across the table', hint: 'Screen lies flat between you' },
  { id: 'side-by-side', label: 'Side by side', hint: 'Both players on one side' },
];

const DB_SIZES: Array<{ id: DotsBoxesSize; label: string; hint: string }> = [
  { id: 4, label: '4 × 4', hint: 'Quick' },
  { id: 6, label: '6 × 6', hint: 'Standard' },
  { id: 8, label: '8 × 8', hint: 'Long game' },
];

const DB_PLAYERS: Array<{ id: DotsBoxesPlayers; label: string }> = [
  { id: 2, label: '2' },
  { id: 3, label: '3' },
  { id: 4, label: '4' },
];

const QD_PLAYERS: Array<{ id: QuoridorPlayers; label: string; hint: string }> = [
  { id: 2, label: '2', hint: 'Ten walls each' },
  { id: 4, label: '4', hint: 'Five walls each' },
];

const CC_PLAYERS: Array<{ id: CcPlayers; label: string; hint: string }> = [
  { id: 2, label: '2', hint: 'Facing points' },
  { id: 3, label: '3', hint: 'Every other point' },
  { id: 4, label: '4', hint: 'Two facing pairs' },
];

const YD_PLAYERS: Array<{ id: YachtPlayers; label: string }> = [
  { id: 2, label: '2' },
  { id: 3, label: '3' },
  { id: 4, label: '4' },
];

const p1Vars = { '--pc': 'var(--p1)', '--pe': 'var(--p1-edge)' } as CSSProperties;

/**
 * A band of settings under one heading. Anything that changes a single game is
 * fenced off under that game's name (`game`), so it reads at a glance which
 * controls reach the whole app and which only touch the board you're on.
 *
 * Game names are spelled out here rather than pulled from the registry: adding
 * a game-specific setting always means editing this file anyway, and the
 * registry entry carries no settings of its own to read.
 */
function Section({
  title,
  game = false,
  children,
}: {
  title: string;
  game?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={`settings-section${game ? ' for-game' : ''}`}>
      <h3 className="section-title">{title}</h3>
      {children}
    </section>
  );
}

export function SettingsModal({
  settings,
  onChange,
  onClose,
}: {
  settings: Settings;
  onChange: (s: Settings) => void;
  onClose: () => void;
}) {
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    onChange({ ...settings, [key]: value });

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Settings</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <Section title="All games">
          <div className="setting-group">
            <span className="group-title">Seating</span>
            <div className="opt-row">
              {VIEWS.map((v) => (
                <button
                  key={v.id}
                  className={`opt ${settings.viewMode === v.id ? 'selected' : ''}`}
                  onClick={() => set('viewMode', v.id)}
                >
                  <span>
                    {v.label}
                    <small>{v.hint}</small>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="setting-group">
            <span className="group-title">Board theme</span>
            <div className="opt-row">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  className={`opt ${settings.theme === t.id ? 'selected' : ''}`}
                  onClick={() => set('theme', t.id)}
                >
                  <span className="theme-swatch" data-theme={t.id} />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="setting-group">
            <span className="group-title">Piece style</span>
            <div className="opt-row">
              {PIECE_STYLES.map((p) => (
                <button
                  key={p.id}
                  className={`opt ${settings.pieceStyle === p.id ? 'selected' : ''}`}
                  onClick={() => set('pieceStyle', p.id)}
                >
                  <span className="piece-preview" data-pieces={p.id}>
                    <span className="checker" style={p1Vars} />
                  </span>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="setting-group">
            <label className="switch-row">
              <span>
                Move hints
                <span className="desc">Point out the moves worth looking at</span>
              </span>
              <span className="switch">
                <input
                  type="checkbox"
                  checked={settings.showHints}
                  onChange={(e) => set('showHints', e.target.checked)}
                />
                <span className="knob" />
              </span>
            </label>
          </div>
        </Section>

        <Section title="Checkers" game>
          <div className="setting-group">
            <label className="switch-row">
              <span>
                Forced captures
                <span className="desc">Standard rule: if you can jump, you must</span>
              </span>
              <span className="switch">
                <input
                  type="checkbox"
                  checked={settings.forcedCapture}
                  onChange={(e) => set('forcedCapture', e.target.checked)}
                />
                <span className="knob" />
              </span>
            </label>
          </div>
        </Section>

        <Section title="Yacht Dice" game>
          <div className="setting-group">
            <span className="group-title">Players</span>
            <div className="opt-row">
              {YD_PLAYERS.map((p) => (
                <button
                  key={p.id}
                  className={`opt ${settings.yachtPlayers === p.id ? 'selected' : ''}`}
                  onClick={() => set('yachtPlayers', p.id)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </Section>

        <Section title="Chinese Checkers" game>
          <div className="setting-group">
            <span className="group-title">Players</span>
            <div className="opt-row">
              {CC_PLAYERS.map((p) => (
                <button
                  key={p.id}
                  className={`opt ${settings.ccPlayers === p.id ? 'selected' : ''}`}
                  onClick={() => set('ccPlayers', p.id)}
                >
                  <span>
                    {p.label}
                    <small>{p.hint}</small>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </Section>

        <Section title="Quoridor" game>
          <div className="setting-group">
            <span className="group-title">Players</span>
            <div className="opt-row">
              {QD_PLAYERS.map((p) => (
                <button
                  key={p.id}
                  className={`opt ${settings.quoridorPlayers === p.id ? 'selected' : ''}`}
                  onClick={() => set('quoridorPlayers', p.id)}
                >
                  <span>
                    {p.label}
                    <small>{p.hint}</small>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </Section>

        <Section title="Nine Men’s Morris" game>
          <div className="setting-group">
            <label className="switch-row">
              <span>
                Flying
                <span className="desc">
                  Down to three men, move anywhere on the board
                </span>
              </span>
              <span className="switch">
                <input
                  type="checkbox"
                  checked={settings.morrisFlying}
                  onChange={(e) => set('morrisFlying', e.target.checked)}
                />
                <span className="knob" />
              </span>
            </label>
          </div>
        </Section>

        <Section title="Dots & Boxes" game>
          <div className="setting-group">
            <span className="group-title">Players</span>
            <div className="opt-row">
              {DB_PLAYERS.map((p) => (
                <button
                  key={p.id}
                  className={`opt ${settings.dotsBoxesPlayers === p.id ? 'selected' : ''}`}
                  onClick={() => set('dotsBoxesPlayers', p.id)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="setting-group">
            <span className="group-title">Board size</span>
            <div className="opt-row">
              {DB_SIZES.map((s) => (
                <button
                  key={s.id}
                  className={`opt ${settings.dotsBoxesSize === s.id ? 'selected' : ''}`}
                  onClick={() => set('dotsBoxesSize', s.id)}
                >
                  <span>
                    {s.label}
                    <small>{s.hint}</small>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}
