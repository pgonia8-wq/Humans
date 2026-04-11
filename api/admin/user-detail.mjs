import { supabase, adminAuth, cors } from "./_auth.mjs";

export default async function handler(req, res) {
  cors(res, req);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (!adminAuth(req, res)) return;

  const userId = req.query?.userId;
  if (!userId) return res.status(400).json({ error: "Missing userId" });

  try {
    const [
      { data: profile },
      { data: posts },
      { data: trades },
      { data: holdings },
      { data: reports },
      { data: dms },
      { data: globalChats },
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("posts").select("id, content, image_url, likes, views, created_at").eq("author_id", userId).order("created_at", { ascending: false }).limit(20),
      supabase.from("token_activity").select("type, token_symbol, amount, price, total, timestamp").eq("user_id", userId).order("timestamp", { ascending: false }).limit(30),
      supabase.from("holdings").select("token_id, token_symbol, amount, value, pnl").eq("user_id", userId),
      supabase.from("reports").select("id, reporter_id, reason, status, created_at, post_id").or(`user_id.eq.${userId},reporter_id.eq.${userId}`).order("created_at", { ascending: false }).limit(20),
      supabase.from("dm_messages").select("id, conversation_id, content, created_at").eq("sender_id", userId).order("created_at", { ascending: false }).limit(30),
      supabase.from("global_chat_messages").select("id, room_id, content, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(30),
    ]);

    if (!profile) return res.status(404).json({ error: "User not found" });

    return res.status(200).json({
      profile,
      posts: posts || [],
      trades: trades || [],
      holdings: holdings || [],
      reports: reports || [],
      messages: {
        dms: dms || [],
        globalChats: globalChats || [],
      },
    });
  } catch (err) {
    console.error("[ADMIN/USER-DETAIL]", err.message);
    return res.status(500).json({ error: "Internal error" });
  }
}
