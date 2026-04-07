import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";
const supabase = createClient(supabaseUrl, supabaseKey);

const impressionCache = new Set<string>();
const clickCache = new Set<string>();

interface UserData {
  country?: string | null;
  language?: string | null;
  interests?: string[] | null;
}

interface TrackParams {
  postId: string;
  campaignId?: string | null;
  userId?: string | null;
  userData?: UserData | null;
}

export async function trackImpression({
  postId,
  campaignId,
  userData,
}: TrackParams) {
  try {
    if (!postId || !campaignId) return;

    if (impressionCache.has(postId)) return;
    impressionCache.add(postId);

    await supabase.from("ad_metrics").insert({
      post_id: postId,
      campaign_id: campaignId,
      type: "impression",
      value: 0.001,
      creator_earning: 0.001 * 0.7,
      platform_earning: 0.001 * 0.3,
      country: userData?.country || navigator.language || "unknown",
      language: userData?.language || navigator.language || "unknown",
      interests: userData?.interests || null,
      created_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error("[tracking] impression error", e);
  }
}

export async function trackClick({
  postId,
  campaignId,
  userId,
  userData,
}: TrackParams) {
  try {
    if (!postId || !campaignId) return;

    if (clickCache.has(postId)) return;
    clickCache.add(postId);

    const { data: campaign, error } = await supabase
      .from("campaigns")
      .select("cpc")
      .eq("id", campaignId)
      .single();

    if (error || !campaign) {
      console.warn("[tracking] Campaign not found");
      return;
    }

    const cpc = campaign.cpc || 0;
    const creatorShare = cpc * 0.7;
    const platformShare = cpc * 0.3;

    await supabase.from("ad_metrics").insert({
      post_id: postId,
      campaign_id: campaignId,
      user_id: userId,
      type: "click",
      value: cpc,
      creator_earning: creatorShare,
      platform_earning: platformShare,
      country: userData?.country || navigator.language || "unknown",
      language: userData?.language || navigator.language || "unknown",
      interests: userData?.interests || null,
      created_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error("[tracking] click error", e);
  }
}
