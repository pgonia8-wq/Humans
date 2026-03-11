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

  const walletLoading = useRef(false);

  // Cargar ID desde localStorage
  useEffect(() => {
    const storedId = localStorage.getItem("userId");
    if (storedId) {
      setUserId(storedId);
      setVerified(true);
      console.log("[APP] ID cargado de localStorage:", storedId);
    } else {
      console.log("[APP] No hay ID en localStorage, se forzará verificación...");
    }
  }, []);

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
          setError("MiniKit no instalado");
          return;
        }

        setMiniKitReady(true);
        console.log("[APP] MiniKit listo");

        // Guardar wallet si ya existe
        if (MiniKit.walletAddress) {
          setWallet(MiniKit.walletAddress);
          console.log("[APP] Wallet detectada:", MiniKit.walletAddress);
        }
      } catch (err) {
        console.error("[APP] Error instalando MiniKit:", err);
        setError("Error instalando MiniKit");
      }
    };

    initMiniKit();
  }, []);

  // Verificación forzada si no hay userId
  useEffect(() => {
    const forceVerify = async () => {
      if (verifying || verified || !miniKitReady || userId) return;

      setVerifying(true);
      setError(null);

      try {
        console.log("[APP] Forzando verify...");

        const verifyRes = await MiniKit.commandsAsync.verify({
          action: "verify-user",
          verification_level: VerificationLevel.Device,
        });

        console.log("[APP] Verify response:", verifyRes);

        const proof = verifyRes?.finalPayload;
        if (!proof || proof.status !== "success") {
          throw new Error("Verificación cancelada o fallida");
        }

        const res = await fetch("/api/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ payload: proof }),
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Backend error: ${text}`);
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
          throw new Error(backend.error || "Backend rechazó la prueba");
        }
      } catch (err: any) {
        console.error("[APP] Verify error:", err);
        setError(err.message || "Error verificando usuario");
      } finally {
        setVerifying(false);
      }
    };

    forceVerify();
  }, [miniKitReady, userId, verified, verifying]);

  // Obtener wallet usando walletAuth (después de verificación)
  useEffect(() => {
    const loadWallet = async () => {
      if (!verified || wallet || walletLoading.current) return;
      walletLoading.current = true;

      try {
        console.log("[APP] Iniciando walletAuth...");

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

        if (auth?.finalPayload?.status === "success") {
          const address =
            auth.finalPayload.address ||
            auth.finalPayload.wallet_address ||
            null;
          if (address) {
            setWallet(address);
            console.log("[APP] Wallet obtenida:", address);
          } else {
            console.warn("[APP] WalletAuth success pero sin address");
          }
        } else {
          console.warn("[APP] walletAuth no fue success");
        }
      } catch (err: any) {
        console.error("[APP] Error walletAuth:", err);
        setError(err.message || "Error autenticando wallet");
      } finally {
        walletLoading.current = false;
      }
    };

    loadWallet();
  }, [verified, wallet]);

  return (
    <HomePage
      userId={userId}
      verified={verified}
      verifying={verifying}
      wallet={wallet}
      error={error}
      setUserId={setUserId}
    />
  );
};

export default App;
