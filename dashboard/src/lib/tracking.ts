import { supabase } from "../../../src/supabaseClient";

/**
 * 🔒 Anti-duplicate memory (solo sesión actual)
 */
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

/**
 * 👁️ TRACK IMPRESSION
 */
export async function trackImpression({
  postId,
  campaignId,
  userData,
}: TrackParams) {
  try {
    if (!postId || !campaignId) return;

    // 🔒 evitar duplicados frontend
    if (impressionCache.has(postId)) return;
    impressionCache.add(postId);

    await supabase.from("ad_metrics").insert({
    
  post_id: postId,
  campaign_id: campaignId,
  type: "impression",
  value: 0.001,

  // 💰 reparto (igual que en clicks, pero fijo)
  creator_earning: 0.001 * 0.7,
  platform_earning: 0.001 * 0.3,

  country: userData?.country || navigator.language || "unknown",
  language: userData?.language || navigator.language || "unknown",
  interests: userData?.interests || null,

  created_at: new Date().toISOString(),
});
  } catch (e) {
    console.error("❌ impression error", e);
  }
}

/**
 * 🖱️ TRACK CLICK
 */
export async function trackClick({
  postId,
  campaignId,
  userId,
  userData,
}: TrackParams) {
  try {
    if (!postId || !campaignId) return;

    // 🔒 evitar doble click spam
    if (clickCache.has(postId)) return;
    clickCache.add(postId);

    // 🔎 obtener campaña real
    const { data: campaign, error } = await supabase
      .from("campaigns")
      .select("cpc")
      .eq("id", campaignId)
      .single();

    if (error || !campaign) {
      console.log("NO CAMPAIGN ❌");
      return;
    }

    const cpc = campaign.cpc || 0;

    // 💰 reparto
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
    console.error("❌ click error", e);
  }
}
