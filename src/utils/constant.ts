import { Settings } from '@/types/settings';

export const DEFAULT_SETTINGS: Settings = {
  shortcut: navigator.userAgent.includes('Mac')
    ? 'Command+Shift+P'
    : 'Ctrl+Shift+P',
};
