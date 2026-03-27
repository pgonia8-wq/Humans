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
  const [username, setUsername] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);

  const walletLoading = useRef(false);
  const { setUsername: setGlobalUsername } = useTheme();

  // ✅ 1. Cargar sesión local (rápido, sin MiniKit)
  useEffect(() => {
    const storedId = localStorage.getItem("userId");

    if (storedId) {
      setUserId(storedId);
      setVerified(true);
      console.log("[APP] Sesión encontrada:", storedId);
    } else {
      console.log("[APP] Usuario no logueado");
    }
  }, []);

  // ✅ 2. Verify SOLO cuando usuario toca
  const verifyUser = async () => {
    if (verifying) return;

    setVerifying(true);
    setError(null);

    try {
      console.log("[APP] Verify...");

      // 🔥 MiniKit SOLO aquí
      MiniKit.install({ appId: APP_ID });

      // ✅ LOG AÑADIDO
      console.log(
        "[APP] MiniKit.commandsAsync:",
        Object.keys(MiniKit.commandsAsync || {})
      );

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

        console.log("[APP] Verified:", id);
      } else {
        throw new Error(backend.error);
      }
    } catch (err: any) {
      console.error("[APP] Verify error:", err);
      setError(err.message);
    } finally {
      setVerifying(false);
    }
  };

  // ✅ 3. WalletAuth SOLO después de verify
  useEffect(() => {
    const loadWallet = async () => {
      if (!verified || wallet || verifying || walletLoading.current) return;

      walletLoading.current = true;

      try {
        console.log("[APP] walletAuth...");

        // 🔥 MiniKit SOLO aquí también
        MiniKit.install({ appId: APP_ID });

        const nonceRes = await fetch("/api/nonce");
        if (!nonceRes.ok) throw new Error("No se pudo obtener nonce");

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

        if (address) {
          setWallet(address);
          console.log("[APP] Wallet:", address);
        }

        // ✅ user info después de auth (seguro aquí)
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
  }, [verified, wallet, verifying]);

  // ✅ 4. LOGIN SCREEN instantáneo
  if (!userId) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-black text-white">
        <div className="flex flex-col items-center gap-4">
          <h1 className="text-lg font-semibold">H by Humans</h1>

          <button
            onClick={verifyUser}
            disabled={verifying}
            className="px-4 py-2 bg-white text-black rounded-xl"
          >
            {verifying ? "Verifying..." : "Login with World ID"}
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

  // ✅ 5. APP normal (rápido si ya hay sesión)
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
