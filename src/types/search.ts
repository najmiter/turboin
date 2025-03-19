export interface SearchResult {
  type: 'tab' | 'bookmark' | 'history' | 'header' | 'no-results';
  title: string;
  url?: string;
  tabId?: number;
  windowId?: number;
  relevance: number;
  element?: HTMLDivElement;
  visitCount?: number;
  lastVisitTime?: number;
  favIconUrl?: string;
}

export interface Command {
  name: string;
  description: string;
  execute: () => void;
}
