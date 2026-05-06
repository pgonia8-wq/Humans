import { createClient } from "@supabase/supabase-js";
import { rateLimit } from "./lib/rateLimiter.adapter.mjs";
import { requireSession } from "./_session.mjs";

if (!process.env.SUPABASE_URL) {
  console.error("[VERIFY_ORB] ERROR: SUPABASE_URL not configured");
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("[VERIFY_ORB] ERROR: SUPABASE_SERVICE_ROLE_KEY not configured");
}

const supabase = createClient(
  process.env.SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
);

const APP_ID = process.env.APP_ID ?? "";
const ORB_ACTION_ID = process.env.WORLDCOIN_ORB_ACTION_ID ?? "user-orb";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (rateLimit(req, { max: 10, windowMs: 60000 }).limited) {
    return res.status(429).json({ success: false, error: "Too many requests" });
