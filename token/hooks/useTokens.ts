import { useState, useEffect, useCallback } from "react";
import { api, type TokenListResponse } from "@/services/api";
import type { Token } from "@/services/mockData";

interface UseTokensOptions {
  search?: string;
  sort?: "trending" | "new" | "marketcap" | "volume";
  limit?: number;
}

interface UseTokensResult {
  tokens: Token[];
  total: number;
  hasMore: boolean;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useTokens(options: UseTokensOptions = {}): UseTokensResult {
  const [data, setData] = useState<TokenListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getTokens(options);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load tokens");
    } finally {
      setLoading(false);
    }
  }, [options.search, options.sort, options.limit]);

  useEffect(() => { fetch(); }, [fetch]);

  return {
    tokens: data?.tokens ?? [],
    total: data?.total ?? 0,
    hasMore: data?.hasMore ?? false,
    loading,
    error,
    refetch: fetch,
  };
}
