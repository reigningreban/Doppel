// Popup or content script requesting the current status
interface downloadRequest {
    type: "START_DOWNLOAD";
  }
  
  // Background script broadcasting current status
  interface downloadResponse {
    type: "DOWNLOAD_STATUS";
    downloading: boolean;
  }
  
 
  
  export type MessageType = downloadRequest | downloadResponse;