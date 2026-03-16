import React, { useState, useEffect, useRef } from "react";
import HomePage from "./pages/HomePage";
import { MiniKit, VerificationLevel } from "@worldcoin/minikit-js";

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
  const walletLoading = useRef(false);

  // Cargar ID de localStorage
  useEffect(() => {
    const storedId = localStorage.getItem("userId");

    if (storedId) {
      setUserId(storedId);
      setVerified(true);
      console.log("[APP] ID cargado de localStorage:", storedId);
    } else {
      console.log("[APP] No hay ID en localStorage, forzando verificación...");
      if (miniKitReady) verifyUser();
    }
  }, [miniKitReady]);

  // Inicializar MiniKit
  useEffect(() => {
    const initMiniKit = async () => {
      try {
        console.log("[APP] Instalando MiniKit...");

        MiniKit.install({ appId: APP_ID });

        const installed = MiniKit.isInstalled();
        console.log("[APP] MiniKit.isInstalled():", installed);

        if (!installed) {
          console.warn("[APP] MiniKit no está disponible");
          return;
        }

        setMiniKitReady(true);
        console.log("[APP] MiniKit listo");

        // --- NUEVO: obtener username y avatar desde MiniKit.user ---
        if (MiniKit.user) {
          const u = MiniKit.user.username || null;
          const a = MiniKit.user.avatar_url || null;
          setUsername(u);
          setAvatar(a);
          console.log("[APP] MiniKit user:", u, a);
        }
      } catch (err) {
        console.error("[APP] Error instalando MiniKit:", err);
        setError("Error instalando MiniKit");
      }
    };

    initMiniKit();
  }, []);

  // Obtener wallet usando walletAuth
  useEffect(() => {
    const loadWallet = async () => {
      if (!verified || wallet || verifying || !miniKitReady || walletLoading.current) {
        return;
      }

      walletLoading.current = true;
      console.log("[APP] Iniciando walletAuth...");

      try {
        const nonceRes = await fetch("/api/nonce");
        if (!nonceRes.ok) throw new Error("No se pudo obtener nonce");
        const { nonce } = await nonceRes.json();

        console.log("[APP] Nonce recibido:", nonce);

        const auth = await MiniKit.commandsAsync.walletAuth({
          nonce,
          requestId: "wallet-auth-" + Date.now(),
          expirationTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          notBefore: new Date(Date.now() - 60 * 1000),
          statement: "Autenticar wallet para H humans",
        });

        console.log("[APP] walletAuth result:", auth);

        const address =
          auth?.finalPayload?.address || auth?.finalPayload?.wallet_address || null;

        if (address) {
          setWallet(address);
          console.log("[APP] Wallet obtenida:", address);
        } else {
          console.warn("[APP] WalletAuth success pero sin address");
        }

        // --- NUEVO: obtener username y avatar también después de walletAuth ---
        if (MiniKit.user) {
          const u = MiniKit.user.username || null;
          const a = MiniKit.user.avatar_url || null;
          setUsername(u);
          setAvatar(a);
          console.log("[APP] MiniKit user post-walletAuth:", u, a);
        }
      } catch (err: any) {
        console.error("[APP] Error walletAuth:", err);
        setError(err.message || "Error autenticando wallet");
      } finally {
        walletLoading.current = false;
      }
    };

    loadWallet();
  }, [verified, wallet, verifying, miniKitReady]);

  // Función de verificación forzada
  const verifyUser = async () => {
    if (verifying || !miniKitReady) return;

    setVerifying(true);
    setError(null);

    try {
      if (!MiniKit.isInstalled()) {
        throw new Error("MiniKit no instalado");
      }

      console.log("[APP] Iniciando verify...");

      const verifyRes = await MiniKit.commandsAsync.verify({
        action: "verify-user",
        verification_level: VerificationLevel.Device,
      });

      console.log("[APP] Verify response:", verifyRes);

      const proof = verifyRes?.finalPayload;

      if (!proof) throw new Error("No se recibió proof");

      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: proof }),
      });

      if (!res.ok) {
        const text = await res.text();
        if (text.includes("already verified") && proof.nullifier_hash) {
          console.log("[APP] Usuario ya verificado, usando nullifier_hash existente");
          const id = proof.nullifier_hash;
          localStorage.setItem("userId", id);
          setUserId(id);
          setVerified(true);
          return;
        } else {
          throw new Error(`Backend error: ${text}`);
        }
      }

      const backend = await res.json();
      console.log("[APP] Backend verify:", backend);

      if (backend.success && proof.nullifier_hash) {
        const id = proof.nullifier_hash;
        localStorage.setItem("userId", id);
        setUserId(id);
        setVerified(true);
        console.log("[APP] Usuario verificado:", id);
      } else {
        throw new Error(backend.error || "Backend rechazó la prueba");
      }
    } catch (err: any) {
      console.error("[APP] Verify error:", err);
      setError(err.message || "Error verificando usuario");
    } finally {
      setVerifying(false);
    }
  };

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
