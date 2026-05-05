import { useEffect } from "react";

/**
 * useBodyScrollLock — Bloquea scroll del background cuando un modal está abierto.
 * Soluciona el iOS WebKit rubber-band/bounce del fondo bajo overlays fullscreen.
 *
 * Uso:
 *   useBodyScrollLock(isOpen);
 *
 * Soporta múltiples modales simultáneos vía contador interno.
 */

let lockCount = 0;
let savedScrollY = 0;

function applyLock() {
  if (lockCount === 0) {
    const root = document.getElementById("root");
    savedScrollY = root ? root.scrollTop : window.scrollY;
    document.body.classList.add("modal-open");
    if (root) root.style.top = `-${savedScrollY}px`;
  }
  lockCount += 1;
}

function releaseLock() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    const root = document.getElementById("root");
    const y = savedScrollY;
    document.body.classList.remove("modal-open");
    if (root) {
      // style.top se mantiene hasta el RAF para evitar flash visual.
      // scrollTop se restaura después de que el browser aplique el cambio
      // de position:fixed → position:absolute (de lo contrario se ignora).
      requestAnimationFrame(() => {
        root.style.top = "";
        root.scrollTop = y;
      });
    }
  }
}

export function useBodyScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    applyLock();
    return () => { releaseLock(); };
  }, [active]);
}

export default useBodyScrollLock;
