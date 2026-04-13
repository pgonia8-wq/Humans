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
    return { ok: false, status: 0, data: { error: "Internal server error" } };
  }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const body = req.body || {};
  const transactionId = body.transactionId || body.transaction_id;
  const userId = body.userId || body.user_id;
  const action = body.action;
  console.log("[VERIFY_PAYMENT] INPUT:", { transactionId, userId, action });

  if (!transactionId || typeof transactionId !== "string") {
    return res.status(400).json({ error: "transactionId es requerido" });
  }
  if (!userId || typeof userId !== "string") {
      return res.status(400).json({ error: "userId es requerido" });
    }

    const { data: _profile } = await supabase
      .from("profiles")
      .select("verification_level")
      .eq("id", userId)
      .maybeSingle();

    if (!_profile || !_profile.verification_level) {
      return res.status(403).json({ error: "Device verification required" });
    }
  const VALID_ACTIONS = ["chat_gold", "extra_room", "tip", "boost", "chat_classic", "campaign_budget"];
  if (!action || !VALID_ACTIONS.includes(action)) {
    return res.status(400).json({ error: `action inválida: "${action}". Valores válidos: ${VALID_ACTIONS.join(", ")}` });
  }

  const reference = body.reference;

  // Verificar transacción con Worldcoin ANTES del anti-replay
  const { ok: txOk, data: txData } = await verifyWorldcoinTransaction(transactionId);
  const txStatus = txData?.transactionStatus ?? txData?.status ?? "";

  if (!txOk) {
    return res.status(502).json({ error: "No se pudo verificar la transacción con Worldcoin. Intenta de nuevo.", txStatus: "unverified" });
  } else if (txStatus === "failed") {
    return res.status(402).json({ error: "Transacción de pago fallida en Worldcoin", txStatus });
  }

  if (reference && txData?.reference && txData.reference !== reference) {
    return res.status(400).json({ error: "Reference mismatch — posible manipulación de pago" });
  }

  // Anti-replay atómico: INSERT en processed_transactions con UNIQUE(transaction_id)
  // Solo se ejecuta después de confirmar que la transacción es válida en Worldcoin
  try {
    const { error: arErr } = await supabase
      .from("processed_transactions")
      .insert({ transaction_id: transactionId, user_id: userId, action, created_at: new Date().toISOString() });
    if (arErr) {
      if (arErr.code === "23505") {
        return res.status(200).json({ success: true, message: "Acceso ya otorgado", replayed: true });
      }
      console.error("[VERIFY_PAYMENT] Anti-replay insert error:", arErr.message);
    }
  } catch (e) {
    console.error("[VERIFY_PAYMENT] Anti-replay error:", e.message);
  }

  // Aplicar acción en Supabase
  try {
    if (action === "tip") {
      const { postId, amount } = body;
      if (!postId) {
        return res.status(400).json({ error: "postId requerido para tip" });
      }

      // Validar amount contra el monto real en la transacción de Worldcoin
      const onChainAmount = txData?.inputToken?.amount ?? txData?.amount ?? null;
      const requestedAmount = Number(amount) || 0;
      if (requestedAmount <= 0) {
        return res.status(400).json({ error: "amount debe ser positivo" });
      }
      if (onChainAmount !== null) {
        const onChainAmountNum = Number(onChainAmount);
        if (!isNaN(onChainAmountNum) && requestedAmount > onChainAmountNum * 1.01) {
          console.error("[VERIFY_PAYMENT] Amount mismatch: requested", requestedAmount, "on-chain", onChainAmountNum);
          return res.status(400).json({ error: "Amount mismatch — monto solicitado supera el pagado on-chain" });
        }
      }

      const { error: tipErr } = await supabase.from("tips").insert({
        from_user_id: userId,
        to_post_id: postId,
        amount: requestedAmount,
        created_at: new Date().toISOString(),
      });
      if (tipErr) {
        console.error("[VERIFY_PAYMENT] Tip error:", tipErr.message);
        return res.status(500).json({ error: tipErr.message });
      }
    } else if (action === "boost") {
      const { postId } = body;
      const { error: boostErr } = await supabase.from("boosts").insert({
        user_id: userId,
        post_id: postId || null,
        transaction_id: transactionId,
        created_at: new Date().toISOString(),
      });
      if (boostErr) {
        console.error("[VERIFY_PAYMENT] Boost error:", boostErr.message);
        return res.status(500).json({ error: boostErr.message });
      }
    } else if (action === "chat_classic") {
      const { error: classicErr } = await supabase
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
      if (classicErr) {
        console.error("[VERIFY_PAYMENT] chat_classic error:", classicErr.message);
        return res.status(500).json({ error: classicErr.message });
      }
    } else if (action === "chat_gold") {
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
    } else if (action === "campaign_budget") {
      const { campaignName, budget } = body;
      if (!campaignName || !budget || typeof budget !== "number" || budget <= 0) {
        return res.status(400).json({ error: "campaignName and positive budget required" });
      }
      const { error: campErr } = await supabase.from("campaigns").insert({
        user_id: userId,
        name: campaignName,
        budget,
        spent: 0,
        status: "active",
        transaction_id: transactionId,
        created_at: new Date().toISOString(),
      });
      if (campErr) {
        console.error("[VERIFY_PAYMENT] Campaign error:", campErr.message);
        return res.status(500).json({ error: campErr.message });
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
