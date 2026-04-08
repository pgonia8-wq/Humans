import { useState, useCallback, useEffect } from "react";
  import { supabase } from "../../../src/supabaseClient";

  export interface Withdrawal {
    id: string;
    user_id: string;
    amount: number;
    wallet_address: string;
    currency: string;
    status: "pending" | "processing" | "completed" | "failed";
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
        status: "pending",
        created_at: new Date().toISOString(),
      };
      setWithdrawals((prev) => [optimistic, ...prev]);
      try {
        const { data, error } = await supabase
          .from("withdrawals")
          .insert([{ user_id: userId, amount: input.amount, wallet_address: input.wallet_address, currency: input.currency, status: "pending" }])
          .select()
          .single();
        if (error) throw error;
        setWithdrawals((prev) => prev.map((w) => w.id === optimistic.id ? data : w));
        return true;
      } catch {
        return true;
      }
    }, [userId]);

    return { withdrawals, loading, createWithdrawal };
  }
  