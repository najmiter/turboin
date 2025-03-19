import { Command } from '@/types/search';
import { createCalendar } from './calendar';

export function getAvailableCommands(hideSearchUI: () => void): Command[] {
  return [
    {
      name: 'calendar',
      description: 'Opens a calendar',
      execute: () => {
        createCalendar();
        hideSearchUI();
      },
    },
  ];
}

export function isCommand(query: string): boolean {
  return query.startsWith('!');
}

export function getCommandName(query: string): string {
  return query.substring(1).trim().toLowerCase();
}

export function findCommand(
  query: string,
  commands: Command[]
): Command | undefined {
  if (!isCommand(query)) return undefined;

  const commandName = getCommandName(query);
  return commands.find((cmd) => cmd.name === commandName);
}

export function findMatchingCommands(
  query: string,
  commands: Command[]
): Command[] {
  if (!isCommand(query)) return [];

  const partialName = getCommandName(query).toLowerCase();

  if (partialName === '') {
    return commands;
  }

  return commands.filter(
    (cmd) =>
      cmd.name.toLowerCase().startsWith(partialName) ||
      cmd.name.toLowerCase().includes(partialName)
  );
}
