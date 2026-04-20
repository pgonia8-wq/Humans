/**
 * buy.mjs — Preview ADVISORY de compra
 *
 * Calcula estimado de tokens a recibir por X WLD.
 * Es orientativo: el contrato TotemBondingCurve determina el resultado final.
 * El frontend usa esto para mostrar el preview ANTES de llamar sendTransaction.
 */

import { createClient } from "@supabase/supabase-js";
import { solveBuy }     from "../lib/curve.mjs";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

  const { totem, wldIn } = req.body ?? {};

  if (!totem)               return res.status(400).json({ error: "totem requerido" });
  if (!wldIn || wldIn <= 0) return res.status(400).json({ error: "wldIn debe ser positivo" });

  const { data: totemData } = await supabase
    .from("totems")
    .select("supply, price")
    .eq("address", totem.toLowerCase())
    .single();

  if (!totemData) return res.status(404).json({ error: "Totem no encontrado" });

  const preview = solveBuy(wldIn, totemData.supply ?? 0);

  return res.status(200).json({
    advisory:    true,
    wldIn,
    tokensOut:   preview.tokensOut,
    fee:         preview.fee,
    priceAfter:  preview.newPrice,
    supplyAfter: preview.newSupply,
  });
}
