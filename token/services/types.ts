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
  type: "buy" | "sell" | "airdrop" | "airdrop_claim" | "lock" | "burn" | "create" | "graduate";
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
  idempotencyKey?: string;
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
  idempotencyKey?: string;
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
  wasPartial?: boolean;
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

export interface LockRequest {
  tokenId: string;
  amount: number;
  durationDays: number;
  userId: string;
}

export interface LockResult {
  success: boolean;
  locked: number;
  totalLocked: number;
  unlockDate: string;
  message: string;
}

export interface BurnRequest {
  tokenId: string;
  amount: number;
  userId: string;
}

export interface BurnResult {
  success: boolean;
  burned: number;
  totalBurned: number;
  newSupply: number;
  message: string;
}

export interface AirdropPool {
  id: string;
  tokenId: string;
  tokenSymbol: string;
  totalPool: number;
  allocated: number;
  available: number;
  linkCount: number;
  maxLinks: number;
  createdAt: string;
}

export interface AirdropLink {
  id: string;
  poolId: string;
  tokenId: string;
  tokenSymbol: string;
  code: string;
  amount: number;
  claimedAmount: number;
  remaining: number;
  mode: "permanent" | "one_time";
  isActive: boolean;
  claims: number;
  createdAt: string;
  link: string;
}

export interface BuyPoolRequest {
  action: "buy_pool";
  tokenId: string;
  creatorId: string;
  transactionId: string;
}

export interface BuyPoolResult {
  success: boolean;
  poolId: string;
  totalPool: number;
  message: string;
}

export interface CreateLinkRequest {
  action: "create_link";
  poolId: string;
  amount: number;
  mode: "permanent" | "one_time";
  creatorId: string;
}

export interface CreateLinkResult {
  success: boolean;
  linkId: string;
  code: string;
  link: string;
  amount: number;
  message: string;
}

export interface DeleteLinkRequest {
  linkId: string;
  creatorId: string;
}

export interface DeleteLinkResult {
  success: boolean;
  returned: number;
  message: string;
}

export interface AirdropDataResponse {
  pools: AirdropPool[];
  links: AirdropLink[];
  total: number;
}

export interface RedeemAirdropRequest {
  code: string;
  userId: string;
}

export interface RedeemAirdropResult {
  success: boolean;
  amount: number;
  tokenSymbol: string;
  message: string;
}

export function formatNum(n: number, decimals = 2): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(decimals) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(decimals) + "K";
  return n.toFixed(decimals);
}

export function formatCompact(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toFixed(0);
}

export function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export function getMomentumLabel(curvePercent: number): { label: string; color: string; description: string } {
  if (curvePercent >= 80) return { label: "GRADUATING", color: "#f05050", description: "Nearing DEX launch" };
  if (curvePercent >= 50) return { label: "ACCELERATING", color: "#f7a606", description: "Strong momentum" };
  if (curvePercent >= 20) return { label: "BUILDING", color: "#06d6f7", description: "Growing steadily" };
  return { label: "EARLY", color: "#10f090", description: "Just getting started" };
}
