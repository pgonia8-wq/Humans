import type {
  Token, TokenDetail, TokenListResponse,
  HoldingsResponse, ActivityListResponse, UserProfile, HolderInfo,
  BuyRequest, BuyResult, SellRequest, SellResult,
  CreateTokenRequest, UploadResult, GraduateResult, PriceHistoryResponse,
  LockRequest, LockResult, BurnRequest, BurnResult,
  BuyPoolRequest, BuyPoolResult, CreateLinkRequest, CreateLinkResult,
  DeleteLinkRequest, DeleteLinkResult, AirdropDataResponse,
  RedeemAirdropRequest, RedeemAirdropResult,
} from "./types";

const BASE = import.meta.env.VITE_API_BASE || "/api";

let _currentUserId: string | null = null;
export function setApiUserId(userId: string | null) {
  _currentUserId = userId;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string> ?? {}),
  };
  if (_currentUserId) {
    headers["x-user-id"] = _currentUserId;
  }
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  async getTokens(params?: { search?: string; sort?: string; limit?: number; offset?: number; filter?: string }): Promise<TokenListResponse> {
    const qs = new URLSearchParams();
    if (params?.search) qs.set("search", params.search);
    if (params?.sort) qs.set("sort", params.sort);
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.offset) qs.set("offset", String(params.offset));
    if (params?.filter) qs.set("filter", params.filter);
    const qstr = qs.toString();
    return request<TokenListResponse>(`/tokens${qstr ? `?${qstr}` : ""}`);
  },

  async getTrendingTokens(): Promise<TokenListResponse> {
    return request<TokenListResponse>("/tokens?filter=trending");
  },

  async getToken(id: string): Promise<TokenDetail> {
    return request<TokenDetail>(`/tokens/${id}`);
  },

  async getTokenHolders(tokenId: string): Promise<HolderInfo[]> {
    return request<HolderInfo[]>(`/tokens/${tokenId}/holders`);
  },

  async getTokenActivity(id: string, limit = 50): Promise<ActivityListResponse> {
    return request<ActivityListResponse>(`/tokens/${id}/activity?limit=${limit}`);
  },

  async buyToken(body: BuyRequest): Promise<BuyResult> {
    return request<BuyResult>(`/tokens/${body.tokenId}/buy`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async sellToken(body: SellRequest): Promise<SellResult> {
    return request<SellResult>(`/tokens/${body.tokenId}/sell`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async graduateToken(tokenId: string): Promise<GraduateResult> {
    return request<GraduateResult>(`/tokens/${tokenId}/graduate`, {
      method: "POST",
      body: JSON.stringify({ tokenId }),
    });
  },

  async uploadAvatar(imageBase64: string, userId: string, target: "token" | "user", targetId?: string, fileName?: string): Promise<UploadResult> {
    return request<UploadResult>("/upload", {
      method: "POST",
      body: JSON.stringify({ imageBase64, userId, target, targetId, fileName }),
    });
  },

  async getUser(userId: string): Promise<UserProfile> {
    return request<UserProfile>(`/user?user_id=${userId}`);
  },

  async updateProfile(userId: string, data: { username?: string; bio?: string; avatarUrl?: string }): Promise<UserProfile> {
    return request<UserProfile>(`/user/profile`, {
      method: "PUT",
      body: JSON.stringify({ userId, ...data }),
    });
  },

  async getUserHoldings(userId: string): Promise<HoldingsResponse> {
    return request<HoldingsResponse>(`/user/holdings?user_id=${userId}`);
  },

  async getUserActivity(userId: string): Promise<ActivityListResponse> {
    return request<ActivityListResponse>(`/user/activity?user_id=${userId}`);
  },

  async createToken(body: CreateTokenRequest): Promise<Token> {
    return request<Token>("/tokens", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async verifyOrb(payload: Record<string, unknown>, userId: string): Promise<{ success: boolean; nullifier_hash: string; orbVerified: boolean; reused?: boolean }> {
    return request(`/verifyOrb`, {
      method: "POST",
      body: JSON.stringify({ payload, userId }),
    });
  },

  async checkOrbStatus(userId: string): Promise<{ orbVerified: boolean; verified: boolean; reason?: string }> {
    return request(`/checkOrbStatus?userId=${encodeURIComponent(userId)}`);
  },

  async getPriceHistory(tokenId: string, period: string = "24h"): Promise<PriceHistoryResponse> {
    return request<PriceHistoryResponse>(`/tokens/${tokenId}/priceHistory?period=${period}`);
  },

  async lockTokens(body: LockRequest): Promise<LockResult> {
    return request<LockResult>(`/tokens/${body.tokenId}/lock`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async burnTokens(body: BurnRequest): Promise<BurnResult> {
    return request<BurnResult>(`/tokens/${body.tokenId}/burn`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async buyAirdropPool(body: BuyPoolRequest): Promise<BuyPoolResult> {
    return request<BuyPoolResult>("/airdropLinks", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async createAirdropLink(body: CreateLinkRequest): Promise<CreateLinkResult> {
    return request<CreateLinkResult>("/airdropLinks", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async deleteAirdropLink(body: DeleteLinkRequest): Promise<DeleteLinkResult> {
    return request<DeleteLinkResult>("/airdropLinks", {
      method: "DELETE",
      body: JSON.stringify(body),
    });
  },

  async getAirdropData(creatorId: string): Promise<AirdropDataResponse> {
    return request<AirdropDataResponse>(`/airdropLinks?creator=${encodeURIComponent(creatorId)}`);
  },

  async redeemAirdrop(body: RedeemAirdropRequest): Promise<RedeemAirdropResult> {
    return request<RedeemAirdropResult>("/airdropRedeem", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async getCreatorTokens(creatorId: string): Promise<TokenListResponse> {
    return request<TokenListResponse>(`/tokens?creator=${encodeURIComponent(creatorId)}`);
  },

  async getWldRate(): Promise<{ rate: number; ts: number }> {
    return request<{ rate: number; ts: number }>("/wldRate");
  },
};

export type { TokenListResponse, BuyRequest, SellRequest };
