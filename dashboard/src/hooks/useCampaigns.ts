import { useState, useCallback, useEffect } from "react";
import { supabase } from "../../../src/supabaseClient";
import { MiniKit, tokenToDecimals, Tokens } from "@worldcoin/minikit-js";

export interface Campaign {
  id: string;
  user_id: string;
  name: string;
  budget: number;
  spent: number;
  status: "active" | "paused";
  created_at: string;
  clicks?: number;
  impressions?: number;
  transaction_id?: string;
}

export interface CreateCampaignInput {
  name: string;
  budget: number;
  category?: string;
}

const PAYMENT_RECEIVER = import.meta.env.VITE_PAYMENT_RECEIVER || "";
const API_BASE = import.meta.env.VITE_API_URL || "";

export function useCampaigns(userId: string | null | undefined) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCampaigns = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("campaigns")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      setCampaigns(data ?? []);
    } catch {
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  const createCampaign = useCallback(async (input: CreateCampaignInput): Promise<boolean> => {
    if (!userId) return false;

    try {
      const reference = `campaign_${userId}_${Date.now()}`;

      const payRes = await MiniKit.commandsAsync.pay({
        reference,
        to: PAYMENT_RECEIVER,
        tokens: [
          {
            symbol: Tokens.WLD,
            token_amount: tokenToDecimals(input.budget, Tokens.WLD).toString(),
          },
        ],
        description: `Campaign budget: ${input.name}`,
      });

      if (!payRes?.finalPayload || payRes.finalPayload.status !== "success") {
        console.error("[campaigns] Payment cancelled or failed");
        return false;
      }

      const verifyRes = await fetch(`${API_BASE}/api/verifyPayment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payload: payRes.finalPayload,
          action: "campaign_budget",
          userId,
          reference,
          campaignName: input.name,
          budget: input.budget,
        }),
      });

      const verifyResult = await verifyRes.json();
      if (!verifyRes.ok || !verifyResult.success) {
        console.error("[campaigns] Payment verification failed:", verifyResult);
        return false;
      }

      await fetchCampaigns();
      return true;
    } catch (err) {
      console.error("[campaigns] Campaign creation error:", err);
      return false;
    }
  }, [userId, fetchCampaigns]);

  const updateStatus = useCallback(async (id: string, status: "active" | "paused"): Promise<void> => {
    setCampaigns((prev) => prev.map((c) => c.id === id ? { ...c, status } : c));
    try {
      await supabase.from("campaigns").update({ status }).eq("id", id);
    } catch {
      const revert = status === "active" ? "paused" : "active";
      setCampaigns((prev) => prev.map((c) => c.id === id ? { ...c, status: revert } : c));
    }
  }, []);

  return { campaigns, loading, createCampaign, updateStatus, refetch: fetchCampaigns };
}
