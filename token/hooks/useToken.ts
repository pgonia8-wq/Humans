import { useState, useEffect, useCallback } from "react";
import { api } from "@/services/api";
import type { Token } from "@/services/mockData";

interface UseTokenResult {
  token: Token | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useToken(id: string | null): UseTokenResult {
  const [token, setToken] = useState<Token | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const result = await api.getToken(id);
      setToken(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load token");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetch(); }, [fetch]);

  return { token, loading, error, refetch: fetch };
}
