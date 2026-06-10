import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { LogoAnimationProvider } from "./lib/logo-animation-context";
import { LogoProvider } from "./lib/logo-context";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./index.css";

// Apply theme before React renders to prevent flash of wrong theme
(function initializeTheme() {
  const stored = localStorage.getItem("theme");
  const theme = stored === "Light" || stored === "Dark" || stored === "System"
    ? stored
    : "System";

  let resolvedClass: "light" | "dark";
  if (theme === "Light") {
    resolvedClass = "light";
  } else if (theme === "Dark") {
    resolvedClass = "dark";
  } else {
    resolvedClass = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  document.documentElement.classList.remove("light", "dark");
  document.documentElement.classList.add(resolvedClass);
})();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <LogoProvider>
          <LogoAnimationProvider>
            <App />
          </LogoAnimationProvider>
        </LogoProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
