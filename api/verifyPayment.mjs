/* ─────────────────────────────────────────────────────────────────────────────
   DESTINO: api/verifyPayment.mjs
   ESTADO: Correcto tal como está. Se entrega aquí como referencia auditada.

   REQUISITO DE ENV VAR NO DOCUMENTADO:
   [VP1] RP_SIGNING_KEY — requerida para autenticar la verificación de
         transacciones con el Developer Portal de Worldcoin:
           Authorization: Bearer ${process.env.RP_SIGNING_KEY}
         Sin esta key el header se envía vacío ("Bearer ") y Worldcoin puede
         rechazar la solicitud, haciendo que las verificaciones de pago fallen.
         Añadir RP_SIGNING_KEY en las variables de entorno de Vercel.
         Se obtiene en: Worldcoin Developer Portal → tu app → API Keys.

   LÓGICA SOPORTADA:
   - "chat_gold"  → activa en tabla subscriptions (product: chat_gold)
   - "extra_room" → inserta crédito en tabla room_credits
   Anti-replay: verifica transactionId antes de escribir.
   ─────────────────────────────────────────────────────────────────────────── */

import { createClient } from "@supabase/supabase-js";

if (!process.env.SUPABASE_URL) {
  console.error("[VERIFY_PAYMENT] ERROR: SUPABASE_URL no configurada");
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("[VERIFY_PAYMENT] ERROR: SUPABASE_SERVICE_ROLE_KEY no configurada");
}
if (!process.env.RP_SIGNING_KEY) {
  console.warn("[VERIFY_PAYMENT] ADVERTENCIA: RP_SIGNING_KEY no configurada");
}

const supabase = createClient(
  process.env.SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
);

const APP_ID = process.env.APP_ID ?? "";

async function verifyWorldcoinTransaction(transactionId) {
  try {
    const res = await fetch(
      `https://developer.worldcoin.org/api/v2/minikit/transaction/${transactionId}?app_id=${APP_ID}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.RP_SIGNING_KEY ?? ""}`,
          "Content-Type": "application/json",
        },
      }
    );
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    console.error("[VERIFY_PAYMENT] Error de red al verificar transacción:", err.message);
    return { ok: false, status: 0, data: { error: err.message } };
  }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const body = req.body || {};
  const { transactionId, userId, action } = body;

  if (!transactionId || typeof transactionId !== "string") {
    return res.status(400).json({ error: "transactionId es requerido" });
  }
  if (!userId || typeof userId !== "string") {
    return res.status(400).json({ error: "userId es requerido" });
  }
  if (!action || !["chat_gold", "extra_room"].includes(action)) {
    return res.status(400).json({ error: `action inválida: "${action}". Valores válidos: chat_gold, extra_room` });
  }

  // Anti-replay
  try {
    const table = action === "chat_gold" ? "subscriptions" : "room_credits";
    const { data: existingTx, error: checkErr } = await supabase
      .from(table)
      .select("id")
      .eq("transaction_id", transactionId)
      .maybeSingle();

    if (checkErr) {
      console.error("[VERIFY_PAYMENT] Anti-replay check failed:", checkErr.message);
    } else if (existingTx) {
      return res.status(200).json({ success: true, message: "Acceso ya otorgado", replayed: true });
    }
  } catch (e) {
    console.error("[VERIFY_PAYMENT] Anti-replay error:", e.message);
  }

  // Verificar transacción con Worldcoin
  const { ok: txOk, data: txData } = await verifyWorldcoinTransaction(transactionId);
  const txStatus = txData?.transactionStatus ?? txData?.status ?? "";

  if (!txOk) {
    return res.status(502).json({ error: "No se pudo verificar la transacción con Worldcoin. Intenta de nuevo.", txStatus: "unverified" });
  } else if (txStatus === "failed") {
    return res.status(402).json({ error: "Transacción de pago fallida en Worldcoin", txStatus });
  }

  // Aplicar acción en Supabase
  try {
    if (action === "chat_gold") {
      const { error: upsertErr } = await supabase
        .from("subscriptions")
        .upsert(
          {
            user_id: userId,
            product: "chat_gold",
            transaction_id: transactionId,
            active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,product" }
        );

      if (upsertErr) {
        console.error("[VERIFY_PAYMENT] Error:", upsertErr.message);
        return res.status(500).json({ error: upsertErr.message });
      }

    } else if (action === "extra_room") {
      const { error: insertErr } = await supabase
        .from("room_credits")
        .insert({
          user_id: userId,
          transaction_id: transactionId,
          created_at: new Date().toISOString(),
        });

      if (insertErr) {
        console.error("[VERIFY_PAYMENT] Error:", insertErr.message);
        return res.status(500).json({ error: insertErr.message });
      }
    }
  } catch (e) {
    console.error("[VERIFY_PAYMENT] Error:", e.message);
    return res.status(500).json({ error: "Error interno al activar acceso" });
  }

  return res.status(200).json({
    success: true,
    action,
    transactionStatus: txStatus || "accepted",
  });
}
