import { Settings, DEFAULT_SETTINGS } from '../types/settings';

const shortcutInput = document.getElementById('shortcut') as HTMLInputElement;
const saveButton = document.getElementById('save') as HTMLButtonElement;
const resetButton = document.getElementById('reset') as HTMLButtonElement;
const successMessage = document.getElementById(
  'successMessage'
) as HTMLDivElement;

async function initializeSettings() {
  const storage = await chrome.storage.sync.get('settings');
  const settings: Settings = storage.settings || DEFAULT_SETTINGS;

  shortcutInput.value = settings.shortcut;
}

shortcutInput.addEventListener('click', () => {
  shortcutInput.value = 'Press a key combination...';
});

shortcutInput.addEventListener('keydown', (e) => {
  e.preventDefault();

  const modifiers: string[] = [];
  if (e.ctrlKey) modifiers.push('Ctrl');
  if (e.shiftKey) modifiers.push('Shift');
  if (e.altKey) modifiers.push('Alt');
  if (e.metaKey)
    modifiers.push(navigator.platform.includes('Mac') ? 'Command' : 'Meta');

  if (modifiers.length === 0 && e.key === 'Tab') {
    return;
  }

  let key = e.key;

  if (['Control', 'Shift', 'Alt', 'Meta'].includes(key)) {
    return;
  }

  if (key === ' ') key = 'Space';
  else if (key === 'ArrowUp') key = 'Up';
  else if (key === 'ArrowDown') key = 'Down';
  else if (key === 'ArrowLeft') key = 'Left';
  else if (key === 'ArrowRight') key = 'Right';
  else if (key.length === 1) key = key.toUpperCase();

  const shortcut = [...modifiers, key].join('+');
  shortcutInput.value = shortcut;
});

saveButton.addEventListener('click', async () => {
  if (
    !shortcutInput.value ||
    shortcutInput.value === 'Press a key combination...'
  ) {
    alert('Please set a keyboard shortcut first');
    return;
  }

  const settings: Settings = {
    shortcut: shortcutInput.value,
  };

  await chrome.storage.sync.set({ settings });

  successMessage.classList.add('visible');
  setTimeout(() => {
    successMessage.classList.remove('visible');
  }, 2000);

  chrome.runtime.sendMessage({ action: 'settingsUpdated' });
});

resetButton.addEventListener('click', async () => {
  shortcutInput.value = DEFAULT_SETTINGS.shortcut;
});

document.addEventListener('DOMContentLoaded', initializeSettings);
