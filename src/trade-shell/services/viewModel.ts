/**
 * viewModel.ts — Cliente tipado del endpoint /api/totem/viewModel.
 *
 * Ley P1: frontend SOLO renderiza. Cero lógica derivada.
 * Todo campo llega con { value, source, stale } pre-cocinado por
 * viewModelBuilder.mjs (+ extendViewModel patch).
 */

const API = "/api";

export interface VMField<T = unknown> {
  value:  T;
  source: "onchain" | "indexed" | "db" | "mirror" | "unknown";
  stale:  boolean;
  note?:  string;
}

export interface VMSubdomainSLA {
  stale:     boolean;
  ageSec:    number;
  budgetSec: number;
  reason:    string | null;
}

export interface VMIdentity {
  _v:     "identity_v1";
  name:   VMField<string | null>;
  owner:  VMField<string | null>;
  symbol: VMField<string | null>;
  _sla:   VMSubdomainSLA;
}

export interface VMStatus {
  _v:            "status_v1";
  graduated:     VMField<boolean | null>;
  ammPair:       VMField<string | null>;
  fraudLocked:   VMField<boolean | null>;
  frozen:        VMField<boolean | null>;
  emergencyMode: VMField<boolean | null>;
  isHuman:       VMField<boolean | null>;
  isTotem:       VMField<boolean | null>;
  overall:       "FRAUD_LOCKED" | "FROZEN" | "GRADUATED" | "EMERGENCY" | "OK";
  _sla:          VMSubdomainSLA;
}

export type OracleNarrative =
  | "ASCENDENTE" | "FUERTE" | "ESTABLE" | "DEBIL" | "CRITICO";

export interface VMOracle {
  _v:             "oracle_v1";
  score:          VMField<number | null>;
  influence:      VMField<number | null>;
  signedAt:       VMField<number | null>;
  scoreDelta:     VMField<number | null>;
  influenceDelta: VMField<number | null>;
  /** Etiqueta semántica determinista. Backend-only, frontend solo lee. */
  narrative?:     VMField<OracleNarrative | null>;
  /** Segundos desde la última firma. Pre-cocinado por backend (Ley P1). */
  signedAgeSec?:  VMField<number | null>;
  _sla:           VMSubdomainSLA;
}

export interface VMMarket {
  _v:                "market_v1";
  price:             VMField<number | string | null>;
  supply:            VMField<number | null>;
  rawVolume:         VMField<number | null>;
  verifiedVolume:    VMField<number | string | null>;
  volumeShown:       VMField<number | string | null>;
  createdAt:         VMField<number | null>;
  lastTradeAt:       VMField<number | null>;
  ageSec:            VMField<number>;
  /** Cercanía al próximo gate de supply (0..10000 bps). Backend-derivado. */
  curveTensionBps?:  VMField<number | null>;
  /** Segundos desde el último trade. Pre-cocinado por backend (Ley P1). */
  lastTradeAgeSec?:  VMField<number | null>;
  _sla:              VMSubdomainSLA;
}

export interface VMGraduationGates {
  level:  { have: number; need: number; ratioBps: number };
  supply: { have: number; need: number; ratioBps: number };
  volume: { have: string; need: string; ratioBps: number; uses: "verifiedVolume" };
  age:    { have: number; need: number; ratioBps: number };
}

export interface VMProgression {
  _v:     "progression_v1";
  level:  VMField<number | null>;
  badge:  VMField<number | string | null>;
  totalScoreAccumulated: VMField<number | null>;
  negativeEvents:        VMField<number | null>;
  levelProgress:         VMField<{ nextThreshold: number; progressBps: number }>;
  graduation:            VMField<{ gates: VMGraduationGates; bottleneckGate: string; overallBps: number; eligible: boolean }>;
  _sla:   VMSubdomainSLA;
}

export interface VMUserContext {
  _v:              "userContext_v1";
  balance:         VMField<number | null>;
  sellWindowUsed:  VMField<number | null>;
  credits:         VMField<string | null>;
  _sla:            VMSubdomainSLA;
}

export interface VMTrading {
  _v:               "trading_v1";
  buyFeeBps:        VMField<number>;
  sellFeeBps:       VMField<number>;
  ownerCapBps:      VMField<number>;
  userCapBps:       VMField<number>;
  humanTotemFeeBps: VMField<number>;
  rateLimit:        VMField<{ used: number; max: number; resetInSec: number } | null>;
  _sla:             VMSubdomainSLA;
}

/** Subdominio nuevo: riesgo y confianza. Todos los valores son backend-derived. */
export interface VMRisk {
  _v:                  "risk_v1";
  trustLevelBps:       VMField<number | null>;
  manipulationRiskBps: VMField<number | null>;
  negativeEvents:      VMField<number | null>;
  _sla:                VMSubdomainSLA;
}

export interface TotemViewModel {
  address:         string;
  protocolVersion: string;
  fetchedAt:       number;
  identity:        VMIdentity;
  status:          VMStatus;
  oracle:          VMOracle;
  market:          VMMarket;
  progression:     VMProgression;
  userContext:     VMUserContext;
  trading:         VMTrading;
  /** Presente si el backend aplicó extendViewModel(). */
  risk?:           VMRisk;
}

export async function getTotemViewModel(address: string, userId?: string): Promise<TotemViewModel> {
  const u = userId ? `&userId=${encodeURIComponent(userId)}` : "";
  const res = await fetch(`${API}/totem/viewModel?address=${encodeURIComponent(address)}${u}`);
  const text = await res.text();
  if (!res.ok) {
    try { const j = JSON.parse(text); throw new Error(j?.error ?? `Error ${res.status}`); }
    catch { throw new Error(`Error ${res.status}`); }
  }
  return JSON.parse(text) as TotemViewModel;
}

// ════════════════════════════════════════════════════════════════════════════
// Render helpers — SOLO formato. Nada de reglas de protocolo.
// ════════════════════════════════════════════════════════════════════════════

export function fmtWld(n: number | string | null | undefined, d = 4): string {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M WLD`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(2)}K WLD`;
  return `${v.toFixed(d)} WLD`;
}

export function fmtCount(n: number | null | undefined): string {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(1)}K`;
  return `${Math.floor(v)}`;
}

export function fmtBps(bps: number | null | undefined, decimals = 1): string {
  const v = Number(bps);
  if (!Number.isFinite(v)) return "—";
  return `${(v / 100).toFixed(decimals)}%`;
}

export function fmtDelta(d: number | null | undefined): string {
  const v = Number(d);
  if (!Number.isFinite(v)) return "—";
  return v > 0 ? `+${v}` : `${v}`;
}

export function fmtAge(sec: number | null | undefined): string {
  const v = Number(sec);
  if (!Number.isFinite(v) || v < 0) return "—";
  if (v < 60)     return `${Math.floor(v)}s`;
  if (v < 3600)   return `${Math.floor(v / 60)}m`;
  if (v < 86400)  return `${Math.floor(v / 3600)}h`;
  return `${Math.floor(v / 86400)}d`;
}

export function shortAddr(a: string | null | undefined): string {
  if (!a) return "—";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export const STATUS_COLORS: Record<VMStatus["overall"], string> = {
  FRAUD_LOCKED: "#ef4444",
  FROZEN:       "#60a5fa",
  GRADUATED:    "#22c55e",
  EMERGENCY:    "#f59e0b",
  OK:           "#a78bfa",
};

export const STATUS_LABELS: Record<VMStatus["overall"], string> = {
  FRAUD_LOCKED: "Bloqueado",
  FROZEN:       "Congelado",
  GRADUATED:    "Graduado → LP",
  EMERGENCY:    "Emergencia",
  OK:           "Activo",
};

export const NARRATIVE_COLORS: Record<OracleNarrative, string> = {
  ASCENDENTE: "#22c55e",
  FUERTE:     "#a78bfa",
  ESTABLE:    "#60a5fa",
  DEBIL:      "#f59e0b",
  CRITICO:    "#ef4444",
};
