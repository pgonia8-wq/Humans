import { createClient } from "@supabase/supabase-js";

if (!process.env.SUPABASE_URL) {
  console.error("[SUBSCRIBE] ERROR: SUPABASE_URL no está configurada");
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("[SUBSCRIBE] ERROR: SUPABASE_SERVICE_ROLE_KEY no está configurada");
}
if (!process.env.RP_SIGNING_KEY) {
  console.warn("[SUBSCRIBE] ADVERTENCIA: RP_SIGNING_KEY no configurada");
}

const supabase = createClient(
  process.env.SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
);

const APP_ID = process.env.APP_ID ?? "";

async function verifyWorldcoinPayment(transactionId) {
  try {
    const res = await fetch(
      `https://developer.worldcoin.org/api/v2/minikit/transaction/${transactionId}?app_id=${APP_ID}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${process.env.RP_SIGNING_KEY ?? ""}` },
      }
    );
    const data = await res.json();
    return { ok: res.ok, data };
  } catch (err) {
    console.error("[SUBSCRIBE] Error al verificar transacción con Worldcoin:", err.message);
    return { ok: false, data: { error: "Internal server error" } };
  }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = req.body || {};
  const userId = body.userId || body.user_id;
  const transactionId = body.transactionId || body.transaction_id;
  console.log("[SUBSCRIBE] INPUT:", { userId, transactionId });

  if (!userId || typeof userId !== "string" || userId.trim() === "") {
    return res.status(400).json({ error: "userId es requerido" });
  }

  if (!transactionId || typeof transactionId !== "string" || transactionId.trim() === "") {
    return res.status(400).json({ error: "transactionId es requerido" });
  }

  const { data: _profile } = await supabase
    .from("profiles")
    .select("verification_level")
    .eq("id", userId)
    .maybeSingle();

  if (!_profile || !_profile.verification_level) {
    return res.status(403).json({ error: "Device verification required" });
  }

  const { ok: txOk, data: txData } = await verifyWorldcoinPayment(transactionId);
  const txStatus = txData?.transactionStatus ?? txData?.status ?? "";
  const isPending = txStatus === "pending" || txStatus === "";

  if (!txOk) {
    return res.status(502).json({ error: "No se pudo verificar el pago con Worldcoin. Intenta de nuevo." });
  } else if (txStatus === "failed") {
    return res.status(402).json({ error: "Transacción de pago fallida" });
  } else if (isPending) {
    return res.status(202).json({ error: "Pago pendiente de confirmación. Intenta de nuevo en unos segundos.", transactionStatus: "pending" });
  }

  try {
    const { error: insertError } = await supabase
      .from("subscriptions")
      .insert({
        user_id: userId,
        product: "chat_classic",
        transaction_id: transactionId,
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (insertError) {
      if (insertError.code === "23505") {
        return res.status(200).json({
          success: true,
          message: "Suscripción ya activa",
          product: "chat_classic",
        });
      }
      const { error: upsertError } = await supabase
        .from("subscriptions")
        .upsert(
          {
            user_id: userId,
            product: "chat_classic",
            transaction_id: transactionId,
            active: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,product" }
        );
      if (upsertError) {
        console.error("[SUBSCRIBE] Error:", upsertError.message);
        return res.status(500).json({ error: "Error al activar suscripción en base de datos" });
      }
    }
  } catch (dbErr) {
    console.error("[SUBSCRIBE] Error:", dbErr.message);
    return res.status(500).json({ error: "Error inesperado al activar suscripción" });
  }

  return res.status(200).json({
    success: true,
    message: "Suscripción activada",
    product: "chat_classic",
    transactionStatus: txStatus || "accepted",
  });
}
