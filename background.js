// background.js

// Listen for messages from the content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'open_dashboard') {
    // Check if a dashboard tab is already open
    const dashboardUrl = chrome.runtime.getURL('dashboard.html');
    
    chrome.tabs.query({ url: dashboardUrl }, (tabs) => {
      if (tabs.length > 0) {
        // If it exists, focus it
        chrome.tabs.update(tabs[0].id, { active: true });
        chrome.windows.update(tabs[0].windowId, { focused: true });
      } else {
        // Otherwise, open a new tab
        chrome.tabs.create({ url: dashboardUrl });
      }
    });
  }
});
