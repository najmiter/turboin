export function setupHeartbeat() {
  setInterval(() => {
    chrome.storage.local.set({ heartbeat: Date.now() });
  }, 25000);
}
