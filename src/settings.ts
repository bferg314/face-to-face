export type ThemeId = 'walnut' | 'tournament' | 'midnight' | 'porcelain';
export type PieceStyle = 'classic' | 'flat' | 'glass';
export type ViewMode = 'across' | 'side-by-side';

export interface Settings {
  theme: ThemeId;
  pieceStyle: PieceStyle;
  viewMode: ViewMode;
  forcedCapture: boolean;
  showHints: boolean;
}

export const defaultSettings: Settings = {
  theme: 'walnut',
  pieceStyle: 'classic',
  viewMode: 'across',
  forcedCapture: true,
  showHints: true,
};

const STORAGE_KEY = 'face-to-face-settings';

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSettings;
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    return defaultSettings;
  }
}

export function saveSettings(settings: Settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage unavailable (private mode etc.) — settings just won't persist.
  }
}
