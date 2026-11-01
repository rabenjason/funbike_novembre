import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

// Dark is the default brand experience. Apply it before React paints to avoid
// a white flash; an explicit light-mode choice is always preserved.
if (localStorage.getItem("fb-theme") !== "light") {
  document.documentElement.classList.add("dark");
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
