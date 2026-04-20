/**
 * GET /api/system/stability
 *
 * Estado del sistema (placeholder informativo). SIEMPRE responde JSON válido.
 *   { stable: boolean, frozen: string[], warnings: string[] }
 *
 * Detecta totems "frozen" (sin volumen 24h y supply > 0) como heurística simple.
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

export default async function handler(req, res) {
  try {
    const { data, error } = await supabase
      .from("totems")
      .select("address, name, supply, volume_24h");

    if (error) {
      console.error("[/api/system/stability] supabase error:", error.message);
      return res.status(500).json({ error: error.message });
    }

    const list   = data ?? [];
    const frozen = list
      .filter((t) => Number(t.supply ?? 0) > 0 && Number(t.volume_24h ?? 0) === 0)
      .map((t) => t.address);

    const warnings = [];
    if (frozen.length > 0)             warnings.push(`${frozen.length} totem(s) sin volumen en 24h`);
    if (list.length === 0)             warnings.push("No hay totems registrados");

    return res.status(200).json({
      stable:   warnings.length === 0,
      frozen,
      warnings,
    });
  } catch (err) {
    console.error("[/api/system/stability] unhandled:", err);
    return res.status(500).json({ error: err?.message ?? "internal error" });
  }
}
