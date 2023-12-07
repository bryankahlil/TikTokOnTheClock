let timerInterval;

// Set initial state to on when the extension is installed
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.set({ extensionEnabled: true, checkTikTokPage: true });
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  const tabId = activeInfo.tabId.toString();
  console.log(tabId);
  chrome.tabs.get(activeInfo.tabId, (tab) => {
      const isTikTokPage = isTikTokUrl(tab.url);
      console.log("Is TikTok Page:", isTikTokPage);

      if (isTikTokPage) {
        showNotification("TikTok Detected", "You are now on TikTok!");
        startTimer();
      } else {
        stopTimer();
      }
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading') {
    const isTikTokPage = isTikTokUrl(tab.url);
    console.log("Is TikTok Page:", isTikTokPage);

    if (isTikTokPage) {
      showNotification("TikTok Detected", "You are now on TikTok!");
      startTimer();
    } else {
      stopTimer();
    }
  }
});

// Handle the toggle button click from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.toggleExtension) {
        // Toggle the extension state
        chrome.storage.sync.get('extensionEnabled', ({ extensionEnabled }) => {
            const newEnabledState = !extensionEnabled;
            
            chrome.storage.sync.set({ extensionEnabled: newEnabledState }, () => {
                // Inform content scripts about the new state and request TikTok check
                chrome.tabs.query({}, (tabs) => {
                    tabs.forEach((tab) => {
                        chrome.tabs.sendMessage(tab.id, { extensionEnabled: newEnabledState, checkTikTokPage: true });
                    });
                });
            });
        });
    }
});

// Example: Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.someMessage) {
        // Handle the message from content scripts
        // Perform any necessary background processing
    }
});

function startTimer(tabId) {
  // Check if the timer is already active
  if (!timerInterval) {
    timerInterval = setInterval(() => {
      // Format the timer value as desired (e.g., in minutes and seconds)
      const formattedTime = formatTimer(timer);
      
      // Update the badge text with the formatted time
      chrome.action.setBadgeText({ text: formattedTime });
      
      // Exit if 5 minutes has passed
      exitApp(formattedTime, timer)

      // Increment the timer
      timer++;
    }, 1000); // Update every second
  }
}

function stopTimer() {
  // Clear the timerInterval if it's active
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = undefined;
  }
}

function exitApp(formattedTime, timer) {
  const minutes = parseInt(formattedTime.split(":")[0]);

  // Check if minutes is equal to 5
  if (minutes / 5 === 1) {
    // Perform actions to exit the app
    // Get the current active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      
      // Check if the active tab exists
      if (activeTab) {
        // Close the active tab
        chrome.tabs.remove(activeTab.id, () => {
          console.log("Closed the active tab");
          resetTimer()
        });
      }
    });
    console.log("Exiting the app");
    resetTimer()
    // Add your logic here for exiting the app
  } else {
    // Do nothing if minutes is not divisible by 5
    console.log("Not exiting the app");
  }
}

function resetTimer() {
  timer = 0;
  formattedTime = formatTimer(timer);
  chrome.action.setBadgeText({ text: formattedTime });
  console.log("Timer reset");
}

function updateExtensionAndTikTokStatus(isEnabled, isTikTokPage) {
  const extensionStatus = document.getElementById("extensionStatus");
  const tiktokTabStatus = document.getElementById("tiktokTabStatus");

  if (isEnabled) {
      extensionStatus.innerText = "ON";
      extensionStatus.style.color = "#00f2ea"; // Aqua
      tiktokTabStatus.style.color = isTikTokPage ? "#00f2ea" : "#fff"; // Aqua if TikTok, White otherwise
      tiktokTabStatus.innerText = isTikTokPage ? "TikTok Tab Status: Currently viewing" : "TikTok Tab Status: Not viewing";
  } else {
      extensionStatus.innerText = "OFF";
      extensionStatus.style.color = "#ccc"; // Grey
      tiktokTabStatus.innerText = "TikTok Tab Status:";
      tiktokTabStatus.style.color = "#ccc"; // Grey
  }
}

function isTikTokUrl(url) {
  return url.toLowerCase().includes("tiktok.com");
}

function showTabNotification(title, message) {
  chrome.notifications.create({
      type: 'basic',
      iconUrl: 'assets/icon.png',  // Replace with the path to your extension's icon
      title: title,
      message: message,
  });
}

function showNotification(title, message) {
  if (Notification.permission === "granted") {
      chrome.notifications.create({
          type: 'basic',
          iconUrl: 'assets/icon.png',
          title: title,
          message: message,
      });
  } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then(permission => {
          if (permission === "granted") {
              chrome.notifications.create({
                  type: 'basic',
                  iconUrl: 'assets/icon.png',
                  title: title,
                  message: message,
              });
          }
      });
  }
}

var History = {};

// Function to update the badge text based on the toggle switch state



// Initialize a timer variable
let timer = 0;

// Function to format the timer value as minutes and seconds
function formatTimer(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
}

function Update(t, tabId, url) {
  if (!url) {
    return;
  }
  if (tabId in History) {
    if (url == History[tabId][0][1]) {
      return;
    }
  } else {
    History[tabId] = [];
  }
  History[tabId].unshift([t, url]);

  var history_limit = parseInt(localStorage["history_size"]);
  if (!history_limit) {
    history_limit = 23;
  }
  while (History[tabId].length > history_limit) {
    History[tabId].pop();
  }

  chrome.action.setPopup({ 'tabId': tabId, 'popup': "popup.html#tabId=" + tabId });
}

function HandleUpdate(tabId, changeInfo, tab) {
  Update(new Date(), tabId, changeInfo.url);
}

function HandleRemove(tabId, removeInfo) {
  delete History[tabId];
}

function HandleReplace(addedTabId, removedTabId) {
  var t = new Date();
  delete History[removedTabId];
  chrome.tabs.get(addedTabId, function (tab) {
    Update(t, addedTabId, tab.url);
  });
}

function FormatDuration(d) {
  if (d < 0) {
    return "?";
  }
  var divisor = d < 3600000 ? [60000, 1000] : [3600000, 60000];
  function pad(x) {
    return x < 10 ? "0" + x : x;
  }
  return Math.floor(d / divisor[0]) + ":" + pad(Math.floor((d % divisor[0]) / divisor[1]));
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.getHistory) {
        const historyToSend = getHistoryForPopup(sender); // Pass sender to the function
        sendResponse({ history: historyToSend });
    }
});

function getHistoryForPopup(sender) { // Receive sender as a parameter
    const tabId = sender.tab.id.toString();
    const tabHistory = History[tabId];

    if (!tabHistory || tabHistory.length === 0) {
        return [];
    }

    const lastVisit = tabHistory[0][0];
    const url = tabHistory[0][1];
    const duration = new Date() - lastVisit;

    return [{
        date: lastVisit,
        url: url,
        duration: duration,
    }];
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.getHistory) {
      const historyToSend = getHistoryForPopup(sender); // Pass sender to the function
      sendResponse({ history: historyToSend });
  }
});

function getHistoryForPopup(sender) { // Receive sender as a parameter
  const tabId = sender.tab.id.toString();
  const tabHistory = History[tabId];

  if (!tabHistory || tabHistory.length === 0) {
      return [];
  }

  const lastVisit = tabHistory[0][0];
  const url = tabHistory[0][1];
  const duration = new Date() - lastVisit;

  return [{
      date: lastVisit,
      url: url,
      duration: duration,
  }];
}



chrome.tabs.onUpdated.addListener(HandleUpdate);
chrome.tabs.onRemoved.addListener(HandleRemove);
chrome.tabs.onReplaced.addListener(HandleReplace);

