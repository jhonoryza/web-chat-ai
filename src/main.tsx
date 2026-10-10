import "./index.css";
import App from "./App";
import { createRoot } from "react-dom/client";

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Missing #root element");

try {
  const raw = localStorage.getItem("wca_settings_v1");
  const theme = raw && JSON.parse(raw).theme === "light" ? "light" : "dark";
  document.documentElement.dataset.theme = theme;
} catch {
  document.documentElement.dataset.theme = "dark";
}

createRoot(rootEl).render(<App />);
