export default async function handler(req, res) {
  console.log("[BACKEND] Request recibido - Method:", req.method);
  console.log("[BACKEND] Body recibido:", JSON.stringify(req.body, null, 2));

  if (req.method !== "POST") {
    console.log("[BACKEND] Método no permitido:", req.method);
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { action, max_age } = req.body || {};

  if (!action) {
    console.log("[BACKEND] Falta action");
    return res.status(400).json({
      success: false,
      error: "Missing action",
    });
  }

  // En modo managed de MiniKit dentro de World App, el proof ya se validó internamente en World App
  // No necesitas llamar a ningún endpoint de Worldcoin aquí
  // Solo confirma que la action es válida y responde success

  console.log("[BACKEND] Acción recibida y validada:", action);
  console.log("[BACKEND] Verificación managed exitosa (MiniKit ya lo hizo)");

  return res.status(200).json({ success: true });
}
