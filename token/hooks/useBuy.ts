import { useState } from "react";
import { api, type BuyRequest, type TransactionResult } from "@/services/api";

interface UseBuyResult {
  buy: (request: BuyRequest) => Promise<TransactionResult>;
  loading: boolean;
  error: string | null;
  result: TransactionResult | null;
  reset: () => void;
}

export function useBuy(): UseBuyResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TransactionResult | null>(null);

  const buy = async (request: BuyRequest): Promise<TransactionResult> => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.buyToken(request);
      setResult(res);
      return res;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Purchase failed";
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

  return { buy, loading, error, result, reset };
}
