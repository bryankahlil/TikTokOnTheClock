document.addEventListener("DOMContentLoaded", function () {
    const toggleSwitch = document.getElementById("toggleSwitch");
    const historyContainer = document.getElementById("historyContainer");
    var isEnabled = false;

    chrome.storage.sync.get('extensionEnabled', (data) => {
        toggleSwitch.checked = data.extensionEnabled;
        updateExtensionAndTikTokStatus(data.extensionEnabled);
        
        if (data.extensionEnabled){
            isEnabled = true;
        } else {
            isEnabled = false;
        }
    });


    toggleSwitch.addEventListener("change", function () {
        const newEnabledState = toggleSwitch.checked;

        chrome.storage.sync.set({ extensionEnabled: newEnabledState }, function () {
            chrome.tabs.query({}, (tabs) => {
                tabs.forEach((tab) => {
                    if (tab.id) {
                        chrome.tabs.sendMessage(tab.id, { extensionEnabled: newEnabledState });
                    }
                });
            });

            

            
            updateHistory(); // Update history when the extension state changes
        });
    });

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        // tabs[0] contains information about the active tab
        const activeTab = tabs[0];
        const isTikTokPage = isTikTokUrl(activeTab.url)
        
        chrome.storage.sync.get('extensionEnabled', (data) => {
            const isEnabled = data.extensionEnabled;
            updateExtensionAndTikTokStatus(isEnabled, isTikTokPage);
        });
    });

    chrome.tabs.query((activeInfo) => {
        chrome.tabs.get(activeInfo.tabId, (tab) => {
            const isTikTokPage = isTikTokUrl(tab.url);

            chrome.storage.sync.get('extensionEnabled', (data) => {
                const isEnabled = data.extensionEnabled;
                updateExtensionAndTikTokStatus(isEnabled, isTikTokPage);
            });

        });
    });

    

    var tabId_re = /tabId=([0-9]+)/;
    var match = tabId_re.exec(window.location.hash);
    if (match) {
        var hist = chrome.extension.getBackgroundPage().History[match[1]];
        var table = document.createElement("table");
        for (var i = 0; i < hist.length; i++) {
            var r = table.insertRow(-1);

            var date = "";
            if (i == hist.length - 1 ||
                (hist[i][0].toLocaleDateString() != hist[i + 1][0].toLocaleDateString())) {
                date = hist[i][0].toLocaleDateString();
            }
            r.insertCell(-1).textContent = date;

            r.insertCell(-1).textContent = hist[i][0].toLocaleTimeString();

            var end_time;
            if (i == 0) {
                end_time = new Date();
            } else {
                end_time = hist[i - 1][0];
            }
            r.insertCell(-1).textContent = FormatDuration(end_time - hist[i][0]);

            var a = document.createElement("a");
            a.textContent = hist[i][1];
            a.setAttribute("href", hist[i][1]);
            a.setAttribute("target", "_blank");

            // Create a new cell for the anchor tag and append it to the row
            var cell = r.insertCell(-1);
            cell.appendChild(a);
        }
        document.body.appendChild(table);
    }

    function startTimer() {
        chrome.runtime.sendMessage({ startTimer: true });
        updateBadgeText(true);
    }

    function stopTimer() {
        chrome.runtime.sendMessage({ stopTimer: true });
        updateBadgeText(false);
    }

    function updateBadgeText(isEnabled) {
        const badgeText = isEnabled ? "ON" : "OFF";
        const badgeColor = isEnabled ? [0, 255, 0, 255] : [255, 0, 0, 255];

        chrome.action.setBadgeBackgroundColor({ color: badgeColor });
        chrome.action.setBadgeText({ text: badgeText });
    }
    

    function updateExtensionAndTikTokStatus(isEnabled, isTikTokPage) {
        const extensionStatus = document.getElementById("extensionStatus");
        const tiktokTabStatus = document.getElementById("tiktokTabStatus");
      
        if (isEnabled) {
            extensionStatus.innerText = "ON";
            extensionStatus.style.color = "#00f2ea"; // Aqua
            tiktokTabStatus.style.color = isTikTokPage ? "#00f2ea" : "#fff"; // Aqua if TikTok, White otherwise
            tiktokTabStatus.innerText = isTikTokPage ? "TikTok Tab Status: Currently viewing" : "TikTok Tab Status: Not Viewing";
        } else {
            extensionStatus.innerText = "OFF";
            extensionStatus.style.color = "#ccc"; // Grey
            tiktokTabStatus.innerText = "TikTok Tab Status:";
            tiktokTabStatus.style.color = "#ccc"; // Grey
        }
      }

    

    // Function to update the browsing history in the popup
    function updateHistory() {
        chrome.runtime.sendMessage({ getHistory: true }, (response) => {
            const history = response.history;
            historyContainer.innerHTML = ""; // Clear previous history

            if (history && history.length > 0) {
                const table = document.createElement("table");
                for (let i = 0; i < history.length; i++) {
                    const row = table.insertRow(-1);
                    const dateCell = row.insertCell(-1);
                    const timeCell = row.insertCell(-1);
                    const durationCell = row.insertCell(-1);
                    const linkCell = row.insertCell(-1);

                    // Use a single cell for the date and time
                    const dateTime = new Date(history[i].date);
                    dateCell.textContent = dateTime.toLocaleString();
                    
                    durationCell.textContent = formatDuration(history[i].duration);

                    const link = document.createElement("a");
                    link.textContent = history[i].url;
                    link.href = history[i].url;
                    link.target = "_blank";
                    linkCell.appendChild(link);
                }

                historyContainer.appendChild(table);
            } else {
                historyContainer.textContent = "No browsing history.";
            }
        });
    }


    updateHistory();
});

"use strict";

let tikTokTimer = 0; // Variable to store the time spent on TikTok

function isTikTokUrl(url) {
    return url.toLowerCase().includes("tiktok.com");
}

// // Function to start the timer
// function startTimer() {
//     tikTokTimer = setInterval(updateTimer, 1000); // Update the timer every second
// }

// // Function to stop the timer
// function stopTimer() {
//     clearInterval(tikTokTimer);
// }

// // Function to update the timer display
// function updateTimer() {
//     const timeSpentElement = document.getElementById("timeSpentOnTikTok");
//     tikTokTimer += 1000; // Increment the timer by one second
//     timeSpentElement.textContent = `Time Spent on TikTok: ${formatDuration(tikTokTimer)}`;
// }

// Function to format the duration
function formatDuration(duration) {
    const minutes = Math.floor(duration / 60000);
    const seconds = ((duration % 60000) / 1000).toFixed(0);
    return `${minutes}:${(seconds < 10 ? '0' : '')}${seconds}`;
}

// Function to update the badge text based on the toggle switch state
// function updateBadgeText(isEnabled) {
//     const badgeText = isEnabled ? "ON" : "OFF";
//     const badgeColor = isEnabled ? [0, 255, 0, 255] : [255, 0, 0, 255]; // Green for ON, Red for OFF

//     chrome.action.setBadgeBackgroundColor({ color: badgeColor });
//     chrome.action.setBadgeText({ text: badgeText });
// }


