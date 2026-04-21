/**
 * tradeApi.ts — Cliente tipado para la API de trading
 *
 * Flujo completo:
 *   BUY:  buyPreview → MiniKit.sendTransaction(approve + buy) → executeTrade(txHash)
 *   SELL: sellPreview → MiniKit.sendTransaction(sell) → executeTrade(txHash)
 *
 * executeTrade SOLO lleva el txHash al backend.
 * El backend verifica on-chain y persiste. NUNCA ejecuta transferencias.
 */

const API = "/api";

// ════════════════════════════════════════════════════════
// SESSION TOKEN (HMAC server-side)
// ════════════════════════════════════════════════════════
//
// Token emitido por /api/walletVerify tras validar firma SIWE de la wallet
// World App. Es la ÚNICA prueba criptográfica de identidad aceptada por
// endpoints sensibles (create totem, execute trade). Vive en localStorage
// junto con `wallet`/`userId`. Se envía en cada request en el header
// `Authorization: Bearer <token>`. Sin token válido → 401.
//
const SESSION_KEY = "h_session_token";

export function setSessionToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(SESSION_KEY, token);
    else       localStorage.removeItem(SESSION_KEY);
  } catch { /* localStorage bloqueado: sin sesión persistente */ }
}

export function getSessionToken(): string | null {
  try { return localStorage.getItem(SESSION_KEY); } catch { return null; }
}

export function clearSessionToken(): void {
  setSessionToken(null);
}

function authHeaders(extra?: HeadersInit): HeadersInit {
  const t = getSessionToken();
  const base: Record<string, string> = { "Content-Type": "application/json" };
  if (t) base.Authorization = `Bearer ${t}`;
  return { ...base, ...(extra as Record<string, string> | undefined) };
}

// ════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════

export interface TotemProfile {
  address:    string;
  name:       string;
  score:      number;
  influence:  number;
  level:      number;
  badge:      string;
  price:      number;
  supply:     number;
  volume_24h: number;
  created_at: string;
  // Ownership server-derived (no se confía nunca en estado en memoria del cliente)
  owner_id?:  string | null;
  isOwner?:   boolean;
}

export interface TotemHistory {
  id:        string;
  totem:     string;
  score:     number;
  price:     number;
  timestamp: string;
}

export interface BuyPreview {
  advisory:   true;
  wldIn:      number;
  tokensOut:  number;
  fee:        number;
  priceAfter: number;
  supplyAfter: number;
}

export interface SellPreviewResult {
  advisory:          true;
  tokensIn:          number;
  wldOut:            number;
  fee:               number;
  priceAfter:        number;
  supplyAfter:       number;
  userBalance:       number;
  soldToday:         number;
  remainingAllowance: number;
  warningMsg:        string | null;
}

/** Parámetros que envía el frontend al backend tras ejecutar sendTransaction.
 *  La identidad (userId, walletAddress) sale del session token, NO del body. */
export interface ExecuteTradeParams {
  txHash:           string;   // Hash de la tx on-chain emitida por MiniKit
  type:             "buy" | "sell";
  totemAddress:     string;
  // Estimados del preview (requeridos en modo simulación, advisory en producción)
  estimatedWld?:    number;
  estimatedTokens?: number;
}

export interface ExecuteTradeResult {
  ok:          true;
  type:        "buy" | "sell";
  wldAmount:   number;
  tokenAmount: number;
  newPrice:    number;
  newSupply:   number;
  txHash:      string;
}

export interface TradeLimit {
  userBalance:       number;
  soldToday:         number;
  remainingAllowance: number;
  dailyAllimitPct:   number;
}

export interface SystemMetrics {
  totalTotems:    number;
  totalVolume:    number;
  avgPrice:       number;
  topTotem:       TotemProfile | null;
}

// ════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API}${path}`;
  // Inyecta Authorization: Bearer <token> automáticamente cuando hay sesión.
  // Endpoints públicos lo ignoran; sensibles (create/execute) lo exigen.
  const finalInit: RequestInit = {
    ...init,
    headers: authHeaders(init?.headers),
  };
  const res = await fetch(url, finalInit);

  // Lectura defensiva: text() primero (nunca rompe en body vacío)
  const text = await res.text();

  // Logging temporal — útil para diagnosticar 404 / HTML / JSON inválido
  if (typeof console !== "undefined") {
    console.log(`[API ${res.status}] ${path}:`, text ? text.slice(0, 240) : "(empty)");
  }

  if (!text) {
    throw new Error(
      !res.ok ? `Error ${res.status} (sin body)` : "Respuesta vacía del servidor",
    );
  }

  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(
      !res.ok
        ? `Error ${res.status}: respuesta no-JSON (${text.slice(0, 80)})`
        : "Respuesta no es JSON válido",
    );
  }

  if (!res.ok) {
    throw new Error(json?.error ?? `Error ${res.status}`);
  }
  return json as T;
}

// ════════════════════════════════════════════════════════
// PREVIEWS (advisories — el contrato es la fuente de verdad)
// ════════════════════════════════════════════════════════

export async function buyPreview(totemAddress: string, wldIn: number): Promise<BuyPreview> {
  return apiFetch("/market/buy", {
    method: "POST",
    body:   JSON.stringify({ totem: totemAddress, wldIn }),
  });
}

export async function sellPreview(
  totemAddress:  string,
  tokensToSell:  number,
  walletAddress: string,
  userId:        string,
): Promise<SellPreviewResult> {
  return apiFetch("/market/sellPreview", {
    method: "POST",
    body:   JSON.stringify({ totem: totemAddress, tokensToSell, walletAddress, userId }),
  });
}

// ════════════════════════════════════════════════════════
// EXECUTE — backend verifica txHash on-chain y persiste
// ════════════════════════════════════════════════════════

export async function executeTrade(params: ExecuteTradeParams): Promise<ExecuteTradeResult> {
  return apiFetch("/market/execute", {
    method: "POST",
    body:   JSON.stringify(params),
  });
}

// ════════════════════════════════════════════════════════
// TOTEM
// ════════════════════════════════════════════════════════

export async function getTotemProfile(
  address: string,
  userId?: string,
): Promise<TotemProfile> {
  const u = userId ? `&userId=${encodeURIComponent(userId)}` : "";
  return apiFetch(`/totem/profile?address=${encodeURIComponent(address)}${u}`);
}

export async function getTotemHistory(address: string, limit = 48): Promise<TotemHistory[]> {
  return apiFetch(`/totem/history?address=${encodeURIComponent(address)}&limit=${limit}`);
}

export async function createTotem(
  address: string,
  name:    string,
): Promise<TotemProfile> {
  // userId/walletAddress NO se envían: el backend los deriva del session token
  // (Authorization: Bearer ...) firmado tras SIWE en walletVerify.
  return apiFetch("/totem/create", {
    method: "POST",
    body:   JSON.stringify({ address, name }),
  });
}

// ════════════════════════════════════════════════════════
// MARKET
// ════════════════════════════════════════════════════════

export async function getTradeLimits(
  totemAddress:  string,
  walletAddress: string,
  userId:        string,
): Promise<TradeLimit> {
  return apiFetch("/market/tradeLimits", {
    method: "POST",
    body:   JSON.stringify({ totem: totemAddress, walletAddress, userId }),
  });
}

// ════════════════════════════════════════════════════════
// SYSTEM
// ════════════════════════════════════════════════════════

export async function getSystemMetrics(): Promise<SystemMetrics> {
  return apiFetch("/system/metrics");
}

export async function getAllTotems(
  sort:    "price" | "volume" | "score" | "supply" = "volume",
  limit  = 50,
  userId?: string,
): Promise<TotemProfile[]> {
  const u = userId ? `&userId=${encodeURIComponent(userId)}` : "";
  return apiFetch(`/system/all?sort=${sort}&limit=${limit}${u}`);
}

export async function searchTotems(query: string): Promise<TotemProfile[]> {
  return apiFetch(`/system/search?q=${encodeURIComponent(query)}`);
}

export async function getStabilityStatus(): Promise<{
  stable: boolean; frozen: string[]; warnings: string[];
}> {
  return apiFetch("/system/stability");
}

// ════════════════════════════════════════════════════════
// TRADES & HOLDERS (lectura, derivados de tabla `trades`)
// ════════════════════════════════════════════════════════

export interface TotemTrade {
  id:        string;
  type:      "buy" | "sell";
  user:      string;
  totem:     string;
  amount:    number; // WLD
  tokens:    number;
  tx_hash:   string;
  timestamp: string;
}

export interface TotemHolder {
  user_id:    string;
  tokens:     number;
  share_pct:  number;
  last_trade: string | null;
}

export interface TotemHoldersResult {
  total_holders:        number;
  total_supply_derived: number;
  holders:              TotemHolder[];
}

export async function getTotemTrades(address: string, limit = 50): Promise<TotemTrade[]> {
  return apiFetch(`/totem/trades?address=${encodeURIComponent(address)}&limit=${limit}`);
}

export async function getTotemHolders(address: string, limit = 20): Promise<TotemHoldersResult> {
  return apiFetch(`/totem/holders?address=${encodeURIComponent(address)}&limit=${limit}`);
}
