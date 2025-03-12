// Background script for the extension

// Track active tabs
let activeTabs: chrome.tabs.Tab[] = [];

// Listen for commands
chrome.commands.onCommand.addListener((command) => {
  if (command === 'open-search') {
    // Send message to active tab to open the search UI
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'openSearch' });
      }
    });
  }
});

// Keep track of tabs
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    updateTabsList();
  }
});

chrome.tabs.onRemoved.addListener(() => {
  updateTabsList();
});

chrome.tabs.onCreated.addListener(() => {
  updateTabsList();
});

// Function to update the list of active tabs
function updateTabsList() {
  chrome.tabs.query({}, (tabs) => {
    activeTabs = tabs;
  });
}

// Initialize tabs list
updateTabsList();

// Listen for search requests from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'search') {
    const query = request.query.toLowerCase();

    // Search tabs
    const matchingTabs = activeTabs.filter(
      (tab) =>
        tab.title?.toLowerCase().includes(query) ||
        tab.url?.toLowerCase().includes(query)
    );

    // Search bookmarks
    chrome.bookmarks.search(query, (bookmarks) => {
      // Search history (last 30 days)
      chrome.history.search(
        {
          text: query,
          maxResults: 30, // Limit results
          startTime: Date.now() - 30 * 24 * 60 * 60 * 1000, // Last 30 days
        },
        (historyItems) => {
          sendResponse({
            tabs: matchingTabs,
            bookmarks: bookmarks,
            history: historyItems,
          });
        }
      );
    });

    return true; // Required for async sendResponse
  }

  if (request.action === 'switchToTab') {
    chrome.tabs.update(request.tabId, { active: true });
    chrome.windows.update(request.windowId, { focused: true });
  }

  if (
    request.action === 'openBookmark' ||
    request.action === 'openHistoryItem'
  ) {
    chrome.tabs.create({ url: request.url });
  }
});
