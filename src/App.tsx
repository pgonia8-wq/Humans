import React, { useState, useEffect } from "react";
import HomePage from "./pages/HomePage";
import { MiniKit, VerificationLevel } from "@worldcoin/minikit-js";
import eruda from "eruda";

// Eruda Debug
if (typeof window !== "undefined") {
  eruda.init();
}

const APP_ID = "app_6a98c88249208506dcd4e04b529111fc";

const App = () => {
  const [wallet, setWallet] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [miniKitReady, setMiniKitReady] = useState(false);

  // Debug total: log de cada render
  console.log("[RENDER APP] Estado actual:", {
    userId,
    username,
    wallet,
    verified,
    verifying,
    walletLoading,
    error,
    miniKitReady,
  });

  // Log props que se enviarán a HomePage
  useEffect(() => {
    console.log("[DEBUG] Props que enviaremos a HomePage:", {
      userId,
      verified,
      wallet,
      username,
      error,
      verifying,
      setUserId,
    });
  }, [userId, verified, wallet, username, error, verifying]);

  // Cargar datos de localStorage
  useEffect(() => {
    const storedId = localStorage.getItem("userId");
    if (storedId) {
      setUserId(storedId);
      setVerified(true);
      console.log("[APP] User ID cargado desde localStorage:", storedId);
    }

    const storedWallet = localStorage.getItem("wallet");
    if (storedWallet) {
      setWallet(storedWallet);
      console.log("[APP] Wallet cargada desde localStorage:", storedWallet);
    }

    const storedUsername = localStorage.getItem("username");
    if (storedUsername) {
      setUsername(storedUsername);
      console.log("[APP] Username cargado desde localStorage:", storedUsername);
    }
  }, []);

  // Inicializar MiniKit
  useEffect(() => {
    console.log("[APP] Inicializando MiniKit...");

    try {
      MiniKit.install({ appId: APP_ID });
      const installed = MiniKit.isInstalled();
      console.log("[APP] MiniKit instalado:", installed);

      if (installed) {
        setMiniKitReady(true);
        const w = MiniKit.walletAddress;
        if (w) {
          setWallet(w);
          localStorage.setItem("wallet", w);
          console.log("[APP] Wallet detectada:", w);
        }

        const directUsername = MiniKit.user?.username;
        if (directUsername) {
          setUsername(directUsername);
          localStorage.setItem("username", directUsername);
          console.log("[APP] Username detectado desde MiniKit.user:", directUsername);
        }
      }
    } catch (err) {
      console.error("[APP] Error MiniKit:", err);
      setError("MiniKit no pudo inicializarse");
    }
  }, []);

  // Wallet Auth
  useEffect(() => {
    const loadWallet = async () => {
      if (!verified || wallet || walletLoading || !miniKitReady) return;
      setWalletLoading(true);
      console.log("[APP] Iniciando walletAuth...");

      try {
        const nonceRes = await fetch("/api/nonce");
        if (!nonceRes.ok) throw new Error("Error obteniendo nonce");
        const { nonce } = await nonceRes.json();

        const authResult = await Promise.race([
          MiniKit.commandsAsync.walletAuth({
            nonce,
            requestId: "wallet-auth-" + Date.now(),
            expirationTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            notBefore: new Date(Date.now() - 24 * 60 * 60 * 1000),
            statement: "Autenticar wallet para H humans y compartir mi username público",
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Timeout walletAuth")), 30000)
          ),
        ]);

        console.log("[APP] walletAuth resultado:", authResult);

        if (authResult?.finalPayload?.status === "success") {
          const w = authResult.finalPayload.address;
          const u = authResult.finalPayload.username || null;

          setWallet(w);
          localStorage.setItem("wallet", w);

          if (u) {
            setUsername(u);
            localStorage.setItem("username", u);
          }

          console.log("[APP] Wallet cargada:", w, "Username:", u);
        } else {
          throw new Error("walletAuth falló");
        }
      } catch (err: any) {
        console.error("[APP] walletAuth error:", err);
        setError(err.message || "Error autenticando wallet");
      } finally {
        setWalletLoading(false);
      }
    };

    loadWallet();
  }, [verified, wallet, walletLoading, miniKitReady]);

  // Verificación World ID
  const verifyUser = async () => {
    if (verifying) return;
    if (userId) {
      console.log("[APP] Ya verificado:", userId);
      return;
    }

    setVerifying(true);
    setError(null);

    try {
      if (!MiniKit.isInstalled()) throw new Error("Abre la app desde World App");

      const verifyRes = await Promise.race([
        MiniKit.commandsAsync.verify({
          action: "verify-user",
          verification_level: VerificationLevel.Device,
          signal: "h-humans-login-" + Date.now(),
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout verificación")), 30000)
        ),
      ]);

      console.log("[APP] Verify response:", verifyRes);

      const proof = verifyRes?.finalPayload;
      if (!proof || proof.status !== "success") throw new Error("Verificación cancelada");

      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payload: proof,
          action: verifyRes.action,
          signal: verifyRes.signal,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Backend error: ${res.status} - ${text}`);
      }

      const backend = await res.json();
      console.log("[APP] Backend verify:", backend);

      if (backend.success) {
        const id = proof.nullifier_hash;
        localStorage.setItem("userId", id);
        setUserId(id);
        setVerified(true);
        console.log("[APP] Usuario verificado:", id);
      } else {
        throw new Error(backend.error || "Backend rechazó verificación");
      }
    } catch (err: any) {
      console.error("[APP] Error verify:", err);
      setError(err.message || "Error verificando");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <>
      {walletLoading && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <p>Cargando wallet...</p>
          </div>
        </div>
      )}

      {verifying && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <p>Verificando identidad...</p>
          </div>
        </div>
      )}

      {(!userId || !verified) && !walletLoading && !verifying ? (
        <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white gap-6">
          <p className="text-lg text-center">
            Verifica tu identidad con World ID
          </p>

          <button
            onClick={verifyUser}
            className="px-6 py-3 bg-purple-600 rounded-lg font-semibold hover:bg-purple-700 transition"
          >
            Verificar con World ID
          </button>

          {error && (
            <p className="text-red-400 text-sm text-center max-w-sm">{error}</p>
          )}
        </div>
      ) : (
        <HomePage
          userId={userId}
          verifyUser={verifyUser}
          verified={verified}
          wallet={wallet}
          username={username}
          error={error}
          verifying={verifying}
          setUserId={setUserId}
        />
      )}
    </>
  );
};

export default App;
