let searchContainer: HTMLDivElement | null = null;
let selectedResultIndex: number = 0;
let resultItems: HTMLDivElement[] = [];
let searchInput: HTMLInputElement | null = null;

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'openSearch') {
    openSearchUI();
  }
});

function openSearchUI() {
  if (searchContainer) {
    searchInput?.focus();
    searchContainer.style.display = 'flex';
    return;
  }

  searchContainer = document.createElement('div');
  searchContainer.id = 'quicktab-search-container';
  searchContainer.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.7);
    z-index: 2147483647;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding-top: 10%;
  `;

  const modal = document.createElement('div');
  modal.style.cssText = `
    width: 600px;
    max-width: 90%;
    background-color: #2d3748;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    overflow: hidden;
  `;

  searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = 'Search tabs and bookmarks...';
  searchInput.style.cssText = `
    width: 100%;
    padding: 16px;
    border: none;
    outline: none;
    font-size: 16px;
    background-color: #374151;
    color: white;
  `;

  const resultsContainer = document.createElement('div');
  resultsContainer.style.cssText = `
    max-height: 400px;
    overflow-y: auto;
    padding: 8px 0;
  `;

  modal.appendChild(searchInput);
  modal.appendChild(resultsContainer);
  searchContainer.appendChild(modal);
  document.body.appendChild(searchContainer);

  searchInput.focus();

  selectedResultIndex = 0;
  resultItems = [];

  searchInput.addEventListener('input', () => {
    const query = searchInput?.value.trim()!;
    if (query.length > 0) {
      performSearch(query, resultsContainer);
    } else {
      resultsContainer.innerHTML = '';
      resultItems = [];
      selectedResultIndex = 0;
    }
  });

  searchContainer.addEventListener('click', (e) => {
    if (e.target === searchContainer) {
      hideSearchUI();
    }
  });

  document.addEventListener('keydown', handleKeyDown);
}

function hideSearchUI() {
  if (searchContainer) {
    searchContainer.style.display = 'none';
  }
}

function handleKeyDown(e: KeyboardEvent) {
  console.log(e.key);
  if (e.key === 'Escape') {
    hideSearchUI();
    return;
  }

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    selectNextResult();
  }

  if (e.key === 'ArrowUp') {
    e.preventDefault();
    selectPreviousResult();
  }

  if (e.key === 'Enter' && resultItems.length > 0) {
    e.preventDefault();

    resultItems[selectedResultIndex].click();
  }
}

function calculateRelevanceScore(
  query: string,
  title: string,
  url: string
): number {
  const normalizedQuery = query.toLowerCase();
  const normalizedTitle = title.toLowerCase();
  const normalizedUrl = url.toLowerCase();

  let score = 0;

  if (normalizedTitle === normalizedQuery) {
    score += 100;
  } else if (normalizedTitle.startsWith(normalizedQuery)) {
    score += 80;
  } else if (normalizedTitle.includes(` ${normalizedQuery} `)) {
    score += 70;
  } else if (normalizedTitle.includes(normalizedQuery)) {
    score += 60;
  }

  if (normalizedUrl === normalizedQuery) {
    score += 50;
  } else if (normalizedUrl.startsWith(normalizedQuery)) {
    score += 40;
  } else if (normalizedUrl.includes(normalizedQuery)) {
    score += 30;
  }

  score += Math.max(0, 20 - title.length / 2);

  return score;
}

function selectNextResult() {
  if (resultItems.length === 0) return;

  updateResultSelection(selectedResultIndex, false);

  selectedResultIndex = (selectedResultIndex + 1) % resultItems.length;
  updateResultSelection(selectedResultIndex, true);

  ensureResultVisible(resultItems[selectedResultIndex]);
}

function selectPreviousResult() {
  if (resultItems.length === 0) return;

  updateResultSelection(selectedResultIndex, false);

  selectedResultIndex =
    (selectedResultIndex - 1 + resultItems.length) % resultItems.length;
  updateResultSelection(selectedResultIndex, true);

  ensureResultVisible(resultItems[selectedResultIndex]);
}

function updateResultSelection(index: number, selected: boolean) {
  const item = resultItems[index];
  if (!item) return;

  if (selected) {
    item.style.backgroundColor = '#4a5568';
    item.style.borderLeftColor = '#3182ce';
  } else {
    item.style.backgroundColor = 'transparent';
    item.style.borderLeftColor = 'transparent';
  }
}

function ensureResultVisible(element: HTMLElement) {
  if (!element || !searchContainer) return;

  const resultsContainer = searchContainer.querySelector(
    'div > div:last-child'
  );
  if (!resultsContainer) return;

  const containerRect = resultsContainer.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();

  if (elementRect.bottom > containerRect.bottom) {
    resultsContainer.scrollTop += elementRect.bottom - containerRect.bottom;
  } else if (elementRect.top < containerRect.top) {
    resultsContainer.scrollTop -= containerRect.top - elementRect.top;
  }
}

interface SearchResult {
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

function performSearch(query: string, resultsContainer: HTMLDivElement) {
  chrome.runtime.sendMessage({ action: 'search', query }, (results) => {
    resultsContainer.innerHTML = '';
    resultItems = [];
    selectedResultIndex = 0;

    const searchResults: SearchResult[] = [];

    if (results.tabs.length > 0) {
      const tabResults = results.tabs.map((tab: any) => ({
        type: 'tab' as const,
        title: tab.title || tab.url,
        url: tab.url,
        tabId: tab.id,
        windowId: tab.windowId,
        favIconUrl: tab.favIconUrl,
        relevance: calculateRelevanceScore(
          query,
          tab.title || '',
          tab.url || ''
        ),
      }));

      tabResults.forEach((result: any) => (result.relevance += 2000));

      searchResults.push(...tabResults);
    }

    if (results.bookmarks.length > 0) {
      const bookmarkResults = results.bookmarks
        .filter((bookmark: any) => bookmark.url)
        .map((bookmark: any) => ({
          type: 'bookmark' as const,
          title: bookmark.title || bookmark.url,
          url: bookmark.url,
          relevance: calculateRelevanceScore(
            query,
            bookmark.title || '',
            bookmark.url
          ),
        }));

      bookmarkResults.forEach((result: any) => (result.relevance += 1000));

      searchResults.push(...bookmarkResults);
    }

    if (results.history && results.history.length > 0) {
      const historyResults = results.history
        .filter((historyItem: any) => historyItem.url)
        .map((historyItem: any) => ({
          type: 'history' as const,
          title: historyItem.title || historyItem.url,
          url: historyItem.url,
          visitCount: historyItem.visitCount,
          lastVisitTime: historyItem.lastVisitTime,
          relevance: calculateRelevanceScore(
            query,
            historyItem.title || '',
            historyItem.url
          ),
        }));

      searchResults.push(...historyResults);
    }

    searchResults.sort((a, b) => b.relevance - a.relevance);

    const tabResults = searchResults.filter((result) => result.type === 'tab');
    const bookmarkResults = searchResults.filter(
      (result) => result.type === 'bookmark'
    );
    const historyResults = searchResults.filter(
      (result) => result.type === 'history'
    );

    let needsSelection =
      resultItems.length === 0 &&
      (tabResults.length > 0 ||
        bookmarkResults.length > 0 ||
        historyResults.length > 0);

    if (tabResults.length > 0) {
      const tabsHeader = document.createElement('div');
      tabsHeader.textContent = 'Tabs';
      tabsHeader.style.cssText = `
          padding: 8px 16px;
          font-size: 12px;
          font-weight: bold;
          color: #a0aec0;
          text-transform: uppercase;
        `;
      resultsContainer.appendChild(tabsHeader);

      tabResults.forEach((result) => {
        const tabItem = createResultItem(
          result.title,
          result.url || '',
          'tab',
          () => {
            chrome.runtime.sendMessage({
              action: 'switchToTab',
              tabId: result.tabId,
              windowId: result.windowId,
            });
            hideSearchUI();
          }
        );

        if (result.favIconUrl) {
          const faviconImg = tabItem.querySelector('img');
          if (faviconImg) {
            faviconImg.src = result.favIconUrl;
          }
        }

        resultsContainer.appendChild(tabItem);
        resultItems.push(tabItem);
        result.element = tabItem;
      });
    }

    if (bookmarkResults.length > 0) {
      const bookmarksHeader = document.createElement('div');
      bookmarksHeader.textContent = 'Bookmarks';
      bookmarksHeader.style.cssText = `
          padding: 8px 16px;
          font-size: 12px;
          font-weight: bold;
          color: #a0aec0;
          text-transform: uppercase;
          margin-top: ${tabResults.length > 0 ? '16px' : '0'};
        `;
      resultsContainer.appendChild(bookmarksHeader);

      bookmarkResults.forEach((result) => {
        if (result.url) {
          const bookmarkItem = createResultItem(
            result.title,
            result.url,
            'bookmark',
            () => {
              chrome.runtime.sendMessage({
                action: 'openBookmark',
                url: result.url,
              });
              hideSearchUI();
            }
          );
          resultsContainer.appendChild(bookmarkItem);
          resultItems.push(bookmarkItem);
          result.element = bookmarkItem;
        }
      });
    }

    if (historyResults.length > 0) {
      const historyHeader = document.createElement('div');
      historyHeader.textContent = 'History';
      historyHeader.style.cssText = `
          padding: 8px 16px;
          font-size: 12px;
          font-weight: bold;
          color: #a0aec0;
          text-transform: uppercase;
          margin-top: ${tabResults.length > 0 || bookmarkResults.length > 0 ? '16px' : '0'};
        `;
      resultsContainer.appendChild(historyHeader);

      historyResults.forEach((result) => {
        if (result.url) {
          const visitDate = new Date(result.lastVisitTime || 0);
          const formattedDate = visitDate.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });

          const historyItem = createResultItem(
            result.title,
            `${result.url} - Visited ${formattedDate}`,
            'history',
            () => {
              chrome.runtime.sendMessage({
                action: 'openHistoryItem',
                url: result.url,
              });
              hideSearchUI();
            }
          );
          resultsContainer.appendChild(historyItem);
          resultItems.push(historyItem);
          result.element = historyItem;
        }
      });
    }

    if (resultItems.length === 0) {
      const noResults = document.createElement('div');
      noResults.textContent = 'No results found';
      noResults.style.cssText = `
          padding: 16px;
          color: #a0aec0;
          text-align: center;
        `;
      resultsContainer.appendChild(noResults);
    } else {
      setTimeout(() => {
        if (selectedResultIndex !== 0) {
          updateResultSelection(selectedResultIndex, false);
        }
        selectedResultIndex = 0;
        updateResultSelection(0, true);

        if (resultItems[0]) {
          ensureResultVisible(resultItems[0]);
        }
      }, 10);
    }
  });
}

function createResultItem(
  title: string,
  url: string,
  type: 'tab' | 'bookmark' | 'history',
  onClick: () => void
): HTMLDivElement {
  const item = document.createElement('div');
  item.style.cssText = `
    padding: 12px 16px;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 4px;
    border-left: 3px solid transparent;
    transition: background-color 0.2s;
    position: relative;
    padding-left: 36px;  /* Increased to accommodate favicon */
  `;

  if (type === 'history') {
    item.style.opacity = '0.8';
  }

  let hoverTimeout: number;
  item.addEventListener('mouseover', () => {
    clearTimeout(hoverTimeout);
    hoverTimeout = setTimeout(() => {
      if (document.hasFocus()) {
        const index = resultItems.indexOf(item);
        if (index !== -1) {
          updateResultSelection(selectedResultIndex, false);

          selectedResultIndex = index;
          updateResultSelection(selectedResultIndex, true);
        }
      }
    }, 50) as unknown as number;
  });

  item.addEventListener('mouseout', () => {
    clearTimeout(hoverTimeout);
  });

  item.addEventListener('click', onClick);

  const titleElement = document.createElement('div');
  titleElement.textContent = title;
  titleElement.style.cssText = `
    color: white;
    font-size: 14px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `;

  const urlElement = document.createElement('div');
  urlElement.textContent = url;
  urlElement.style.cssText = `
    color: #cbd5e0;
    font-size: 12px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `;

  const faviconElement = document.createElement('img');
  faviconElement.style.cssText = `
    position: absolute;
    left: 12px;
    top: 14px;
    width: 16px;
    height: 16px;
    border-radius: 2px;
  `;

  let fallbackIcon = '';
  if (type === 'tab') fallbackIcon = '📄';
  else if (type === 'bookmark') fallbackIcon = '🔖';
  else fallbackIcon = '🕒';

  try {
    const faviconUrl = getFaviconUrl(url, type);
    faviconElement.src = faviconUrl;

    faviconElement.onerror = () => {
      const fallbackElement = document.createElement('div');
      fallbackElement.textContent = fallbackIcon;
      fallbackElement.style.cssText = `
        position: absolute;
        left: 12px;
        top: 14px;
        font-size: 14px;
      `;
      item.replaceChild(fallbackElement, faviconElement);
    };
  } catch (e) {
    faviconElement.textContent = fallbackIcon;
  }

  item.appendChild(faviconElement);
  item.appendChild(titleElement);
  item.appendChild(urlElement);

  return item;
}

function getFaviconUrl(
  url: string,
  type: 'tab' | 'bookmark' | 'history'
): string {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;

    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch (e) {
    return '';
  }
}
