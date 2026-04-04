import { useState, useEffect, useCallback } from "react";
import { api, type ClaimAirdropRequest, type ClaimResult } from "@/services/api";
import type { Airdrop } from "@/services/mockData";

interface UseAirdropsResult {
  airdrops: Airdrop[];
  total: number;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  claim: (request: ClaimAirdropRequest) => Promise<ClaimResult>;
  claiming: boolean;
}

export function useAirdrops(): UseAirdropsResult {
  const [airdrops, setAirdrops] = useState<Airdrop[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getAirdrops();
      setAirdrops(result.airdrops);
      setTotal(result.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load airdrops");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const claim = async (request: ClaimAirdropRequest): Promise<ClaimResult> => {
    setClaiming(true);
    try {
      const result = await api.claimAirdrop(request);
      if (result.success) {
        setAirdrops((prev) =>
          prev.map((a) =>
            a.id === request.airdropId
              ? {
                  ...a,
                  userClaimedAt: new Date().toISOString(),
                  claimedAmount: a.claimedAmount + (a.dailyAmount ?? 0),
                  participants: a.participants + 1,
                  userTotalClaimed: (a.userTotalClaimed ?? 0) + (a.dailyAmount ?? 0),
                }
              : a
          )
        );
      }
      return result;
    } catch (e) {
      return { success: false, message: e instanceof Error ? e.message : "Claim failed" };
    } finally {
      setClaiming(false);
    }
  };

  return { airdrops, total, loading, error, refetch: fetch, claim, claiming };
}
