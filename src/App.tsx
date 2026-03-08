import React, { useState, useEffect } from "react";
import HomePage from "./pages/HomePage";
import { MiniKit, VerificationLevel } from "@worldcoin/minikit-js";

const App = () => {
  const [wallet, setWallet] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Carga ID de localStorage al inicio
  useEffect(() => {
    const storedId = localStorage.getItem("userId");
    if (storedId) {
      setUserId(storedId);
      setVerified(true);
      console.log("[APP] ID cargado de localStorage:", storedId);
    } else {
      console.log("[APP] No hay ID en localStorage");
    }
  }, []);

  // Inicializa MiniKit
  useEffect(() => {
    console.log("[APP] Intentando instalar MiniKit...");
    try {
      MiniKit.install({
        appId: "app_6a98c88249208506dcd4e04b529111fc",
      });

      const installed = MiniKit.isInstalled();
      console.log("[APP] MiniKit.isInstalled():", installed);

      if (installed) {
        const w = MiniKit.walletAddress;
        setWallet(w);
        console.log("[APP] Wallet detectada al inicio:", w || "undefined");
      } else {
        console.warn("[APP] MiniKit no instalado aún");
      }
    } catch (err) {
      console.error("[APP] MiniKit install error:", err);
      setError("Error al instalar MiniKit");
    }
  }, []);

  // Carga wallet con walletAuth si está verificado y wallet undefined
  useEffect(() => {
    const loadWallet = async () => {
      if (verified && !wallet && !verifying) {
        console.log("[APP] Wallet undefined → iniciando walletAuth...");
        try {
          // Obtener nonce del backend
          const nonceRes = await fetch('/api/nonce');
          console.log("[APP] Nonce fetch status:", nonceRes.status);
          if (!nonceRes.ok) {
            const text = await nonceRes.text();
            throw new Error(`Nonce fetch failed: ${nonceRes.status} - ${text}`);
          }
          const { nonce } = await nonceRes.json();
          console.log("[APP] Nonce recibido:", nonce);

          // Autenticación de wallet
          const authResult = await MiniKit.commandsAsync.walletAuth({
            nonce: nonce,
            requestId: 'wallet-auth-' + Date.now(),
            expirationTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            notBefore: new Date(Date.now() - 24 * 60 * 60 * 1000),
            statement: 'Autenticar wallet para H humans',
          });

          console.log("[APP] walletAuth resultado completo:", authResult);

          // Corrección clave: leer status y address desde finalPayload
          if (authResult?.finalPayload?.status === 'success') {
            const w = authResult.finalPayload.address || authResult.finalPayload.wallet_address;
            setWallet(w);
            console.log("[APP] Wallet cargada desde finalPayload:", w || 'todavía undefined');
          } else {
            throw new Error("walletAuth falló: " + (authResult?.status || 'desconocido'));
          }
        } catch (err: any) {
          console.error("[APP] Error completo en walletAuth:", err);
          setError("No se pudo autenticar la wallet: " + (err.message || "Desconocido"));
        }
      }
    };

    loadWallet();
  }, [verified, wallet, verifying]);

  const verifyUser = async () => {
    if (verifying) return;
    if (userId) {
      console.log("[APP] Ya hay userId guardado, no es necesario verificar de nuevo");
      return;
    }

    setVerifying(true);
    setError(null);
    console.log("[APP] Iniciando verificación...");

    try {
      if (!MiniKit.isInstalled()) {
        throw new Error("MiniKit no instalado");
      }

      const verifyRes = await MiniKit.commandsAsync.verify({
        action: "verify-user",
        verification_level: VerificationLevel.Device,
      });

      console.log("[APP] Verify response:", verifyRes);

      const proof = verifyRes?.finalPayload;
      if (!proof || proof.status !== "success") {
        throw new Error("Verificación fallida o cancelada");
      }

      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: proof }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Backend error: ${res.status} - ${text}`);
      }

      const backend = await res.json();
      console.log("[APP] Backend response:", backend);

      if (backend.success) {
        const id = proof.nullifier_hash;
        localStorage.setItem("userId", id);
        setUserId(id);
        setVerified(true);
        console.log("[APP] Verificación exitosa, userId guardado:", id);
      } else {
        setError("Backend rechazó la prueba: " + (backend.error || "Desconocido"));
      }
    } catch (err: any) {
      console.error("[APP] Verify error:", err);
      setError(err.message || "Error durante verificación");
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
      error={error} 
      verifying={verifying} 
      setUserId={setUserId} 
    />
  );
};

export default App;
