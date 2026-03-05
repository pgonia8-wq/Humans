import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log("----- LOG REQUEST -----");
  console.log("Método:", req.method);
  console.log("Headers:", req.headers);
  console.log("Body:", req.body);

  res.status(200).json({
    message: "Logs registrados ✅",
    receivedBody: req.body || null
  });
}
