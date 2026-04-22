/**
 * derive.ts — Render helpers ÚNICAMENTE.
 *
 * Ley P1: prohibida cualquier lógica derivada del protocolo aquí.
 * Este archivo contiene solo formato visual (sin reglas económicas).
 * Todo lo que era "derivación" (curvePercent, graduationProgress) vive
 * ahora en el viewModel cocinado por el backend.
 */
import type { TotemProfile } from "../../lib/tradeApi";

// Emoji/symbol son decorativos. Son deterministas por address/name pero NO
// afectan ninguna regla del protocolo. Render puro.
const EMOJI_POOL = [
  "🔮","⚡","🌊","🔥","🌱","🛡️","🗝️","🪐","🌙","☀️",
  "🦊","🦉","🐉","🦄","🐺","🦅","🐙","🦋","🌸","💎",
];

function hashAddr(addr: string): number {
  let h = 0;
  const s = (addr || "0x0").toLowerCase();
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function deriveEmoji(addr: string): string {
  return EMOJI_POOL[hashAddr(addr) % EMOJI_POOL.length];
}

export function deriveSymbol(name: string): string {
  const w = (name || "").trim().split(/\s+/);
  if (w.length >= 2) return (w[0][0] + w[1][0]).toUpperCase();
  return (name || "XX").slice(0, 3).toUpperCase();
}

export function formatUsd(n: number, d = 6): string {
  if (!Number.isFinite(n)) return "0";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(2)}K`;
  if (n >= 1)         return `$${n.toFixed(2)}`;
  return `$${n.toFixed(d)}`;
}

export function formatWld(n: number, d = 4): string {
  if (!Number.isFinite(n)) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M WLD`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(2)}K WLD`;
  return `${n.toFixed(d)} WLD`;
}

export function formatCount(n: number): string {
  if (!Number.isFinite(n)) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return `${Math.floor(n)}`;
}

export function shortAddr(a: string): string {
  if (!a) return "—";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

/**
 * Decorativos solamente — emoji + symbol. Sin curvePercent (que inventaba
 * una regla de graduación falsa). La progresión real de graduación vive
 * en viewModel.progression.graduation.
 */
export interface Enriched extends TotemProfile {
    emoji:   string;
    symbol:  string;
    /** Decorativos opcionales: level/badge/score llegan del backend o de mocks. */
    level?:  number;
    badge?:  string;
    score?:  number;
    /** Avatar custom subido por el creador (data URL en localStorage). */
    avatar?: string | null;
  }
  export type Decorated = Enriched;

  export function enrich(t: TotemProfile): Enriched {
    const any_t: any = t;
    return {
      ...t,
      emoji:  deriveEmoji(t.address),
      symbol: any_t.symbol || deriveSymbol(t.name),
      level:  typeof any_t.level === "number" ? any_t.level : undefined,
      badge:  typeof any_t.badge === "string" ? any_t.badge : undefined,
      score:  typeof any_t.score === "number" ? any_t.score : undefined,
      avatar: loadTotemImage(t.address),
    };
  }

  /** Avatar custom (data URL) guardado por el creador, persistido en localStorage. */
  const IMG_KEY = (a: string) => "totem:image:" + (a || "").toLowerCase();
  export function loadTotemImage(address: string): string | null {
    if (typeof window === "undefined" || !address) return null;
    try { return window.localStorage.getItem(IMG_KEY(address)); } catch { return null; }
  }
  export function saveTotemImage(address: string, dataUrl: string): void {
    if (typeof window === "undefined" || !address) return;
    try { window.localStorage.setItem(IMG_KEY(address), dataUrl); } catch {}
  }
  