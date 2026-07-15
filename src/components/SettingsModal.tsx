import type { CSSProperties } from 'react';
import type { PieceStyle, Settings, ThemeId, ViewMode } from '../settings';

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

const p1Vars = { '--pc': 'var(--p1)', '--pe': 'var(--p1-edge)' } as CSSProperties;

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
          <span className="group-title">Rules &amp; help</span>
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
          <label className="switch-row">
            <span>
              Move hints
              <span className="desc">Highlight pieces that can move</span>
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
      </div>
    </div>
  );
}
