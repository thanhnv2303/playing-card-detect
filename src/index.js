import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./style/index.css";

console.log("load electron", window.process?.type)
// Load electron-starter.js if running in Electron environment
if (window && window.process && window.process.type) {
    require('./electron/electron-starter')
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);

