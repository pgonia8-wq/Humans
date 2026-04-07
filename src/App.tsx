import React, { useState, useEffect, useRef } from "react";
import { MiniKit, VerificationLevel } from "@worldcoin/minikit-js";
import { useTheme } from "./lib/ThemeContext";
import HomePage from "./pages/HomePage";

const APP_ID = (import.meta as any).env?.VITE_APP_ID ?? "";

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

  const { setUsername: setGlobalUsername } = useTheme();

  useEffect(() => {
    const init = async () => {
      const storedId = localStorage.getItem("userId");
      if (storedId) {
        setUserId(storedId);
        setVerified(true);
      }

      try {
        MiniKit.install({ appId: APP_ID });

        const installed = MiniKit.isInstalled();

        if (!installed) {
          console.warn("[APP] MiniKit no está disponible");
          return;
        }

        setMiniKitReady(true);

        if (MiniKit.user) {
          const u = MiniKit.user.username || null;
          const a = MiniKit.user.avatar_url || null;
          setUsername(u);
          setAvatar(a);
          if (u) setGlobalUsername(u);
        }

        if (!storedId) {
          await runVerification();
        }
      } catch (err) {
        console.error("[APP] Error instalando MiniKit:", err);
        setError("Error instalando MiniKit");
      }
    };

    init();
  }, []);

  useEffect(() => {
    const loadWallet = async () => {
      if (!verified || wallet || verifying || !miniKitReady || walletLoading.current) {
        return;
      }

      walletLoading.current = true;

      try {
        const nonceRes = await fetch("/api/nonce");
        if (!nonceRes.ok) throw new Error("No se pudo obtener nonce");
        const { nonce } = await nonceRes.json();

        const auth = await MiniKit.commandsAsync.walletAuth({
          nonce,
          requestId: "wallet-auth-" + Date.now(),
          expirationTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          notBefore: new Date(Date.now() - 60 * 1000),
          statement: "Autenticar wallet para H humans",
        });

        const address =
          auth?.finalPayload?.address || auth?.finalPayload?.wallet_address || null;

        if (address) {
          setWallet(address);
        } else {
          console.warn("[APP] WalletAuth success pero sin address");
        }

        if (MiniKit.user) {
          const u = MiniKit.user.username || null;
          const a = MiniKit.user.avatar_url || null;
          setUsername(u);
          setAvatar(a);
          if (u) setGlobalUsername(u);
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

  const runVerification = async () => {
    setVerifying(true);
    setError(null);

    try {
      if (!MiniKit.isInstalled()) throw new Error("MiniKit no instalado");

      const verifyRes = await MiniKit.commandsAsync.verify({
        action: "verify-user",
        verification_level: VerificationLevel.Device,
      });

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

      if (backend.success && proof.nullifier_hash) {
        const id = proof.nullifier_hash;
        localStorage.setItem("userId", id);
        setUserId(id);
        setVerified(true);
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

  const verifyUser = async () => {
    if (verifying || !miniKitReady) return;
    await runVerification();
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
