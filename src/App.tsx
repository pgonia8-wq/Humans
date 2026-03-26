import React, { useState, useEffect, useRef } from "react";
import HomePage from "./pages/HomePage";
import { MiniKit, VerificationLevel } from "@worldcoin/minikit-js";
import { useTheme } from "./lib/ThemeContext";

const APP_ID = "app_6a98c88249208506dcd4e04b529111fc";

const App = () => {
  const [wallet, setWallet] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [miniKitReady, setMiniKitReady] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);   // ← Clave

  const walletLoading = useRef(false);
  const { setUsername: setGlobalUsername } = useTheme();

  // Inicializar MiniKit lo más rápido posible
  useEffect(() => {
    const initMiniKit = async () => {
      try {
        MiniKit.install({ appId: APP_ID });

        if (MiniKit.isInstalled()) {
          setMiniKitReady(true);

          // Datos de usuario si ya están disponibles
          if (MiniKit.user) {
            const u = MiniKit.user.username || null;
            const a = MiniKit.user.avatar_url || null;
            setUsername(u);
            setAvatar(a);
            if (u) setGlobalUsername(u);
          }
        }
      } catch (err) {
        console.error("[APP] Error MiniKit:", err);
        setError("Error inicializando MiniKit");
      } finally {
        // Terminamos la carga inicial aunque haya error
        setIsInitialLoading(false);
      }
    };

    initMiniKit();
  }, []);

  // Cargar userId desde localStorage
  useEffect(() => {
    const storedId = localStorage.getItem("userId");
    if (storedId) {
      setUserId(storedId);
      setVerified(true);
      setIsInitialLoading(false);
    }
  }, []);

  // Wallet Auth (solo después de verificado)
  useEffect(() => {
    const loadWallet = async () => {
      if (!verified || wallet || verifying || !miniKitReady || walletLoading.current) return;

      walletLoading.current = true;
      try {
        const nonceRes = await fetch("/api/nonce");
        if (!nonceRes.ok) throw new Error("Error nonce");
        const { nonce } = await nonceRes.json();

        const auth = await MiniKit.commandsAsync.walletAuth({
          nonce,
          requestId: "wallet-auth-" + Date.now(),
          expirationTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          notBefore: new Date(Date.now() - 60 * 1000),
          statement: "Autenticar wallet para H humans",
        });

        const address = auth?.finalPayload?.address || auth?.finalPayload?.wallet_address;
        if (address) setWallet(address);

        if (MiniKit.user) {
          const u = MiniKit.user.username || null;
          const a = MiniKit.user.avatar_url || null;
          setUsername(u);
          setAvatar(a);
          if (u) setGlobalUsername(u);
        }
      } catch (err: any) {
        console.error("[APP] walletAuth error:", err);
        setError(err.message || "Error en wallet");
      } finally {
        walletLoading.current = false;
      }
    };

    if (verified && miniKitReady) loadWallet();
  }, [verified, wallet, verifying, miniKitReady]);

  const verifyUser = async () => {
    if (verifying || !miniKitReady) return;
    setVerifying(true);
    setError(null);

    try {
      const verifyRes = await MiniKit.commandsAsync.verify({
        action: "verify-user",
        verification_level: VerificationLevel.Device,
      });

      const proof = verifyRes?.finalPayload;
      if (!proof?.nullifier_hash) throw new Error("No se recibió proof");

      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: proof }),
      });

      if (!res.ok) {
        const text = await res.text();
        if (text.includes("already verified")) {
          const id = proof.nullifier_hash;
          localStorage.setItem("userId", id);
          setUserId(id);
          setVerified(true);
          return;
        }
        throw new Error(`Error backend: ${text}`);
      }

      const backend = await res.json();
      if (backend.success) {
        const id = proof.nullifier_hash;
        localStorage.setItem("userId", id);
        setUserId(id);
        setVerified(true);
      }
    } catch (err: any) {
      console.error("[APP] Verify error:", err);
      setError(err.message || "Error verificando");
    } finally {
      setVerifying(false);
    }
  };

  // ==================== LOADING SCREEN INMEDIATO ====================
  if (isInitialLoading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Cargando H humans...</p>

        <style jsx>{`
          .loading-screen {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            background: #000000;           /* Cambia al color principal de tu app */
            color: #ffffff;
            font-family: system-ui, -apple-system, sans-serif;
          }
          .spinner {
            width: 56px;
            height: 56px;
            border: 5px solid rgba(255, 255, 255, 0.2);
            border-top: 5px solid #ffffff;
            border-radius: 50%;
            animation: spin 0.9s linear infinite;
            margin-bottom: 24px;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          p {
            margin: 0;
            font-size: 18px;
            opacity: 0.9;
          }
        `}</style>
      </div>
    );
  }

  return (
    <HomePage
      userId={userId}
      verifyUser={verifyUser}
      verified={verified}
      wallet={wallet}
      username={username}
      avatar={avatar}
      error={error}
      verifying={verifying}
      setUserId={setUserId}
    />
  );
};

export default App;
