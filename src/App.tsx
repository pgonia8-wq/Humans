import React, { useState, useEffect, useRef } from "react";
import HomePage from "./pages/HomePage";
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

  const walletLoading = useRef(false);
  const MiniKitRef = useRef<any>(null);
  const VerificationLevelRef = useRef<any>(null);

  const { setUsername: setGlobalUsername } = useTheme();

  // ✅ Sesión inmediata
  useEffect(() => {
    const storedId = localStorage.getItem("userId");

    if (storedId) {
      setUserId(storedId);
      setVerified(true);
      console.log("[APP] Sesión encontrada:", storedId);
    }
  }, []);

  // ✅ 🔥 Carga dinámica de MiniKit (NO bloquea splash)
  useEffect(() => {
    setTimeout(async () => {
      try {
        console.log("[APP] Loading MiniKit dynamically...");

        const mod = await import("@worldcoin/minikit-js");

        MiniKitRef.current = mod.MiniKit;
        VerificationLevelRef.current = mod.VerificationLevel;

        const MiniKit = MiniKitRef.current;

        MiniKit.install({ appId: APP_ID });

        if (!MiniKit.isInstalled()) return;

        setMiniKitReady(true);

        if (MiniKit.user) {
          const u = MiniKit.user.username || null;
          const a = MiniKit.user.avatar_url || null;

          setUsername(u);
          setAvatar(a);
          if (u) setGlobalUsername(u);
        }

        console.log("[APP] MiniKit ready (lazy)");
      } catch (err) {
        console.error("[APP] MiniKit load error:", err);
        setError("MiniKit error");
      }
    }, 0);
  }, []);

  // ✅ WalletAuth
  useEffect(() => {
    const loadWallet = async () => {
      if (
        !verified ||
        wallet ||
        verifying ||
        !miniKitReady ||
        walletLoading.current
      ) return;

      walletLoading.current = true;

      try {
        const MiniKit = MiniKitRef.current;

        const nonceRes = await fetch("/api/nonce");
        if (!nonceRes.ok) throw new Error("No nonce");

        const { nonce } = await nonceRes.json();

        const auth = await MiniKit.commandsAsync.walletAuth({
          nonce,
          requestId: "wallet-auth-" + Date.now(),
          expirationTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          notBefore: new Date(Date.now() - 60 * 1000),
          statement: "Autenticar wallet",
        });

        const address =
          auth?.finalPayload?.address ||
          auth?.finalPayload?.wallet_address ||
          null;

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
        setError(err.message);
      } finally {
        walletLoading.current = false;
      }
    };

    loadWallet();
  }, [verified, wallet, verifying, miniKitReady]);

  // ✅ Verify manual
  const verifyUser = async () => {
    if (verifying || !miniKitReady) return;

    setVerifying(true);
    setError(null);

    try {
      const MiniKit = MiniKitRef.current;
      const VerificationLevel = VerificationLevelRef.current;

      const verifyRes = await MiniKit.commandsAsync.verify({
        action: "verify-user",
        verification_level: VerificationLevel.Device,
      });

      const proof = verifyRes?.finalPayload;
      if (!proof) throw new Error("No proof");

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
        }

        throw new Error(text);
      }

      const backend = await res.json();

      if (backend.success && proof.nullifier_hash) {
        const id = proof.nullifier_hash;
        localStorage.setItem("userId", id);
        setUserId(id);
        setVerified(true);
      } else {
        throw new Error(backend.error);
      }
    } catch (err: any) {
      console.error("[APP] verify error:", err);
      setError(err.message);
    } finally {
      setVerifying(false);
    }
  };

  // ✅ LOGIN instantáneo
  if (!userId) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-black text-white">
        <div className="flex flex-col items-center gap-4">
          <h1 className="text-lg font-semibold">H by Humans</h1>

          <button
            onClick={verifyUser}
            disabled={!miniKitReady || verifying}
            className="px-4 py-2 bg-white text-black rounded-xl"
          >
            {verifying
              ? "Verifying..."
              : !miniKitReady
              ? "Loading..."
              : "Login with World ID"}
          </button>

          {error && (
            <p className="text-red-400 text-sm text-center max-w-xs">
              {error}
            </p>
          )}
        </div>
      </div>
    );
  }

  // ✅ App directa
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
