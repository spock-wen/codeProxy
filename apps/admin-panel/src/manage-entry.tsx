import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AppRouter } from "@/app/AppRouter";
import { dismissAppLoader } from "@/app/bootstrap/dismissAppLoader";
import "@/styles/index.css";
import "goey-toast/styles.css";
import i18n from "@code-proxy/i18n";
import { I18nextProvider } from "react-i18next";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root not found");
}

// Debug: log i18n state
console.log("[manage-entry] i18n loaded:", !!i18n);
console.log("[manage-entry] i18n.isInitialized:", i18n.isInitialized);
console.log("[manage-entry] i18n.language:", i18n.language);
console.log("[manage-entry] i18n.options:", JSON.stringify(i18n.options, null, 2));

function renderApp() {
  console.log("[manage-entry] renderApp called");
  createRoot(rootElement!).render(
    <StrictMode>
      <I18nextProvider i18n={i18n}>
        <BrowserRouter basename="/manage">
          <AppRouter />
        </BrowserRouter>
      </I18nextProvider>
    </StrictMode>,
  );
  dismissAppLoader();
}

if (i18n.isInitialized) {
  console.log("[manage-entry] i18n already initialized, rendering immediately");
  renderApp();
} else {
  console.log("[manage-entry] i18n NOT initialized, waiting for event");
  i18n.on("initialized", () => {
    console.log("[manage-entry] i18n initialized event fired");
    renderApp();
  });
  // Fallback: if not initialized within 3s, render anyway
  setTimeout(() => {
    if (!i18n.isInitialized) {
      console.warn("[manage-entry] i18n still not initialized after 3s, forcing render");
      renderApp();
    }
  }, 3000);
}
