import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "../../../src/supabaseClient";

export interface MonetizationSettings {
  ads_enabled: boolean;
  sponsorships_enabled: boolean;
  ad_category: string;
}

const DEFAULTS: MonetizationSettings = {
  ads_enabled: true,
  sponsorships_enabled: false,
  ad_category: "Sin preferencia",
};

export function useMonetizationSettings(userId: string | null | undefined) {
  const [settings, setSettings] = useState<MonetizationSettings>(DEFAULTS);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSettings = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("profiles")
        .select("ads_enabled, sponsorships_enabled, ad_category")
        .eq("id", userId)
        .single();
      if (data) {
        setSettings({
          ads_enabled: data.ads_enabled ?? DEFAULTS.ads_enabled,
          sponsorships_enabled: data.sponsorships_enabled ?? DEFAULTS.sponsorships_enabled,
          ad_category: data.ad_category ?? DEFAULTS.ad_category,
        });
      }
    } catch {
      // columns may not exist — keep defaults
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const updateSettings = useCallback((patch: Partial<MonetizationSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (!userId) return;
      try {
        await supabase.from("profiles").update(patch).eq("id", userId);
      } catch {
        // columns may not exist — silently fail, local state is already updated
      }
    }, 600);
  }, [userId]);

  return { settings, loading, updateSettings };
}
