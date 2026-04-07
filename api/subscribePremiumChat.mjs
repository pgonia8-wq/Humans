/* ─────────────────────────────────────────────────────────────────────────────
   DESTINO: api/subscribePremiumChat.mjs
   ESTADO: Correcto tal como está. Se entrega aquí como referencia auditada.

   REQUISITO DE ENV VAR:
   [S-ENV] WORLDCOIN_API_KEY — requerida para autenticar la verificación de
           transacciones con el Developer Portal de Worldcoin. Sin esta key
           el header `Authorization: Bearer ` se envía vacío y Worldcoin
           puede rechazar la solicitud.
           Añadir WORLDCOIN_API_KEY en las variables de entorno de Vercel.

   TABLA SUPABASE REQUERIDA: subscriptions
   Columnas mínimas: id, user_id, product, transaction_id, active, created_at, updated_at
   Constraint único: (user_id, product) para que el upsert funcione.

   BUGS QUE YA TIENE CORREGIDOS (documentados en el archivo original):
   [S1] Validación de campos del body (userId, transactionId)
   [S2] Verificación real de transacción con Worldcoin Developer Portal
   [S3] No se inserta si la transacción está fallida
   [S4] Error devuelto al cliente si el upsert falla
   [S5] Env vars validadas al inicio con null-coalescing
   [S6] Anti-replay por transactionId antes de cualquier write
   [S7] CORS con "*" para World App WebView
   ─────────────────────────────────────────────────────────────────────────── */

import { createClient } from "@supabase/supabase-js";

if (!process.env.SUPABASE_URL) {
  console.error("[SUBSCRIBE] ERROR: SUPABASE_URL no está configurada");
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("[SUBSCRIBE] ERROR: SUPABASE_SERVICE_ROLE_KEY no está configurada");
}
if (!process.env.WORLDCOIN_API_KEY) {
  console.warn("[SUBSCRIBE] ADVERTENCIA: WORLDCOIN_API_KEY no configurada — la verificación de pagos puede fallar");
}

const supabase = createClient(
  process.env.SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
);

const APP_ID = process.env.WORLDCOIN_APP_ID ?? "";

async function verifyWorldcoinPayment(transactionId) {
  try {
    const res = await fetch(
      `https://developer.worldcoin.org/api/v2/minikit/transaction/${transactionId}?app_id=${APP_ID}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${process.env.WORLDCOIN_API_KEY ?? ""}` },
      }
    );
    const data = await res.json();
    return { ok: res.ok, data };
  } catch (err) {
    console.error("[SUBSCRIBE] Error al verificar transacción con Worldcoin:", err.message);
    return { ok: false, data: { error: err.message } };
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
  const { userId, transactionId } = body;

  if (!userId || typeof userId !== "string" || userId.trim() === "") {
    return res.status(400).json({ error: "userId es requerido" });
  }
  if (!transactionId || typeof transactionId !== "string" || transactionId.trim() === "") {
    return res.status(400).json({ error: "transactionId es requerido" });
  }

  // Anti-replay
  try {
    const { data: existingTx } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("transaction_id", transactionId)
      .maybeSingle();

    if (existingTx) {
      return res.status(200).json({
        success: true,
        message: "Suscripción ya activa",
        product: "chat_classic",
      });
    }
  } catch (dbErr) {
    console.error("[SUBSCRIBE] Anti-replay check failed:", dbErr.message);
  }

  // Verificar el pago con Worldcoin
  const { ok: txOk, data: txData } = await verifyWorldcoinPayment(transactionId);
  const txStatus = txData?.transactionStatus ?? txData?.status ?? "";
  const isPending = txStatus === "pending" || txStatus === "";

  if (!txOk) {
    return res.status(502).json({ error: "No se pudo verificar el pago con Worldcoin. Intenta de nuevo.", details: txData });
  } else if (txStatus === "failed") {
    return res.status(402).json({ error: "Transacción de pago fallida", details: txData });
  } else if (isPending) {
    return res.status(202).json({ error: "Pago pendiente de confirmación. Intenta de nuevo en unos segundos.", transactionStatus: "pending" });
  }

  // Insertar suscripción
  try {
    const { error: insertError } = await supabase
      .from("subscriptions")
      .upsert(
        {
          user_id: userId,
          product: "chat_classic",
          transaction_id: transactionId,
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,product" }
      );

    if (insertError) {
      console.error("[SUBSCRIBE] Error:", insertError.message);
      return res.status(500).json({
        error: "Error al activar suscripción en base de datos",
        details: insertError.message,
      });
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
