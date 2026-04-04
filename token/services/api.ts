import {
  MOCK_TOKENS,
  MOCK_AIRDROPS,
  MOCK_HOLDINGS,
  MOCK_ACTIVITY,
  type Token,
  type Airdrop,
  type Holding,
  type ActivityItem,
} from "./mockData";

const BASE = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  return res.json() as Promise<T>;
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
}

export interface BuyRequest {
  tokenId: string;
  amount: number;
  currency: "WLD" | "USDC";
  userId: string;
  paymentMethod: "WLD" | "STRIPE" | "MERCADOPAGO";
}

export interface SellRequest {
  tokenId: string;
  amount: number;
  userId: string;
}

export interface TransactionResult {
  success: boolean;
  txHash?: string;
  amount?: number;
  price?: number;
  total?: number;
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
  totalSupply: number;
  creatorId: string;
  lockPercent?: number;
  lockDurationDays?: number;
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export const api = {
  async getTokens(params?: { search?: string; sort?: string; limit?: number; offset?: number }): Promise<TokenListResponse> {
    try {
      return await request<TokenListResponse>(`/tokens?${new URLSearchParams(params as Record<string, string>)}`);
    } catch {
      await delay(400);
      let tokens = [...MOCK_TOKENS];
      if (params?.search) {
        const q = params.search.toLowerCase();
        tokens = tokens.filter((t) => t.name.toLowerCase().includes(q) || t.symbol.toLowerCase().includes(q));
      }
      if (params?.sort === "trending") tokens.sort((a, b) => (b.isTrending ? 1 : 0) - (a.isTrending ? 1 : 0));
      if (params?.sort === "volume") tokens.sort((a, b) => b.volume24h - a.volume24h);
      if (params?.sort === "marketcap") tokens.sort((a, b) => b.marketCap - a.marketCap);
      return { tokens, total: tokens.length, hasMore: false };
    }
  },

  async getTrendingTokens(): Promise<TokenListResponse> {
    try {
      return await request<TokenListResponse>("/tokens/trending");
    } catch {
      await delay(300);
      const tokens = MOCK_TOKENS.filter((t) => t.isTrending);
      return { tokens, total: tokens.length, hasMore: false };
    }
  },

  async getToken(id: string): Promise<Token> {
    try {
      return await request<Token>(`/tokens/${id}`);
    } catch {
      await delay(300);
      const token = MOCK_TOKENS.find((t) => t.id === id);
      if (!token) throw new Error("Token not found");
      return token;
    }
  },

  async getTokenActivity(id: string, limit = 20): Promise<ActivityListResponse> {
    try {
      return await request<ActivityListResponse>(`/tokens/${id}/activity?limit=${limit}`);
    } catch {
      await delay(300);
      const activities = MOCK_ACTIVITY.filter((a) => a.tokenId === id);
      return { activities, total: activities.length };
    }
  },

  async buyToken(body: BuyRequest): Promise<TransactionResult> {
    try {
      return await request<TransactionResult>("/buy", { method: "POST", body: JSON.stringify(body) });
    } catch {
      await delay(1200);
      const token = MOCK_TOKENS.find((t) => t.id === body.tokenId);
      return {
        success: true,
        txHash: `0x${Math.random().toString(16).slice(2, 18)}`,
        amount: body.currency === "USDC" ? body.amount / (token?.priceUsdc ?? 0.1) : body.amount / (token?.priceWld ?? 0.03),
        price: body.currency === "USDC" ? token?.priceUsdc : token?.priceWld,
        total: body.amount,
        message: "Purchase successful",
      };
    }
  },

  async sellToken(body: SellRequest): Promise<TransactionResult> {
    try {
      return await request<TransactionResult>("/sell", { method: "POST", body: JSON.stringify(body) });
    } catch {
      await delay(1000);
      return {
        success: true,
        txHash: `0x${Math.random().toString(16).slice(2, 18)}`,
        amount: body.amount,
        message: "Sell successful",
      };
    }
  },

  async getAirdrops(): Promise<AirdropListResponse> {
    try {
      return await request<AirdropListResponse>("/airdrops");
    } catch {
      await delay(400);
      return { airdrops: MOCK_AIRDROPS, total: MOCK_AIRDROPS.length };
    }
  },

  async getAirdrop(id: string): Promise<Airdrop> {
    try {
      return await request<Airdrop>(`/airdrops/${id}`);
    } catch {
      await delay(300);
      const a = MOCK_AIRDROPS.find((x) => x.id === id);
      if (!a) throw new Error("Airdrop not found");
      return a;
    }
  },

  async claimAirdrop(body: ClaimAirdropRequest): Promise<ClaimResult> {
    try {
      return await request<ClaimResult>("/claim-airdrop", { method: "POST", body: JSON.stringify(body) });
    } catch {
      await delay(900);
      const airdrop = MOCK_AIRDROPS.find((a) => a.id === body.airdropId);
      return {
        success: true,
        amount: airdrop?.dailyAmount ?? 10,
        nextClaimAt: new Date(Date.now() + (airdrop?.cooldownHours ?? 24) * 3600 * 1000).toISOString(),
        message: `Claimed ${airdrop?.dailyAmount ?? 10} ${airdrop?.tokenSymbol}!`,
      };
    }
  },

  async getUser(userId: string): Promise<UserProfile> {
    try {
      return await request<UserProfile>(`/user?user_id=${userId}`);
    } catch {
      await delay(400);
      return {
        id: userId,
        username: "worlduser.eth",
        balanceUsdc: 380.0,
        balanceWld: 142.5,
        totalValue: 522.5,
        tokensCreated: 0,
        tokensHeld: 2,
        joinedAt: new Date().toISOString(),
      };
    }
  },

  async getUserHoldings(userId: string): Promise<HoldingsResponse> {
    try {
      return await request<HoldingsResponse>(`/user/holdings?user_id=${userId}`);
    } catch {
      await delay(400);
      const totalValue = MOCK_HOLDINGS.reduce((s, h) => s + h.value, 0);
      const totalPnl = MOCK_HOLDINGS.reduce((s, h) => s + h.pnl, 0);
      return {
        holdings: MOCK_HOLDINGS,
        totalValue,
        totalPnl,
        totalPnlPercent: (totalPnl / (totalValue - totalPnl)) * 100,
      };
    }
  },

  async getUserActivity(userId: string): Promise<ActivityListResponse> {
    try {
      return await request<ActivityListResponse>(`/user/activity?user_id=${userId}`);
    } catch {
      await delay(300);
      return { activities: MOCK_ACTIVITY, total: MOCK_ACTIVITY.length };
    }
  },

  async createToken(body: CreateTokenRequest): Promise<Token> {
    try {
      return await request<Token>("/creator/tokens", { method: "POST", body: JSON.stringify(body) });
    } catch {
      await delay(1400);
      return {
        id: `tkn_${Math.random().toString(36).slice(2, 8)}`,
        name: body.name,
        symbol: body.symbol,
        emoji: body.emoji ?? "🌟",
        creatorId: body.creatorId,
        creatorName: "you.eth",
        priceWld: 0.001,
        priceUsdc: 0.003,
        marketCap: 3000,
        holders: 1,
        curvePercent: 0,
        change24h: 0,
        volume24h: 0,
        totalSupply: body.totalSupply,
        circulatingSupply: body.totalSupply * (1 - (body.lockPercent ?? 60) / 100),
        lockedSupply: body.totalSupply * ((body.lockPercent ?? 60) / 100),
        burnedSupply: 0,
        lockDurationDays: body.lockDurationDays ?? 90,
        description: body.description,
        createdAt: new Date().toISOString(),
        isTrending: false,
        tags: [],
        buyPressure: 50,
      };
    }
  },
};
