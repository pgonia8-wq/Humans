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

const API_BASE = import.meta.env.VITE_API_URL || "";

export async function trackImpression({
  postId,
  campaignId,
  userData,
}: TrackParams) {
  try {
    if (!postId || !campaignId) return;
    if (impressionCache.has(postId)) return;
    impressionCache.add(postId);

    await fetch(`${API_BASE}/api/trackAd`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postId,
        campaignId,
        type: "impression",
        country: userData?.country || navigator.language || "unknown",
        language: userData?.language || navigator.language || "unknown",
        interests: userData?.interests || null,
      }),
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

    await fetch(`${API_BASE}/api/trackAd`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postId,
        campaignId,
        userId,
        type: "click",
        country: userData?.country || navigator.language || "unknown",
        language: userData?.language || navigator.language || "unknown",
        interests: userData?.interests || null,
      }),
    });
  } catch (e) {
    console.error("[tracking] click error", e);
  }
}
