// Function to send a message to the content script
function sendMessageToContentScript(tabId, message) {
    chrome.tabs.sendMessage(tabId, message);
}

// Example: Request TikTok page check when extension is enabled
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const { extensionEnabled, checkTikTokPage } = request;

    if (extensionEnabled && checkTikTokPage) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const activeTab = tabs[0];
            const tabId = activeTab.id;

            // Inform the content script to check for TikTok page
            sendMessageToContentScript(tabId, { checkTikTokPage: true });
        });
    }
});
