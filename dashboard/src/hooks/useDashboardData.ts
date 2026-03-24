import { useState, useCallback, useEffect } from "react";
import { fetchDashboardData } from "../lib/fetchDashboardData";
import type { DashboardData } from "../lib/types";

interface UseDashboardDataResult {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
  isRefreshing: boolean;
  refresh: (silent?: boolean) => void;
}

export function useDashboardData(userId: string | null | undefined): UseDashboardDataResult {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(!!userId);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(async (silent = false) => {
    if (!userId) return;
    if (!silent) setLoading(true);
    else setIsRefreshing(true);
    setError(null);
    try {
      const result = await fetchDashboardData(userId);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar los datos.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [userId]);

  useEffect(() => { refresh(); }, [refresh]);

  return { data, loading, error, isRefreshing, refresh };
}
