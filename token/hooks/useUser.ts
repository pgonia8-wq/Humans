import { useState, useEffect, useCallback } from "react";
import { api, type UserProfile, type HoldingsResponse } from "@/services/api";

interface UseUserResult {
  profile: UserProfile | null;
  holdings: HoldingsResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useUser(userId: string | null): UseUserResult {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [holdings, setHoldings] = useState<HoldingsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const [profileRes, holdingsRes] = await Promise.all([
        api.getUser(userId),
        api.getUserHoldings(userId),
      ]);
      setProfile(profileRes);
      setHoldings(holdingsRes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load user");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { profile, holdings, loading, error, refetch: fetch };
}
