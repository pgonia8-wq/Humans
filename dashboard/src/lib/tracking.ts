import { supabase } from "../../../src/supabaseClient";

export async function trackImpression(postId: string, creatorId: string) {
  try {
    await supabase.from("ad_metrics").insert({
      post_id: postId,
      user_id: creatorId,
      type: "impression",
      value: 0.001,
      country: navigator.language || "unknown", // dinámico
      language: navigator.language || "unknown",
    });
  } catch (e) {
    console.error("impression error", e);
  }
}

export async function trackClick(postId: string) {
  try {
    // 🔎 traer post real
    const { data: post } = await supabase
      .from("posts")
      .select("id, user_id, campaign_id")
      .eq("id", postId)
      .single();

    if (!post || !post.campaign_id) {
      console.log("NO CAMPAIGN ❌");
      return;
    }

    // 🔎 traer campaña
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("cpc")
      .eq("id", post.campaign_id)
      .single();

    if (!campaign) {
      console.log("NO CAMPAIGN DATA ❌");
      return;
    }

    const cpc = campaign.cpc;

    // 💰 guardar con split
    await supabase.from("ad_metrics").insert({
      post_id: post.id,
      user_id: post.user_id,
      campaign_id: post.campaign_id,
      type: "click",
      value: cpc,
      creator_earning: cpc * 0.7,
      platform_earning: cpc * 0.3,
      country: navigator.language || "unknown",
      language: navigator.language || "unknown",
    });

  } catch (e) {
    console.error("click error", e);
  }
}
