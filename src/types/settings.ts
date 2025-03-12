export interface Settings {
  shortcut: string;
}

export const DEFAULT_SETTINGS: Settings = {
  shortcut: navigator.platform.includes('Mac')
    ? 'Command+Shift+K'
    : 'Ctrl+Shift+K',
};
