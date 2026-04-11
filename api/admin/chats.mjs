import { supabase, adminAuth, cors } from "./_auth.mjs";

export default async function handler(req, res) {
  cors(res, req);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (!adminAuth(req, res)) return;

  const userId = req.query?.userId;
  const type = req.query?.type || "all";
  const page = parseInt(req.query?.page || "0");
  const limit = 50;

  if (!userId) return res.status(400).json({ error: "Missing userId" });

  try {
    const results = {};

    if (type === "all" || type === "dm") {
      const { data: dms } = await supabase
        .from("dm_messages")
        .select("id, conversation_id, sender_id, content, created_at")
        .eq("sender_id", userId)
        .order("created_at", { ascending: false })
        .range(page * limit, page * limit + limit - 1);
      results.dms = dms || [];
    }

    if (type === "all" || type === "global") {
      const { data: global } = await supabase
        .from("global_chat_messages")
        .select("id, room_id, user_id, username, content, type, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range(page * limit, page * limit + limit - 1);
      results.globalChats = global || [];
    }

    if (type === "conversation") {
      const convoId = req.query?.conversationId;
      if (!convoId) return res.status(400).json({ error: "Missing conversationId" });
      const { data: msgs } = await supabase
        .from("dm_messages")
        .select("id, conversation_id, sender_id, content, created_at")
        .eq("conversation_id", convoId)
        .order("created_at", { ascending: true })
        .limit(100);
      results.conversation = msgs || [];
    }

    return res.status(200).json(results);
  } catch (err) {
    console.error("[ADMIN/CHATS]", err.message);
    return res.status(500).json({ error: "Internal error" });
  }
}
