// api/upgrade.ts
import { createClient } from "@supabase/supabase-js";
import { nanoid } from "nanoid";

const PREMIUM_LIMIT = 10000;
const PREMIUM_PLUS_LIMIT = 3000;

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface UpgradeRequest {
  userId: string;
  tier: "premium" | "premium+";
  transactionId: string;
  referralToken?: string;
}

// Precio dinámico según early adopters
async function getUpgradePrice(tier: "premium" | "premium+") {
  if (tier === "premium") {
    const { count } = await supabase
      .from("upgrades")
      .select("*", { count: "exact", head: true })
      .eq("tier", "premium");

    return (count ?? 0) < PREMIUM_LIMIT ? 10 : 20;
  } else {
    const { count } = await supabase
      .from("upgrades")
      .select("*", { count: "exact", head: true })
      .eq("tier", "premium+");

    return (count ?? 0) < PREMIUM_PLUS_LIMIT ? 15 : 35;
  }
}

// Crear token de referido
async function createReferralToken(userId: string) {
  const token = nanoid(10);

  const { error } = await supabase.from("referral_tokens").insert({
    token,
    created_by: userId,
    tier: "premium",
    boost_limit: 1,
    tips_allowed: false,
    created_at: new Date().toISOString(),
  });

  if (error) throw error;

  return token;
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Método no permitido" });
    }

    const { userId, tier, transactionId, referralToken } =
      req.body as UpgradeRequest;

    if (!userId || !tier || !transactionId) {
      return res.status(400).json({ error: "Faltan parámetros obligatorios" });
    }

    // Validación de pago (placeholder)
    const paymentValid = true;
    if (!paymentValid) {
      return res.status(400).json({ error: "Transacción inválida" });
    }

    // Evitar doble compra
    const { data: existing } = await supabase
      .from("upgrades")
      .select("id")
      .eq("user_id", userId)
      .eq("tier", tier)
      .maybeSingle();

    if (existing) {
      return res.status(400).json({
        error: "Ya tienes este nivel activo",
      });
    }

    // Obtener precio dinámico
    const price = await getUpgradePrice(tier);

    // Registrar upgrade
    const { error: insertError } = await supabase.from("upgrades").insert({
      user_id: userId,
      tier,
      price,
      start_date: new Date().toISOString(),
      transaction_id: transactionId,
    });

    if (insertError) throw insertError;

    // Sistema de referidos
    if (referralToken) {
      const { data: tokenData } = await supabase
        .from("referral_tokens")
        .select("*")
        .eq("token", referralToken)
        .single();

      if (tokenData) {
        await supabase.from("upgrades").insert({
          user_id: userId,
          tier: tokenData.tier,
          price: 0,
          start_date: new Date().toISOString(),
          transaction_id: `referral-${nanoid(6)}`,
          boost_limit: tokenData.boost_limit,
          tips_allowed: tokenData.tips_allowed,
        });

        await supabase
          .from("referral_tokens")
          .update({
            used_by: userId,
            used_at: new Date().toISOString(),
          })
          .eq("token", referralToken);
      }
    }

    // Generar token nuevo para el usuario
    const newReferralToken = await createReferralToken(userId);

    return res.status(200).json({
      message: "Upgrade exitoso",
      price,
      referralToken: newReferralToken,
    });
  } catch (err: any) {
    console.error("Error en upgrade:", err);

    return res.status(500).json({
      error: err.message || "Error interno",
    });
  }
}
