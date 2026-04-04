import { useState } from "react";
import { api, type SellRequest, type TransactionResult } from "@/services/api";

interface UseSellResult {
  sell: (request: SellRequest) => Promise<TransactionResult>;
  loading: boolean;
  error: string | null;
  result: TransactionResult | null;
  reset: () => void;
}

export function useSell(): UseSellResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TransactionResult | null>(null);

  const sell = async (request: SellRequest): Promise<TransactionResult> => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.sellToken(request);
      setResult(res);
      return res;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Sell failed";
      setError(msg);
      const failed: TransactionResult = { success: false, message: msg };
      setResult(failed);
      return failed;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setError(null);
    setResult(null);
  };

  return { sell, loading, error, result, reset };
}
