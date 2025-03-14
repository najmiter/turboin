import { Settings } from '@/types/settings';

export const DEFAULT_SETTINGS: Settings = {
  shortcut: navigator.userAgent.includes('Mac')
    ? 'Command+Shift+K'
    : 'Ctrl+Shift+K',
};
