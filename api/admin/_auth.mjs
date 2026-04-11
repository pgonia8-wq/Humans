import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
);

export { supabase };

export function adminAuth(req, res) {
  const key = req.headers["x-admin-key"] || req.query?.key;
  if (!key || key !== process.env.ADMIN_SECRET) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

export async function writeLog({ category = "activity", event, severity = "info", user_id, username, details = {}, endpoint, latency_ms }) {
  try {
    await supabase.from("admin_logs").insert({
      category, event, severity, user_id: user_id || null, username: username || null,
      details: typeof details === "object" ? details : { raw: details },
      endpoint: endpoint || null, latency_ms: latency_ms || null,
    });
  } catch (e) {
    console.error("[WRITE_LOG]", e.message);
  }
}

export function cors(res, req) {
  const origin = req?.headers?.origin || "";
  const allowed = (process.env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
  if (allowed.length > 0 && origin && allowed.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-admin-key");
}
