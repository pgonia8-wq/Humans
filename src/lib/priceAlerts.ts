/**
 * priceAlerts.ts — alertas de precio locales (sin backend).
 *
 * El usuario puede definir alertas { side: "above"|"below", target } por totem.
 * Una alerta dispara una sola vez (se marca `triggered=true`) cuando el último
 * precio observado cruza el umbral.
 *
 * Persistencia: localStorage. Disparo: el llamador (TotemProfilePage) llama
 * `checkAlerts(address, currentPrice)` en cada poll y obtiene el array de
 * alertas recién disparadas para mostrarlas como toast.
 */

const KEY = "h_price_alerts";

export interface PriceAlert {
  id:        string;       // uuid local
  address:   string;       // totem
  side:      "above" | "below";
  target:    number;       // WLD
  createdAt: number;       // ms
  triggered: boolean;
  triggeredAt?: number;
}

function readAll(): PriceAlert[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

function writeAll(arr: PriceAlert[]): void {
  try { localStorage.setItem(KEY, JSON.stringify(arr)); } catch { /* */ }
  notify();
}

export function getAlertsFor(address: string): PriceAlert[] {
  if (!address) return [];
  const a = address.toLowerCase();
  return readAll().filter((al) => al.address === a);
}

export function getAllAlerts(): PriceAlert[] {
  return readAll();
}

export function addAlert(address: string, side: "above" | "below", target: number): PriceAlert {
  const al: PriceAlert = {
    id:        Math.random().toString(36).slice(2) + Date.now().toString(36),
    address:   address.toLowerCase(),
    side,
    target,
    createdAt: Date.now(),
    triggered: false,
  };
  writeAll([al, ...readAll()]);
  return al;
}

export function removeAlert(id: string): void {
  writeAll(readAll().filter((a) => a.id !== id));
}

/** Verifica alertas no disparadas para `address` con `currentPrice`.
 *  Marca como disparadas las que crucen el umbral y devuelve esas. */
export function checkAlerts(address: string, currentPrice: number): PriceAlert[] {
  if (!address || !isFinite(currentPrice)) return [];
  const a = address.toLowerCase();
  const all = readAll();
  const fired: PriceAlert[] = [];
  let mutated = false;
  for (const al of all) {
    if (al.address !== a || al.triggered) continue;
    const cross = (al.side === "above" && currentPrice >= al.target)
               || (al.side === "below" && currentPrice <= al.target);
    if (cross) {
      al.triggered = true;
      al.triggeredAt = Date.now();
      fired.push({ ...al });
      mutated = true;
    }
  }
  if (mutated) writeAll(all);
  return fired;
}

// ── Subscripción ────────────────────────────────────────────────────────────
type Listener = () => void;
const listeners = new Set<Listener>();
function notify() { listeners.forEach((l) => { try { l(); } catch { /* */ } }); }

export function subscribePriceAlerts(listener: Listener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
