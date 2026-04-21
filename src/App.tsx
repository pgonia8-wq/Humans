import React, { useState, useEffect, useRef, useCallback } from "react";
import { MiniKit, VerificationLevel } from "@worldcoin/minikit-js";
import { useTheme } from "./lib/ThemeContext";
import HomePage from "./pages/HomePage";
import { setSessionToken, clearSessionToken } from "./lib/tradeApi";

// Sincronizar con las variables de entorno para evitar errores de paridad
const WORLDCOIN_ACTION = import.meta.env.VITE_WORLDCOIN_ACTION_ID || "verify-user";

const App = () => {
  const [wallet, setWallet] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [miniKitReady, setMiniKitReady] = useState(false);
  const [orbVerifying, setOrbVerifying] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  // ── Estado global de verificación Orb (single source of truth) ────────────
  // Se hidrata desde /api/get-profile y se mantiene sincronizado tras
  // verificación Orb exitosa (vía setIsOrbVerified pasado al TradeCenter).
  const [isOrbVerified, setIsOrbVerified] = useState(false);
  const walletLoading = useRef(false);

  const { setUsername: setGlobalUsername } = useTheme();

  useEffect(() => {
    const init = async () => {
      const isInstalled = MiniKit.isInstalled();
      setMiniKitReady(isInstalled);

      if (isInstalled && MiniKit.user) {
        const u = MiniKit.user.username || null;
        if (u) { setUsername(u); setGlobalUsername(u); }
      }

      const storedId = localStorage.getItem("userId");
      if (storedId) {
        setUserId(storedId);
        try {
          const profileRes = await fetch(`/api/get-profile?userId=${encodeURIComponent(storedId)}`);
          if (profileRes.ok) {
            const { profile } = await profileRes.json();
            if (profile?.verified) {
              setVerified(true);
            }
            // Single source of truth para Orb. Se propaga via prop al
            // TradeCenter — sin hooks duplicados, sin fetches paralelos.
            setIsOrbVerified(profile?.verification_level === "orb");
          } else {
            localStorage.removeItem("userId");
            clearSessionToken();
            setUserId(null);
          }
        } catch (e) {
          console.warn("[App] Error validando sesión persistente.");
        }
      }

      const cachedWallet = localStorage.getItem("wallet");
      if (cachedWallet) setWallet(cachedWallet);
    };

    init();
  }, []);

  useEffect(() => {
    const loadWallet = async () => {
      if (!verified || wallet || !miniKitReady || walletLoading.current) return;

      walletLoading.current = true;
      try {
        const nonceRes = await fetch("/api/nonce");
        const { nonce } = await nonceRes.json();

        const auth = await MiniKit.commandsAsync.walletAuth({
          nonce,
          requestId: "wallet-auth-" + Date.now(),
          expirationTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          statement: "Autenticar cuenta en H Humans",
        });

        const payload = auth?.finalPayload;
        if (payload?.status !== "error" && payload?.address) {
          const verifyRes = await fetch("/api/walletVerify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ payload, nonce, userId }),
          });
          const vData = await verifyRes.json();
          if (vData.success) {
            setWallet(vData.address);
            localStorage.setItem("wallet", vData.address);
            // Persistir session token HMAC firmado por el backend tras SIWE.
            // Es la única identidad criptográfica que aceptan los endpoints
            // sensibles (create totem, execute trade) vía Authorization Bearer.
            if (vData.sessionToken) setSessionToken(vData.sessionToken);
          }
        }
      } catch (err) {
        console.error("[App] Wallet flow failed", err);
      } finally {
        walletLoading.current = false;
      }
    };

    loadWallet();
  }, [verified, miniKitReady]);

  const runVerification = async () => {
    setVerifying(true);
    setError(null);

    try {
      if (!MiniKit.isInstalled()) throw new Error("MiniKit no detectado");

      const verifyRes = await MiniKit.commandsAsync.verify({
        action: WORLDCOIN_ACTION,
        signal: userId ?? "",
        verification_level: VerificationLevel.Device,
      });

      const proof = verifyRes?.finalPayload;
      if (proof?.status === "error") throw new Error("La verificación fue cancelada.");

      // CORRECCIÓN QUIRÚRGICA: Enviamos el payload completo que incluye app_id y signal
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: proof }),
      });

      const result = await res.json();

      if (result.success) {
        // Usamos el nullifier_hash de la respuesta del backend
        const id = result.nullifier_hash || proof.nullifier_hash;
        localStorage.setItem("userId", id);
        setUserId(id);
        setVerified(true);
      } else {
        throw new Error(result.error || "Fallo en la validación del backend.");
      }
    } catch (err: any) {
      setError(err.message || "Error al verificar");
    } finally {
      setVerifying(false);
    }
  };

  const verifyOrb = async (): Promise<{ success: boolean; proof?: any }> => {
    if (!miniKitReady || orbVerifying) return { success: false };
    setOrbVerifying(true);
    try {
      const verifyRes = await MiniKit.commandsAsync.verify({
        action: "user-orb",
        signal: userId ?? "",
        verification_level: VerificationLevel.Orb,
      });
      const proof = verifyRes?.finalPayload;
      
      // Enviamos también la verificación de ORB al backend si es necesario
      return { success: proof?.verification_level === "orb", proof };
    } catch (err) {
      return { success: false };
    } finally {
      setOrbVerifying(false);
    }
  };

  // Setter expuesto al TradeCenter: tras verificación Orb exitosa actualiza
  // el estado global → toda la UI reacciona sin refresh.
  const handleOrbVerifiedChange = useCallback((ok: boolean) => {
    setIsOrbVerified(ok);
  }, []);

  return (
    <HomePage
      userId={userId}
      verifyUser={runVerification}
      verified={verified}
      wallet={wallet}
      username={username}
      avatar={avatar}
      error={error}
      verifying={verifying}
      setUserId={setUserId}
      verifyOrb={verifyOrb}
      isOrbVerified={isOrbVerified}
      onOrbVerifiedChange={handleOrbVerifiedChange}
    />
  );
};

export default App;
