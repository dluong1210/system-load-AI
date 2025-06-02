import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css"; // If you have global styles
import "antd/dist/reset.css"; // Ant Design global styles reset

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
