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

/** Parámetros que envía el frontend al backend tras ejecutar sendTransaction */
export interface ExecuteTradeParams {
  txHash:           string;   // Hash de la tx on-chain emitida por MiniKit
  type:             "buy" | "sell";
  totemAddress:     string;
  userId:           string;
  walletAddress:    string;
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
  const res = await fetch(`${API}${path}`, init);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `Error ${res.status}`);
  return json as T;
}

// ════════════════════════════════════════════════════════
// PREVIEWS (advisories — el contrato es la fuente de verdad)
// ════════════════════════════════════════════════════════

export async function buyPreview(totemAddress: string, wldIn: number): Promise<BuyPreview> {
  return apiFetch("/market/buy", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ totem: totemAddress, wldIn }),
  });
}

export async function sellPreview(
  totemAddress:  string,
  tokensToSell:  number,
  walletAddress: string,
  userId:        string,
): Promise<SellPreviewResult> {
  return apiFetch("/market/sellPreview", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ totem: totemAddress, tokensToSell, walletAddress, userId }),
  });
}

// ════════════════════════════════════════════════════════
// EXECUTE — backend verifica txHash on-chain y persiste
// ════════════════════════════════════════════════════════

export async function executeTrade(params: ExecuteTradeParams): Promise<ExecuteTradeResult> {
  return apiFetch("/market/execute", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(params),
  });
}

// ════════════════════════════════════════════════════════
// TOTEM
// ════════════════════════════════════════════════════════

export async function getTotemProfile(address: string): Promise<TotemProfile> {
  return apiFetch(`/totem/profile?address=${encodeURIComponent(address)}`);
}

export async function getTotemHistory(address: string, limit = 48): Promise<TotemHistory[]> {
  return apiFetch(`/totem/history?address=${encodeURIComponent(address)}&limit=${limit}`);
}

export async function createTotem(
  address: string,
  name:    string,
  userId:  string,
): Promise<TotemProfile> {
  return apiFetch("/totem/create", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ address, name, userId }),
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
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ totem: totemAddress, walletAddress, userId }),
  });
}

// ════════════════════════════════════════════════════════
// SYSTEM
// ════════════════════════════════════════════════════════

export async function getSystemMetrics(): Promise<SystemMetrics> {
  return apiFetch("/system/metrics");
}

export async function getAllTotems(
  sort:  "price" | "volume" | "score" | "supply" = "volume",
  limit = 50,
): Promise<TotemProfile[]> {
  return apiFetch(`/system/all?sort=${sort}&limit=${limit}`);
}

export async function searchTotems(query: string): Promise<TotemProfile[]> {
  return apiFetch(`/system/search?q=${encodeURIComponent(query)}`);
}

export async function getStabilityStatus(): Promise<{
  stable: boolean; frozen: string[]; warnings: string[];
}> {
  return apiFetch("/system/stability");
}
