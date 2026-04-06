export interface Token {
  id: string;
  name: string;
  symbol: string;
  emoji: string;
  avatarUrl?: string | null;
  creatorId: string;
  creatorName: string;
  priceWld: number;
  priceUsdc: number;
  marketCap: number;
  holders: number;
  curvePercent: number;
  change24h: number;
  volume24h: number;
  totalSupply: number;
  circulatingSupply: number;
  lockedSupply: number;
  burnedSupply: number;
  lockDurationDays: number;
  description: string;
  createdAt: string;
  isTrending: boolean;
  tags: string[];
  buyPressure: number;
  totalWldInCurve?: number;
  treasuryBalance?: number;
  graduated?: boolean;
  graduatedAt?: string | null;
  socials?: Record<string, string>;
  contractAddress?: string | null;
}

export interface Airdrop {
  id: string;
  tokenId: string;
  tokenName: string;
  tokenSymbol: string;
  tokenEmoji: string;
  title: string;
  description: string;
  totalAmount: number;
  claimedAmount: number;
  dailyAmount: number;
  participants: number;
  maxParticipants: number;
  endDate: string;
  isActive: boolean;
  cooldownHours: number;
  userClaimedAt?: string | null;
  userTotalClaimed?: number;
}

export interface Holding {
  tokenId: string;
  tokenName: string;
  tokenSymbol: string;
  tokenEmoji: string;
  amount: number;
  avgBuyPrice: number;
  currentPrice: number;
  value: number;
  pnl: number;
  pnlPercent: number;
}

export interface ActivityItem {
  id: string;
  type: "buy" | "sell" | "airdrop" | "lock" | "burn" | "create" | "graduate";
  userId: string;
  username: string;
  tokenId: string;
  tokenSymbol: string;
  amount: number;
  price?: number;
  total?: number;
  timestamp: string;
}

export interface TokenStats {
  txns: number;
  buys: number;
  sells: number;
  buyVolume: number;
  sellVolume: number;
  volume: number;
  makers: number;
  buyPercent: number;
  sellPercent: number;
}

export interface TokenDetail extends Token {
  stats?: TokenStats;
}

export interface HolderInfo {
  userId: string;
  username: string;
  avatarUrl?: string;
  amount: number;
  percentage: number;
  value: number;
}

export interface UserProfile {
  id: string;
  username: string;
  avatarUrl?: string;
  bio?: string;
  balanceUsdc: number;
  balanceWld: number;
  totalValue: number;
  tokensCreated: number;
  tokensHeld: number;
  joinedAt: string;
  tier?: string;
  creatorEarnings?: number;
}

export interface TokenListResponse {
  tokens: Token[];
  total: number;
  hasMore: boolean;
}

export interface AirdropListResponse {
  airdrops: Airdrop[];
  total: number;
}

export interface HoldingsResponse {
  holdings: Holding[];
  totalValue: number;
  totalPnl: number;
  totalPnlPercent: number;
}

export interface ActivityListResponse {
  activities: ActivityItem[];
  total: number;
}

export interface BuyRequest {
  tokenId: string;
  amountWld: number;
  userId: string;
  transactionId?: string;
}

export interface BuyResult {
  success: boolean;
  tokensReceived: number;
  fee: number;
  avgPrice: number;
  newPrice: number;
  newPriceUsd: number;
  newSupply: number;
  curvePercent: number;
  message: string;
}

export interface SellRequest {
  tokenId: string;
  tokensToSell: number;
  userId: string;
}

export interface SellResult {
  success: boolean;
  wldReceived: number;
  fee: number;
  grossWld: number;
  avgPrice: number;
  newPrice: number;
  newPriceUsd: number;
  newSupply: number;
  curvePercent: number;
  message: string;
}

export interface ClaimAirdropRequest {
  airdropId: string;
  userId: string;
}

export interface ClaimResult {
  success: boolean;
  amount?: number;
  nextClaimAt?: string;
  message: string;
}

export interface CreateTokenRequest {
  name: string;
  symbol: string;
  description: string;
  emoji?: string;
  creatorId: string;
  avatarUrl?: string;
  transactionId?: string;
  twitter?: string;
  telegram?: string;
  website?: string;
}

export interface UploadResult {
  success: boolean;
  url: string;
}

export interface GraduateResult {
  success: boolean;
  graduated: boolean;
  totalLiquidity: number;
  toPool: number;
  toTreasury: number;
  finalPrice: number;
  message: string;
}

export interface PriceSnapshot {
  price: number;
  priceUsd: number;
  supply: number;
  volume: number;
  type: string;
  time: string;
}

export interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface PriceHistoryResponse {
  snapshots: PriceSnapshot[];
  candles: Candle[];
  period: string;
  total: number;
}

export function formatNum(n: number, decimals = 2): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toFixed(decimals);
}

export function timeAgo(isoString: string): string {
  const diff = (Date.now() - new Date(isoString).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function getMomentumLabel(curvePercent: number): { label: string; color: string; description: string } {
  if (curvePercent < 20) return { label: "EARLY", color: "#10f090", description: "Get in before the crowd" };
  if (curvePercent < 50) return { label: "RISING", color: "#06d6f7", description: "Momentum building fast" };
  if (curvePercent < 80) return { label: "HOT", color: "#f7a606", description: "High conviction zone" };
  return { label: "LAST CHANCE", color: "#f05050", description: "Curve almost complete" };
}
