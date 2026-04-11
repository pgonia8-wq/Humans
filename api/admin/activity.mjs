import { supabase, adminAuth, cors } from "./_auth.mjs";

export default async function handler(req, res) {
  cors(res, req);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (!adminAuth(req, res)) return;

  const limit = parseInt(req.query?.limit || "60");
  const since = req.query?.since || new Date(Date.now() - 3600000).toISOString();

  try {
    const [
      { data: trades },
      { data: posts },
      { data: adminActions },
      { data: reports },
      { data: logins },
    ] = await Promise.all([
      supabase
        .from("token_activity")
        .select("type, user_id, username, token_symbol, amount, total, price, timestamp")
        .gte("timestamp", since)
        .order("timestamp", { ascending: false })
        .limit(limit),
      supabase
        .from("posts")
        .select("id, user_id, content, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(limit),
      supabase
        .from("admin_logs")
        .select("*")
        .eq("category", "admin_action")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(limit),
      supabase
        .from("reports")
        .select("id, reporter_id, user_id, reason, status, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(limit),
      supabase
        .from("admin_logs")
        .select("*")
        .eq("category", "session")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(limit),
    ]);

    const feed = [];

    (trades || []).forEach(t => {
      const total = Number(t.total || 0);
      const isWhale = total > 80;
      const severity = total > 140 ? "critical" : total > 100 ? "warning" : "info";
      const icon = isWhale ? "🐋" : t.type === "buy" ? "🟢" : "🔴";
      const prefix = isWhale ? "[WHALE] " : "";
      feed.push({
        type: "trade",
        icon,
        msg: `${prefix}${t.username || t.user_id?.slice(0, 8)} ${t.type === "buy" ? "compró" : "vendió"} ${Number(t.amount).toLocaleString()} ${t.token_symbol} por ${total.toFixed(6)} WLD`,
        userId: t.user_id,
        severity,
        ts: t.timestamp,
      });
    });

    (posts || []).forEach(p => feed.push({
      type: "post",
      icon: "📝",
      msg: `${p.user_id?.slice(0, 8)} publicó: "${(p.content || "").slice(0, 80)}${(p.content || "").length > 80 ? "..." : ""}"`,
      userId: p.user_id,
      severity: "info",
      ts: p.created_at,
    }));

    (adminActions || []).forEach(a => feed.push({
      type: "admin",
      icon: "🛡️",
      msg: a.event + (a.details?.reason ? `: ${a.details.reason}` : ""),
      userId: a.user_id,
      severity: a.severity || "info",
      ts: a.created_at,
    }));

    (reports || []).forEach(r => feed.push({
      type: "report",
      icon: "🚨",
      msg: `Reporte ${r.status}: ${r.reason || "sin razón"} (reportado: ${r.user_id?.slice(0, 8)})`,
      userId: r.reporter_id,
      severity: r.status === "pending" ? "warning" : "info",
      ts: r.created_at,
    }));

    (logins || []).forEach(l => feed.push({
      type: "session",
      icon: "🔑",
      msg: l.event + (l.username ? ` - ${l.username}` : ""),
      userId: l.user_id,
      severity: "info",
      ts: l.created_at,
    }));

    feed.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());

    return res.status(200).json({ feed: feed.slice(0, limit * 2) });
  } catch (err) {
    console.error("[ADMIN/ACTIVITY]", err.message);
    return res.status(500).json({ error: "Internal error" });
  }
}
