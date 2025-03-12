// Content script to inject the search UI

let searchContainer: HTMLDivElement | null = null;
let selectedResultIndex: number = 0;
let resultItems: HTMLDivElement[] = [];
let searchInput: HTMLInputElement | null = null;

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'openSearch') {
    openSearchUI();
  }
});

function openSearchUI() {
  // Prevent creating multiple search UIs
  if (searchContainer) {
    searchInput?.focus();
    searchContainer.style.display = 'flex';
    return;
  }

  // Create search UI container
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

  // Create search modal
  const modal = document.createElement('div');
  modal.style.cssText = `
    width: 600px;
    max-width: 90%;
    background-color: #2d3748;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    overflow: hidden;
  `;

  // Create search input
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

  // Create results container
  const resultsContainer = document.createElement('div');
  resultsContainer.style.cssText = `
    max-height: 400px;
    overflow-y: auto;
    padding: 8px 0;
  `;

  // Append elements
  modal.appendChild(searchInput);
  modal.appendChild(resultsContainer);
  searchContainer.appendChild(modal);
  document.body.appendChild(searchContainer);

  // Focus the search input
  searchInput.focus();

  // Reset selection state
  selectedResultIndex = 0;
  resultItems = [];

  // Add event listeners
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

  // document.removeEventListener('keydown', handleKeyDown);
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
    // Trigger click on the selected item
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

  // Exact match in title is most relevant
  if (normalizedTitle === normalizedQuery) {
    score += 100;
  }
  // Title starts with query
  else if (normalizedTitle.startsWith(normalizedQuery)) {
    score += 80;
  }
  // Title contains query as a whole word
  else if (normalizedTitle.includes(` ${normalizedQuery} `)) {
    score += 70;
  }
  // Title contains query
  else if (normalizedTitle.includes(normalizedQuery)) {
    score += 60;
  }

  // URL exact match
  if (normalizedUrl === normalizedQuery) {
    score += 50;
  }
  // URL starts with query
  else if (normalizedUrl.startsWith(normalizedQuery)) {
    score += 40;
  }
  // URL contains query
  else if (normalizedUrl.includes(normalizedQuery)) {
    score += 30;
  }

  // Bonus points for shorter titles (more specific matches)
  score += Math.max(0, 20 - title.length / 2);

  return score;
}

function selectNextResult() {
  if (resultItems.length === 0) return;

  // Deselect current
  updateResultSelection(selectedResultIndex, false);

  // Select next (with wrap-around)
  selectedResultIndex = (selectedResultIndex + 1) % resultItems.length;
  updateResultSelection(selectedResultIndex, true);

  // Ensure the selected item is visible
  ensureResultVisible(resultItems[selectedResultIndex]);
}

function selectPreviousResult() {
  if (resultItems.length === 0) return;

  // Deselect current
  updateResultSelection(selectedResultIndex, false);

  // Select previous (with wrap-around)
  selectedResultIndex =
    (selectedResultIndex - 1 + resultItems.length) % resultItems.length;
  updateResultSelection(selectedResultIndex, true);

  // Ensure the selected item is visible
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

    // Process and sort all results by relevance
    const searchResults: SearchResult[] = [];

    // Process tabs with relevance score
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

      // Tabs get a base priority boost to always appear before bookmarks
      tabResults.forEach((result: any) => (result.relevance += 2000));

      searchResults.push(...tabResults);
    }

    // Process bookmarks with relevance score
    if (results.bookmarks.length > 0) {
      const bookmarkResults = results.bookmarks
        .filter((bookmark: any) => bookmark.url) // Only include bookmarks with URLs
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

      // Bookmarks get a moderate priority boost to appear after tabs but before history
      bookmarkResults.forEach((result: any) => (result.relevance += 1000));

      searchResults.push(...bookmarkResults);
    }

    // Process history items with relevance score
    if (results.history && results.history.length > 0) {
      const historyResults = results.history
        .filter((historyItem: any) => historyItem.url) // Only include items with URLs
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

      // History gets no priority boost, making it appear last

      searchResults.push(...historyResults);
    }

    // Sort all results by relevance (highest first)
    searchResults.sort((a, b) => b.relevance - a.relevance);

    // Separate results by type for display
    const tabResults = searchResults.filter((result) => result.type === 'tab');
    const bookmarkResults = searchResults.filter(
      (result) => result.type === 'bookmark'
    );
    const historyResults = searchResults.filter(
      (result) => result.type === 'history'
    );

    // Flag to track if we need to reselect first item after rendering
    let needsSelection =
      resultItems.length === 0 &&
      (tabResults.length > 0 ||
        bookmarkResults.length > 0 ||
        historyResults.length > 0);

    // Display tabs section if available
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

      // Add tab results
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

        // If tab has a favicon, set it directly
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

    // Display bookmarks section if available
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

      // Add bookmark results
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

    // Display history section if available
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

      // Add history results
      historyResults.forEach((result) => {
        if (result.url) {
          // Format the last visit date
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

    // No results
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
      // Force selection of first item and ensure the mouse events don't override it
      setTimeout(() => {
        // Reset selection to first item
        if (selectedResultIndex !== 0) {
          updateResultSelection(selectedResultIndex, false);
        }
        selectedResultIndex = 0;
        updateResultSelection(0, true);

        // Ensure it's visible
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

  // Add styling based on type
  if (type === 'history') {
    item.style.opacity = '0.8'; // Make history items slightly faded
  }

  // Modify the mouseover event to be less aggressive
  let hoverTimeout: number;
  item.addEventListener('mouseover', () => {
    // Use a small timeout to prevent accidental selection during initial render
    clearTimeout(hoverTimeout);
    hoverTimeout = setTimeout(() => {
      // Only change selection if we're already done with initial rendering
      if (document.hasFocus()) {
        const index = resultItems.indexOf(item);
        if (index !== -1) {
          // Deselect current
          updateResultSelection(selectedResultIndex, false);
          // Select this one
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

  // Add favicon
  const faviconElement = document.createElement('img');
  faviconElement.style.cssText = `
    position: absolute;
    left: 12px;
    top: 14px;
    width: 16px;
    height: 16px;
    border-radius: 2px;
  `;

  // Set a fallback icon based on type
  let fallbackIcon = '';
  if (type === 'tab') fallbackIcon = '📄';
  else if (type === 'bookmark') fallbackIcon = '🔖';
  else fallbackIcon = '🕒';

  try {
    // Try to get favicon URL
    const faviconUrl = getFaviconUrl(url, type);
    faviconElement.src = faviconUrl;

    // Handle favicon load errors
    faviconElement.onerror = () => {
      // Replace with emoji as fallback
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
    // If we can't even set the src, use the emoji fallback
    faviconElement.textContent = fallbackIcon;
  }

  item.appendChild(faviconElement);
  item.appendChild(titleElement);
  item.appendChild(urlElement);

  return item;
}

/**
 * Get favicon URL for a given website URL
 */
function getFaviconUrl(
  url: string,
  type: 'tab' | 'bookmark' | 'history'
): string {
  try {
    // Extract the domain from the URL
    const urlObj = new URL(url);
    const domain = urlObj.hostname;

    // Use Google's favicon service
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch (e) {
    // If URL parsing fails, return a default icon
    return '';
  }
}
