/**
 * GET /api/totem/profile?address=<0x...>
 *
 * Perfil completo de un Totem. SIEMPRE responde JSON válido.
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

export default async function handler(req, res) {
  try {
    const address = String(req.query?.address ?? "").toLowerCase().trim();
    if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
      return res.status(400).json({ error: "address inválida" });
    }

    const { data, error } = await supabase
      .from("totems")
      .select("address, name, score, influence, level, badge, price, supply, volume_24h, created_at")
      .eq("address", address)
      .maybeSingle();

    if (error) {
      console.error("[/api/totem/profile] supabase error:", error.message);
      return res.status(500).json({ error: error.message });
    }
    if (!data) {
      return res.status(404).json({ error: "Totem no encontrado" });
    }

    return res.status(200).json({
      address:    data.address,
      name:       data.name        ?? "",
      score:      Number(data.score      ?? 0),
      influence:  Number(data.influence  ?? 0),
      level:      Number(data.level      ?? 1),
      badge:      data.badge       ?? "",
      price:      Number(data.price      ?? 0),
      supply:     Number(data.supply     ?? 0),
      volume_24h: Number(data.volume_24h ?? 0),
      created_at: data.created_at  ?? new Date().toISOString(),
    });
  } catch (err) {
    console.error("[/api/totem/profile] unhandled:", err);
    return res.status(500).json({ error: err?.message ?? "internal error" });
  }
}
