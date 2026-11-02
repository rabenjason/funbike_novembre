import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

// Start in dark mode by default. A new key prevents stale light-mode settings
// from earlier builds from overriding the initial night theme.
if (localStorage.getItem("fb-theme-v2") !== "light") {
  document.documentElement.classList.add("dark");
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
