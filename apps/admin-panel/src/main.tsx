import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { AppRouter } from "@/app/AppRouter";
import { dismissAppLoader } from "@/app/bootstrap/dismissAppLoader";
import { GlobalIconButtonTooltip } from "@code-proxy/ui";
import "@/styles/index.css";
import "goey-toast/styles.css";
import i18n from "@code-proxy/i18n";
import { I18nextProvider } from "react-i18next";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root not found");
}

function renderApp() {
  createRoot(rootElement).render(
    <StrictMode>
      <I18nextProvider i18n={i18n}>
        <HashRouter>
          <GlobalIconButtonTooltip />
          <AppRouter />
        </HashRouter>
      </I18nextProvider>
    </StrictMode>,
  );
  dismissAppLoader();
}

// Guard against race condition: if i18n is already initialized, render
// immediately; otherwise wait for the "initialized" event.
if (i18n.isInitialized) {
  renderApp();
} else {
  i18n.on("initialized", renderApp);
}
