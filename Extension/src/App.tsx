import * as React from "react";
import mark from "./check-mark.svg";
import "./App.css";

const App = () => {
  const [loading, setLoading] = React.useState(false);
  const [downloaded, setDownloaded] = React.useState(false);
  const download = () => {
    setLoading(true);
    chrome.runtime.sendMessage({type: "START_DOWNLOAD"}, () => {
      setLoading(false);
      setDownloaded(true);
    });
  }
  return (
    <div className="flex items-center justify-center bg-gray-900 w-80 h-60 App">
    <header className="w-full">
      {downloaded ?
      <div>
        <h1 className = "text-3xl font-bold text-white">Downloaded</h1>
        <div className = "flex justify-center">
          <img src = {mark} alt="mark" className = "w-12" />
        </div>
        <p className = "px-3 py-2 text-lg text-white">Your JSON has been downloaded, you can now import your design in the tool of your choice</p>
      </div>
      :
      <div>
        <h1 className = "text-3xl font-bold text-blue-400">Doppel Extension</h1>
        <p className = "py-3 text-white">Click "Download Now" to  Generate Json for Page</p>
        <div className = "flex items-center justify-center">
          <button className = "px-5 py-3 text-xl font-bold text-white bg-blue-400 rounded hover:bg-blue-500" id = "download" onClick = {download} disabled = {loading}>{loading ? `Loading...` : `Download Now`}</button>
        </div>
      </div>
      }
      
    </header>
  </div>
  );
};

export default App;
