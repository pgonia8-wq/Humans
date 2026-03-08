import crypto from 'node:crypto';

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const nonce = crypto.randomBytes(32).toString('hex');
    console.log("[NONCE] Generado:", nonce);

    return res.status(200).json({ nonce });
  } catch (err) {
    console.error("[NONCE] Error generando nonce:", err);
    return res.status(500).json({ error: "Error interno al generar nonce" });
  }
}
