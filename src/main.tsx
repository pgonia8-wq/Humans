import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

import MiniKitProvider from "./components/minikit-provider";
import { ThemeProvider } from "./lib/ThemeContext";
import { UserProvider } from "./context/UserContext";
import { LanguageProvider } from "./LanguageContext";
import ErrorBoundary from "./components/ErrorBoundary";

// ── iOS / WKWebView rubber-band bounce polyfill ───────────────────────────────
//
// En WKWebView (World App) hay dos capas de scroll:
//   1. La nativa del WKWebView — la que causa el "deforma/desarma" de los
//      elementos con position:fixed y backdrop-filter.
//   2. El scroll JS de #root (overflow-y:scroll).
//
// El fix CSS overscroll-behavior-y:none funciona en Safari ≥ 16.
// Para iOS 13–15 (iPhone 11 en adelante sin actualizar), necesitamos JS.
//
// CLAVE: el listener debe ir en `document`, NO en `#root`.
// Si va en #root (overflow-y:scroll), WKWebView lo trata como scroll nativo
// y puede ignorar el e.preventDefault(). En `document`, siempre lo respeta.
//
// Lógica:
//   - Si el toque viene de un hijo con scroll propio que aún tiene recorrido
//     en esa dirección → dejarlo pasar (modales, inbox, listas internas).
//   - Solo bloquear el bounce en los límites de #root (tope y fondo).
//   - Fuera de #root (portales como el visor fullscreen) → siempre bloquear
//     (el overlay fullscreen ya tiene touchAction:none, esto refuerza).
//
function initIOSBounceFix() {
  let startY = 0;

  // touchstart en document para capturar la posición inicial del gesto.
  document.addEventListener(
    "touchstart",
    (e: TouchEvent) => {
      startY = e.touches[0]?.clientY ?? 0;
    },
    { passive: true },
  );

  // touchmove en document con passive:false para poder llamar preventDefault.
  document.addEventListener(
    "touchmove",
    (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;

      const root = document.getElementById("root");
      if (!root) return;

      const deltaY = touch.clientY - startY;

      // ── Verificar si el target está dentro de #root ──────────────────
      // Si está fuera (Portal como el visor de imagen fullscreen),
      // siempre bloqueamos — esos overlays no deben producir scroll nativo.
      let insideRoot = false;
      let el: Element | null = e.target as Element;
      while (el) {
        if (el === root) { insideRoot = true; break; }
        el = el.parentElement;
      }

      if (!insideRoot) {
        e.preventDefault();
        return;
      }

      // ── Buscar contenedor hijo scrollable entre target y #root ────────
      // Si ese hijo todavía tiene recorrido en la dirección del gesto,
      // no interferimos → el modal/lista interior scrollea normalmente.
      el = e.target as Element | null;
      while (el && el !== root) {
        const oy = getComputedStyle(el).overflowY;
        if (oy === "scroll" || oy === "auto") {
          const canUp   = el.scrollTop > 0;
          const canDown = el.scrollTop + el.clientHeight < el.scrollHeight - 1;
          if ((deltaY > 0 && canUp) || (deltaY < 0 && canDown)) {
            return; // hijo puede scrollear → dejar pasar
          }
          break; // hijo llegó a su límite → comprobar límite de #root
        }
        el = el.parentElement;
      }

      // ── Bloquear solo en los límites de #root ─────────────────────────
      const atTop    = root.scrollTop <= 0 && deltaY > 0;
      const atBottom =
        root.scrollTop + root.clientHeight >= root.scrollHeight - 1 && deltaY < 0;

      if (atTop || atBottom) {
        e.preventDefault(); // bloquea el bounce nativo del WKWebView
      }
    },
    { passive: false }, // OBLIGATORIO: passive:false para que preventDefault funcione
  );
}

initIOSBounceFix();

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
