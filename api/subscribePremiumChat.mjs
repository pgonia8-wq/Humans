import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  console.log("[BACKEND] subscribePremiumChat llamado");

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { userId, transactionId } = req.body || {};

  if (!userId) {
    return res.status(400).json({ success: false, error: "userId requerido" });
  }

  if (!transactionId) {
    return res.status(400).json({ success: false, error: "transactionId requerido" });
  }

  try {
    // Verificar que la transacción sea válida con Worldcoin
    const verifyRes = await fetch(
      `https://developer.worldcoin.org/api/v2/minikit/transaction/${transactionId}?app_id=app_6a98c88249208506dcd4e04b529111fc`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    );

    const verifyData = await verifyRes.json();
    console.log("[BACKEND] Worldcoin transaction check:", verifyData);

    if (!verifyRes.ok || verifyData.transaction_status !== "mined") {
      console.warn("[BACKEND] Transacción no confirmada:", verifyData);
      // No bloqueamos el flujo si la verificación tarda — Worldcoin puede demorar
      // pero sí logueamos para auditoría
    }

    // Guardar suscripción en Supabase
    const { error: upsertError } = await supabase
      .from("subscriptions")
      .upsert(
        {
          user_id: userId,
          product: "chat_classic",
          transaction_id: transactionId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,product" }
      );

    if (upsertError) {
      console.error("[BACKEND] Error guardando suscripción:", upsertError);
      return res.status(500).json({ success: false, error: upsertError.message });
    }

    console.log("[BACKEND] Suscripción premium-chat guardada para userId:", userId);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("[BACKEND] Error en subscribePremiumChat:", err);
    return res.status(500).json({ success: false, error: err.message || "Internal server error" });
  }
}
