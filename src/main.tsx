import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";
import "./i18n";
import { seedDatabase } from "./data/db";

// Offline: the service worker precaches the app shell and updates itself
registerSW({ immediate: true });

// First run seeds the demo farm before any screen reads it, so forms never start from an empty farm
seedDatabase()
  .catch(console.error)
  .finally(() => createRoot(document.getElementById("root")!).render(<App />));
