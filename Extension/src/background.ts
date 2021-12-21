// This file is ran as a background script
import { MessageType } from "./types";
console.log("Hello from background script!")
const startDownload = (downloading: boolean) => {
    chrome.runtime.sendMessage({ type: "DOWNLOAD_STATUS", downloading });
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
        tabs.forEach((tab) => {
            if (tab.id) {
              chrome.tabs.sendMessage(tab.id, { type: "DOWNLOAD_STATUS", downloading });
            }
          });
    });
  };

chrome.runtime.onMessage.addListener((message: MessageType) => {
    if (message.type === "START_DOWNLOAD") {
        console.log("Message received in background.js! It is time to download");
        startDownload(true);
    }
  });