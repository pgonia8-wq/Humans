import { createClient } from "@supabase/supabase-js";
import { ethers } from "ethers";
import { verifySiweMessage } from "@worldcoin/minikit-js";
import { rateLimit } from "./_rateLimit.mjs";

if (!process.env.SUPABASE_URL) {
  console.error("[WITHDRAW] ERROR: SUPABASE_URL no configurada");
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("[WITHDRAW] ERROR: SUPABASE_SERVICE_ROLE_KEY no configurada");
}

const supabase = createClient(
  process.env.SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
);

const WORLD_CHAIN_RPC = process.env.WORLD_CHAIN_RPC ?? "https://worldchain-mainnet.g.alchemy.com/public";
const WLD_CONTRACT = "0x2cFc85d8E48F8EaB294be644d9E25C3030863003";
const WLD_DECIMALS = 18;
const MIN_RESERVE_WLD = 100;
const MAX_WITHDRAW_WLD = 500;

const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address owner) view returns (uint256)",
];

async function executeTransfer(toAddress, amount) {
  const privateKey = process.env.PAYOUT_WALLET_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("PAYOUT_WALLET_PRIVATE_KEY not configured");
  }

  const provider = new ethers.JsonRpcProvider(WORLD_CHAIN_RPC, { chainId: 480, name: "worldchain" });
  const wallet = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(WLD_CONTRACT, ERC20_ABI, wallet);

  const amountWei = ethers.parseUnits(amount.toString(), WLD_DECIMALS);

  const balance = await contract.balanceOf(wallet.address);
  if (balance < amountWei) {
    throw new Error(`Insufficient WLD in payout wallet. Has: ${ethers.formatUnits(balance, WLD_DECIMALS)}, needs: ${amount}`);
  }
  const reserveWei = ethers.parseUnits(MIN_RESERVE_WLD.toString(), WLD_DECIMALS);
  if (balance - amountWei < reserveWei) {
    throw new Error("Withdrawal would breach minimum reserve of " + MIN_RESERVE_WLD + " WLD");
  }

  const tx = await contract.transfer(toAddress, amountWei);
  const receipt = await tx.wait();

  return { txHash: receipt.hash, status: receipt.status === 1 ? "confirmed" : "failed" };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  if (rateLimit(req, { max: 5, windowMs: 300000 }).limited) {
    return res.status(429).json({ success: false, error: "Demasiadas solicitudes de retiro. Intenta en 5 minutos." });
  }

  const body = req.body || {};
  const userId = body.userId || body.user_id;
  const amount = body.amount;
  const wallet = body.wallet;
  console.log("[WITHDRAW] INPUT:", { userId, amount, wallet });

  if (!userId || typeof userId !== "string") {
    return res.status(400).json({ success: false, error: "userId es requerido" });
  }
  if (!wallet || typeof wallet !== "string") {
    return res.status(400).json({ success: false, error: "wallet es requerida" });
  }
  if (!amount || typeof amount !== "number" || amount <= 0) {
    return res.status(400).json({ success: false, error: "Monto inválido" });
  }

  if (!ethers.isAddress(wallet)) {
    return res.status(400).json({ success: false, error: "Dirección de wallet inválida" });
  }

  if (amount > MAX_WITHDRAW_WLD) {
    return res.status(400).json({ success: false, error: "Máximo retiro: " + MAX_WITHDRAW_WLD + " WLD" });
  }

  const { payload, nonce } = body;
  if (!payload || !nonce || !payload.message || !payload.signature || !payload.address) {
    return res.status(401).json({ success: false, error: "Autenticación SIWE requerida (payload + nonce)" });
  }

  try {
    const validMessage = await verifySiweMessage(payload, nonce);
    if (!validMessage.isValid) {
      return res.status(401).json({ success: false, error: "Firma SIWE inválida" });
    }
  } catch (authErr) {
    console.error("[WITHDRAW] SIWE error:", authErr.message);
    return res.status(401).json({ success: false, error: "Error verificando firma SIWE" });
  }

  if (payload.address.toLowerCase() !== userId.toLowerCase()) {
    return res.status(403).json({ success: false, error: "userId no coincide con la firma SIWE" });
  }

  if (wallet.toLowerCase() !== payload.address.toLowerCase()) {
    return res.status(403).json({ success: false, error: "Wallet de destino debe coincidir con la dirección SIWE autenticada" });
  }

  const { data: nonceClaimed, error: nonceClaimErr } = await supabase
    .from("nonces")
    .update({ used: true })
    .eq("nonce", nonce)
    .eq("used", false)
    .gt("expires_at", new Date().toISOString())
    .select("nonce")
    .maybeSingle();

  if (nonceClaimErr || !nonceClaimed) {
    return res.status(401).json({ success: false, error: "Nonce inválido, expirado o ya usado" });
  }

  try {
    const { error: deductError } = await supabase.rpc("deduct_balance", {
      p_user_id: userId,
      p_amount: amount,
    });

    if (deductError) {
      console.error("[WITHDRAW] Deduct error:", deductError.message);
      if (deductError.message.includes("insufficient") || deductError.message.includes("Insufficient")) {
        return res.status(400).json({ success: false, error: "Fondos insuficientes" });
      }
      return res.status(500).json({ success: false, error: "Error al deducir saldo" });
    }

    let txResult;
    try {
      txResult = await executeTransfer(wallet, amount);
    } catch (txErr) {
      console.error("[WITHDRAW] Transfer failed, refunding balance:", txErr.message);
      await supabase.rpc("credit_balance", { p_user_id: userId, p_amount: amount });
      await supabase.from("withdrawals").insert({
        user_id: userId, amount, wallet_address: wallet,
        status: "refunded", tx_hash: null,
        error_message: txErr.message,
        created_at: new Date().toISOString(),
      });
      return res.status(500).json({ success: false, error: "Error en transferencia on-chain: " + txErr.message });
    }

    const { error: insertError } = await supabase.from("withdrawals").insert({
      user_id: userId,
      amount,
      wallet_address: wallet,
      status: txResult.status,
      tx_hash: txResult.txHash,
      created_at: new Date().toISOString(),
    });

    if (insertError) {
      console.error("[WITHDRAW] Insert error:", insertError.message);
    }

    return res.status(200).json({
      success: true,
      txHash: txResult.txHash,
      status: txResult.status,
    });
  } catch (err) {
    console.error("[WITHDRAW] Error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}
