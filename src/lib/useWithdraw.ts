import { MiniKit } from "@worldcoin/minikit-js";

/**
 * useWithdraw — Hook para retiros de WLD con autenticación SIWE por retiro.
 *
 * FIX [C2]: El hook anterior enviaba solo { userId, amount, wallet } al backend,
 * sin el payload SIWE ni el nonce que el endpoint /api/withdraw exige.
 * Además, el backend comparaba payload.address (wallet EVM) con userId
 * (nullifier hash de World ID) — tipos incompatibles que nunca coinciden.
 *
 * Flujo correcto:
 *   1. Obtener nonce fresco de /api/nonce (anti-replay por retiro).
 *   2. Solicitar firma SIWE de la wallet World App vía MiniKit.commandsAsync.walletAuth.
 *   3. Enviar { userId, amount, wallet, payload, nonce } al backend.
 *   4. El backend verifica la firma SIWE y cruza payload.address con el
 *      wallet_address registrado en el perfil del usuario (no con userId).
 */
export const useWithdraw = () => {
  const requestWithdraw = async (
    userId: string,
    amount: number,
    wallet: string
  ): Promise<{ txHash?: string; status?: string }> => {
    if (!userId) throw new Error("No user");
    if (!wallet) throw new Error("Wallet requerida");
    if (amount <= 0) throw new Error("Monto inválido");

    // 1. Obtener nonce fresco — único por retiro para prevenir replay attacks
    const nonceRes = await fetch("/api/nonce");
    if (!nonceRes.ok) {
      const errData = await nonceRes.json().catch(() => ({}));
      throw new Error(errData.error || "Error obteniendo nonce de seguridad");
    }
    const { nonce } = await nonceRes.json();
    if (!nonce) throw new Error("Nonce inválido recibido del servidor");

    // 2. Solicitar firma SIWE de la wallet World App
    //    El usuario debe aprobar en World App — si cancela lanzamos error claro.
    const { finalPayload } = await MiniKit.commandsAsync.walletAuth({
      nonce,
      requestId: "withdraw-" + Date.now(),
      expirationTime: new Date(Date.now() + 10 * 60 * 1000), // 10 minutos
      statement: `Autorizar retiro de ${amount} WLD a ${wallet}`,
    });

    if (finalPayload.status !== "success") {
      throw new Error("Autenticación cancelada. El retiro no fue procesado.");
    }

    // 3. Enviar al backend con el payload SIWE completo
    const res = await fetch("/api/withdraw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        amount,
        wallet,
        payload: finalPayload,
        nonce,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || "Error al procesar retiro");
    }

    return { txHash: data.txHash, status: data.status };
  };

  return { requestWithdraw };
};
