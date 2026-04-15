import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import StorageConsentBanner from "./StorageConsentBanner.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <>
    <App />
    <StorageConsentBanner />
  </>
);
