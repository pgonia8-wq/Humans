/**
 * watchlist.ts — favoritos del usuario, persistidos en localStorage.
 *
 * Sin backend, sin auth: cada device mantiene su propia watchlist.
 * Solo addresses 0x... lowercased.
 */

const KEY = "h_watchlist";

function read(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.map((a) => String(a).toLowerCase()).filter(Boolean));
  } catch { return new Set(); }
}

function write(set: Set<string>) {
  try { localStorage.setItem(KEY, JSON.stringify(Array.from(set))); } catch { /* noop */ }
}

export function getWatchlist(): string[] {
  return Array.from(read());
}

export function isWatched(address: string): boolean {
  if (!address) return false;
  return read().has(address.toLowerCase());
}

export function addWatch(address: string): void {
  if (!address) return;
  const s = read(); s.add(address.toLowerCase()); write(s);
  notify();
}

export function removeWatch(address: string): void {
  if (!address) return;
  const s = read(); s.delete(address.toLowerCase()); write(s);
  notify();
}

export function toggleWatch(address: string): boolean {
  if (!address) return false;
  const s = read();
  const a = address.toLowerCase();
  let nowOn = false;
  if (s.has(a)) { s.delete(a); }
  else          { s.add(a); nowOn = true; }
  write(s);
  notify();
  return nowOn;
}

// ── Suscripción ligera para que la UI reaccione ────────────────────────────
type Listener = () => void;
const listeners = new Set<Listener>();
function notify() { listeners.forEach((l) => { try { l(); } catch { /* */ } }); }

export function subscribeWatchlist(listener: Listener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
