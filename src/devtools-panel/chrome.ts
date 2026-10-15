// Panel chrome: icons, theme and dock cycles, and the persisted UI state.

export const icon = (paths: string) =>
  '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" ' +
  'stroke="currentColor" stroke-width="2">' +
  paths +
  '</svg>';

export type ThemeMode = 'dark' | 'light' | 'system';

const THEME_KEY = 'litevue-devtools-theme';
const UI_KEY = 'litevue-devtools-ui';

// persisted panel chrome: open state, position (right/bottom offsets) and size
export type Dock = 'float' | 'bottom' | 'right';

export interface UiState {
  open?: boolean;
  right?: number;
  bottom?: number;
  w?: number;
  h?: number;
  /** dock-bottom height and dock-right width, remembered separately */
  bh?: number;
  rw?: number;
  dock?: Dock;
}

export const loadUi = (): UiState => {
  try {
    return JSON.parse(localStorage.getItem(UI_KEY) || '{}');
  } catch {
    return {};
  }
};

export const loadTheme = (): ThemeMode => {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'system') return saved;
  } catch {}
  return 'dark';
};

export const saveTheme = (theme: ThemeMode) => {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {}
};

export const saveUi = (patch: UiState) => {
  try {
    localStorage.setItem(UI_KEY, JSON.stringify({ ...loadUi(), ...patch }));
  } catch {}
};

export const themeIcons: Record<ThemeMode, string> = {
  dark: icon('<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/>'),
  light: icon(
    '<circle cx="12" cy="12" r="5"/>' +
      '<line x1="12" y1="1" x2="12" y2="3"/>' +
      '<line x1="12" y1="21" x2="12" y2="23"/>' +
      '<line x1="4.2" y1="4.2" x2="5.6" y2="5.6"/>' +
      '<line x1="18.4" y1="18.4" x2="19.8" y2="19.8"/>' +
      '<line x1="1" y1="12" x2="3" y2="12"/>' +
      '<line x1="21" y1="12" x2="23" y2="12"/>' +
      '<line x1="4.2" y1="19.8" x2="5.6" y2="18.4"/>' +
      '<line x1="18.4" y1="5.6" x2="19.8" y2="4.2"/>'
  ),
  system: icon(
    '<rect x="2" y="3" width="20" height="14" rx="2"/>' +
      '<line x1="8" y1="21" x2="16" y2="21"/>' +
      '<line x1="12" y1="17" x2="12" y2="21"/>'
  ),
};

/** Dock icons: an outlined viewport with the docked region filled, per browser
 *  devtools convention. Floating shows a detached window. */
export const dockIcons: Record<Dock, string> = {
  float: icon(
    '<rect x="2" y="4" width="14" height="11" rx="1"/>' +
      '<rect x="9" y="10" width="13" height="10" rx="1" fill="currentColor"/>'
  ),
  bottom: icon(
    '<rect x="2" y="3" width="20" height="18" rx="1"/>' +
      '<rect x="2" y="14" width="20" height="7" fill="currentColor"/>'
  ),
  right: icon(
    '<rect x="2" y="3" width="20" height="18" rx="1"/>' +
      '<rect x="14" y="3" width="8" height="18" fill="currentColor"/>'
  ),
};

export const nextDock: Record<Dock, Dock> = {
  float: 'bottom',
  bottom: 'right',
  right: 'float',
};

export const dockTitles: Record<Dock, string> = {
  float: 'floating',
  bottom: 'docked to bottom',
  right: 'docked to right',
};

export const nextTheme: Record<ThemeMode, ThemeMode> = {
  dark: 'light',
  light: 'system',
  system: 'dark',
};

// Bounds for every mode, mirroring min-width / min-height in the stylesheet.
// CSS clamps what is rendered, this clamps what is stored; if they drift, a
// stored value the layout will not honour comes back wrong on the next load.
export const MIN_W = 320;
export const MIN_H = 320;
export const maxW = () => window.innerWidth - 24;
export const maxH = () => window.innerHeight - 24;
export const clamp = (v: number, lo: number, hi: number) =>
  Math.min(Math.max(v, lo), Math.max(lo, hi));
