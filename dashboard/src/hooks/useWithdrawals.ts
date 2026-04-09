import { useState, useCallback, useEffect } from "react";
  import { supabase } from "../../../src/supabaseClient";

  export interface Withdrawal {
    id: string;
    user_id: string;
    amount: number;
    wallet_address: string;
    currency: string;
    status: "pending" | "processing" | "completed" | "failed";
    tx_hash?: string;
    created_at: string;
  }

  export interface CreateWithdrawalInput {
    amount: number;
    wallet_address: string;
    currency: "WLD" | "USDC";
  }

  export function useWithdrawals(userId: string | null | undefined) {
    const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchWithdrawals = useCallback(async () => {
      if (!userId) return;
      setLoading(true);
      try {
        const { data } = await supabase
          .from("withdrawals")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });
        setWithdrawals(data ?? []);
      } catch {
        setWithdrawals([]);
      } finally {
        setLoading(false);
      }
    }, [userId]);

    useEffect(() => { fetchWithdrawals(); }, [fetchWithdrawals]);

    const createWithdrawal = useCallback(async (input: CreateWithdrawalInput): Promise<boolean> => {
      if (!userId) return false;

      const optimistic: Withdrawal = {
        id: `temp-${Date.now()}`,
        user_id: userId,
        amount: input.amount,
        wallet_address: input.wallet_address,
        currency: input.currency,
        status: "processing",
        created_at: new Date().toISOString(),
      };
      setWithdrawals((prev) => [optimistic, ...prev]);

      try {
        const apiBase = import.meta.env.VITE_API_URL || "";
        const res = await fetch(`${apiBase}/api/withdraw`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            amount: input.amount,
            wallet: input.wallet_address,
          }),
        });

        const result = await res.json();

        if (!res.ok || !result.success) {
          setWithdrawals((prev) => prev.map((w) =>
            w.id === optimistic.id ? { ...w, status: "failed" as const } : w
          ));
          return false;
        }

        setWithdrawals((prev) => prev.map((w) =>
          w.id === optimistic.id
            ? { ...w, status: "completed" as const, tx_hash: result.txHash, id: `confirmed-${Date.now()}` }
            : w
        ));

        await fetchWithdrawals();
        return true;
      } catch {
        setWithdrawals((prev) => prev.map((w) =>
          w.id === optimistic.id ? { ...w, status: "failed" as const } : w
        ));
        return false;
      }
    }, [userId, fetchWithdrawals]);

    return { withdrawals, loading, createWithdrawal };
  }
