export type ThemeId = 'walnut' | 'tournament' | 'midnight' | 'porcelain';
export type PieceStyle = 'classic' | 'flat' | 'glass';
export type ViewMode = 'across' | 'side-by-side';
export type DotsBoxesSize = 4 | 6 | 8;
export type DotsBoxesPlayers = 2 | 3 | 4;

export interface Settings {
  theme: ThemeId;
  pieceStyle: PieceStyle;
  viewMode: ViewMode;
  forcedCapture: boolean;
  showHints: boolean;
  /** Dots & Boxes board size, in boxes per side. Applies from the next game. */
  dotsBoxesSize: DotsBoxesSize;
  /** Dots & Boxes player count. Applies from the next game. */
  dotsBoxesPlayers: DotsBoxesPlayers;
  /** Nine Men's Morris: three men left may move to any empty point. */
  morrisFlying: boolean;
}

export const defaultSettings: Settings = {
  theme: 'walnut',
  pieceStyle: 'classic',
  viewMode: 'across',
  forcedCapture: true,
  showHints: true,
  dotsBoxesSize: 6,
  dotsBoxesPlayers: 2,
  morrisFlying: true,
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
