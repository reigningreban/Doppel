// This file is injected as a content script
import { MessageType } from "./types";
import { htmlToFigma } from "@builder.io/html-to-figma";

chrome.runtime.onMessage.addListener((message: MessageType) => {
    if (message.type === "DOWNLOAD_STATUS") {
        if (message.downloading) {
            const layers = htmlToFigma('body');
            // console.log(layers);
            let file = {
                "layers": layers
            }
            var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(file));
            var dlAnchorElem =document.createElement("A"); 
            dlAnchorElem.setAttribute("href",     dataStr     );
            dlAnchorElem.setAttribute("download", "PageDesign.json");
            dlAnchorElem.click();
            
            console.log("Download Success");
        }
    }
  });