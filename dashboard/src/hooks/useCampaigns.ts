import { useState, useCallback, useEffect } from "react";
import { supabase } from "../../../src/supabaseClient";

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
}

export interface CreateCampaignInput {
  name: string;
  budget: number;
  category?: string;
}

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
      const { data, error } = await supabase
        .from("campaigns")
        .insert([{ user_id: userId, name: input.name, budget: input.budget, spent: 0, status: "active" }])
        .select()
        .single();
      if (error) throw error;
      setCampaigns((prev) => [data, ...prev]);
      return true;
    } catch {
      return false;
    }
  }, [userId]);

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
