import React from "react";
  import ReactDOM from "react-dom/client";
  import App from "./App.tsx";
  import "./index.css";

  import MiniKitProvider from "./components/minikit-provider";
  import { ThemeProvider } from "./lib/ThemeContext";
  import { UserProvider } from "./context/UserContext";
  import { LanguageProvider } from "./LanguageContext";
  import ErrorBoundary from "./components/ErrorBoundary";

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <MiniKitProvider>
      <UserProvider>
        <ThemeProvider>
          <LanguageProvider>
            <ErrorBoundary>
              <App />
            </ErrorBoundary>
          </LanguageProvider>
        </ThemeProvider>
      </UserProvider>
    </MiniKitProvider>
  );
  