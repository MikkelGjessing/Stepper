// Background Service Worker
// Handles extension lifecycle and side panel opening

chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});
