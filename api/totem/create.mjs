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
import { requireOrbSession } from "../_orbGuard.mjs";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Método no permitido" });
    }

    // ── 1. Sesión + Orb (identidad probada server-side via HMAC) ──────────
    // Se IGNORA cualquier userId del body. La identidad sale del session
    // token (Authorization: Bearer ...) emitido por walletVerify tras SIWE.
    const guard = await requireOrbSession(supabase, req);
    if (!guard.ok) {
      return res.status(guard.status).json({ error: guard.error, code: guard.code });
    }
    const userId = guard.user.userId;

    // ── 2. Validación de inputs ───────────────────────────────────────────
    const { address, name } = req.body ?? {};

    if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
      return res.status(400).json({ error: "address inválida" });
    }
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return res.status(400).json({ error: "name requerido (mín. 2 caracteres)" });
    }

    const lower      = address.toLowerCase();
    const cleanName  = name.trim();

    // Idempotencia por address: si ya existe → devolver el existente con isOwner correcto
    const { data: existing, error: selErr } = await supabase
      .from("totems")
      .select("address, name, owner, score, influence, level, badge, price, supply, volume_24h, created_at")
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
        owner_id:   existing.owner       ?? null,
        isOwner:    existing.owner       === userId,
      });
    }

    // Unicidad de NOMBRE (case-insensitive). Bloquea colisiones de identidad.
    const { data: nameClash, error: nameErr } = await supabase
      .from("totems")
      .select("address")
      .ilike("name", cleanName)
      .limit(1)
      .maybeSingle();

    if (nameErr) {
      console.error("[/api/totem/create] name-check error:", nameErr.message);
      return res.status(500).json({ error: nameErr.message });
    }
    if (nameClash) {
      return res.status(409).json({ error: `El nombre "${cleanName}" ya está en uso. Elige otro.` });
    }

    const initialPrice = spotPrice(0);

    const { data, error } = await supabase
      .from("totems")
      .insert({
        address:    lower,
        name:       cleanName,
        owner:      userId,
        score:      0,
        influence:  0,
        level:      1,
        badge:      "",
        price:      initialPrice,
        supply:     0,
        volume_24h: 0,
      })
      .select("address, name, owner, score, influence, level, badge, price, supply, volume_24h, created_at")
      .single();

    if (error) {
      // Manejo elegante de race condition contra UNIQUE constraint en BD
      if (error.code === "23505" || /duplicate|unique/i.test(error.message)) {
        return res.status(409).json({ error: `El nombre "${cleanName}" ya está en uso. Elige otro.` });
      }
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
      owner_id:   data.owner       ?? userId,
      isOwner:    true,
    });
  } catch (err) {
    console.error("[/api/totem/create] unhandled:", err);
    return res.status(500).json({ error: err?.message ?? "internal error" });
  }
}
