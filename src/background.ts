let activeTabs: chrome.tabs.Tab[] = [];
let customShortcut = '';

async function loadSettings() {
  const storage = await chrome.storage.sync.get('turboin_settings');
  if (storage.turboin_settings?.shortcut) {
    customShortcut = storage.turboin_settings.shortcut;
  }
}

loadSettings();

chrome.runtime.onMessage.addListener((request) => {
  if (request.action === 'settingsUpdated') {
    loadSettings();
  }
});

chrome.commands.onCommand.addListener((command) => {
  if (command === 'open-search') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'openSearch' });
      }
    });
  }
});

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'keyboardMonitor') {
    port.onMessage.addListener((msg) => {
      if (msg.type === 'keydown' && msg.shortcut === customShortcut) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]?.id) {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'openSearch' });
          }
        });
      }
    });
  }
});

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

function updateTabsList() {
  chrome.tabs.query({}, (tabs) => {
    activeTabs = tabs;
  });
}

updateTabsList();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'search') {
    const query = request.query.toLowerCase();

    const matchingTabs = activeTabs.filter(
      (tab) =>
        tab.title?.toLowerCase().includes(query) ||
        tab.url?.toLowerCase().includes(query)
    );

    chrome.bookmarks.search(query, (bookmarks) => {
      chrome.history.search(
        {
          text: query,
          maxResults: 30,
          startTime: Date.now() - 30 * 24 * 60 * 60 * 1000,
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

    return true;
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
