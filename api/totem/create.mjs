/**
 * POST /api/totem/create
 * Body: { address, name, userId }
 *
 * Registra un Totem en la tabla `totems`. SIEMPRE responde JSON válido.
 *
 * NOTA: la creación on-chain real ocurre vía contrato; este endpoint solo
 * indexa el registro inicial cuando aún no existe en DB.
 */

import { createClient } from "@supabase/supabase-js";
import { spotPrice }    from "../lib/curve.mjs";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Método no permitido" });
    }

    const { address, name, userId } = req.body ?? {};

    if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
      return res.status(400).json({ error: "address inválida" });
    }
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return res.status(400).json({ error: "name requerido (mín. 2 caracteres)" });
    }
    if (!userId) {
      return res.status(400).json({ error: "userId requerido" });
    }

    const lower = address.toLowerCase();

    // Idempotencia: si ya existe, devolver el existente
    const { data: existing, error: selErr } = await supabase
      .from("totems")
      .select("address, name, score, influence, level, badge, price, supply, volume_24h, created_at")
      .eq("address", lower)
      .maybeSingle();

    if (selErr) {
      console.error("[/api/totem/create] select error:", selErr.message);
      return res.status(500).json({ error: selErr.message });
    }
    if (existing) {
      return res.status(200).json({
        address:    existing.address,
        name:       existing.name        ?? "",
        score:      Number(existing.score      ?? 0),
        influence:  Number(existing.influence  ?? 0),
        level:      Number(existing.level      ?? 1),
        badge:      existing.badge       ?? "",
        price:      Number(existing.price      ?? 0),
        supply:     Number(existing.supply     ?? 0),
        volume_24h: Number(existing.volume_24h ?? 0),
        created_at: existing.created_at  ?? new Date().toISOString(),
      });
    }

    const initialPrice = spotPrice(0);

    const { data, error } = await supabase
      .from("totems")
      .insert({
        address:    lower,
        name:       name.trim(),
        owner:      userId,
        score:      0,
        influence:  0,
        level:      1,
        badge:      "",
        price:      initialPrice,
        supply:     0,
        volume_24h: 0,
      })
      .select("address, name, score, influence, level, badge, price, supply, volume_24h, created_at")
      .single();

    if (error) {
      console.error("[/api/totem/create] insert error:", error.message);
      return res.status(500).json({ error: error.message });
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
    console.error("[/api/totem/create] unhandled:", err);
    return res.status(500).json({ error: err?.message ?? "internal error" });
  }
}
