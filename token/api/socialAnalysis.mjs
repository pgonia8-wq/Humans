import { supabase, cors } from "./_supabase.mjs";

export default async function handler(req, res) {
  cors(res, req);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const creatorId = req.query.creatorId;
  if (!creatorId) return res.status(400).json({ error: "creatorId required" });

  try {
    const [profileRes, postsRes, boostedRes, campaignRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, username, avatar_url, is_verified, orb_verified, created_at, followers_count, following_count")
        .eq("id", creatorId)
        .maybeSingle(),

      supabase
        .from("posts")
        .select("id, content, likes, comments, reposts, tips_total, boost_score, is_boosted, boosted_until, is_ad, campaign_id, created_at, views")
        .eq("user_id", creatorId)
        .eq("deleted_flag", false)
        .order("created_at", { ascending: false })
        .limit(100),

      supabase
        .from("posts")
        .select("id")
        .eq("user_id", creatorId)
        .eq("is_boosted", true)
        .gte("boosted_until", new Date().toISOString()),

      supabase
        .from("posts")
        .select("id")
        .eq("user_id", creatorId)
        .eq("is_ad", true),
    ]);

    const profile = profileRes.data;
    const posts = postsRes.data || [];
    const activeBoosted = boostedRes.data || [];
    const campaignPosts = campaignRes.data || [];

    const now = Date.now();
    const oneWeek = 7 * 24 * 3600000;
    const oneMonth = 30 * 24 * 3600000;

    const postsThisWeek = posts.filter(p => now - new Date(p.created_at).getTime() < oneWeek).length;
    const postsThisMonth = posts.filter(p => now - new Date(p.created_at).getTime() < oneMonth).length;

    const totalLikes = posts.reduce((s, p) => s + (p.likes || 0), 0);
    const totalComments = posts.reduce((s, p) => s + (p.comments || 0), 0);
    const totalReposts = posts.reduce((s, p) => s + (p.reposts || 0), 0);
    const totalTips = posts.reduce((s, p) => s + (p.tips_total || 0), 0);
    const totalViews = posts.reduce((s, p) => s + (p.views || 0), 0);
    const totalBoostScore = posts.reduce((s, p) => s + (p.boost_score || 0), 0);

    const engagementRate = posts.length > 0
      ? (totalLikes + totalComments * 2 + totalReposts * 3 + totalTips * 5) / posts.length
      : 0;

    let activityTrend = "inactive";
    if (postsThisWeek >= 5) activityTrend = "increasing";
    else if (postsThisWeek >= 2) activityTrend = "stable";
    else if (postsThisMonth >= 3) activityTrend = "decreasing";

    let tier = "Nuevo";
    if (posts.length >= 100 && engagementRate > 10) tier = "Influencer";
    else if (posts.length >= 50 && engagementRate > 5) tier = "Activo Pro";
    else if (posts.length >= 20) tier = "Activo";
    else if (posts.length >= 5) tier = "Regular";

    let socialScore = 0;
    if (profile?.orb_verified) socialScore += 20;
    if (posts.length >= 5) socialScore += 10;
    if (posts.length >= 20) socialScore += 10;
    if (posts.length >= 50) socialScore += 5;
    if (postsThisWeek >= 2) socialScore += 15;
    if (postsThisWeek >= 5) socialScore += 10;
    if (engagementRate >= 3) socialScore += 10;
    if (engagementRate >= 10) socialScore += 10;
    if (totalTips > 0) socialScore += 5;
    if ((profile?.followers_count || 0) >= 10) socialScore += 5;
    if ((profile?.followers_count || 0) >= 50) socialScore += 5;
    if (activeBoosted.length > 0) socialScore += 5;
    socialScore = Math.min(100, socialScore);

    const fomoSignals = [];
    if (postsThisWeek >= 5) fomoSignals.push("Creador MUY activo esta semana (" + postsThisWeek + " posts)");
    if (activeBoosted.length > 0) fomoSignals.push("Creador invirtiendo en visibilidad (" + activeBoosted.length + " posts boosteados)");
    if (campaignPosts.length > 0) fomoSignals.push("Ha lanzado " + campaignPosts.length + " campaña(s) publicitaria(s)");
    if (totalTips > 0) fomoSignals.push("Comunidad activa: ha recibido " + totalTips.toFixed(2) + " WLD en propinas");
    if (engagementRate >= 10) fomoSignals.push("Engagement altísimo: " + engagementRate.toFixed(1) + " interacciones/post");
    if (profile?.orb_verified) fomoSignals.push("Creador verificado con Orb — identidad real confirmada");
    if ((profile?.followers_count || 0) >= 50) fomoSignals.push("Comunidad sólida: " + profile.followers_count + " seguidores");
    if (tier === "Influencer") fomoSignals.push("Creador nivel INFLUENCER en la red social");

    const warnings = [];
    if (posts.length === 0) warnings.push("Creador sin actividad en la red social");
    if (postsThisMonth === 0 && posts.length > 0) warnings.push("Creador inactivo hace más de un mes");
    if (!profile?.orb_verified) warnings.push("Creador sin verificación Orb");
    if ((profile?.followers_count || 0) < 5 && posts.length < 3) warnings.push("Presencia social mínima");

    return res.status(200).json({
      creatorId,
      profile: profile ? {
        username: profile.username,
        avatarUrl: profile.avatar_url,
        isVerified: profile.is_verified,
        orbVerified: profile.orb_verified,
        followersCount: profile.followers_count || 0,
        followingCount: profile.following_count || 0,
        accountAge: Math.floor((now - new Date(profile.created_at).getTime()) / (24 * 3600000)),
      } : null,
      stats: {
        totalPosts: posts.length,
        postsThisWeek,
        postsThisMonth,
        totalLikes,
        totalComments,
        totalReposts,
        totalTips,
        totalViews,
        totalBoostScore,
        activeBoostedPosts: activeBoosted.length,
        campaignPosts: campaignPosts.length,
        engagementRate: Math.round(engagementRate * 10) / 10,
        activityTrend,
        tier,
      },
      socialScore,
      fomoSignals,
      warnings,
    });
  } catch (err) {
    console.error("[SOCIAL_ANALYSIS] Error:", err.message);
    return res.status(500).json({ error: "Internal error" });
  }
}
