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

  const walletLoading = useRef(false);
  const { setUsername: setGlobalUsername } = useTheme();

  // Cargar userId de localStorage de forma SINCRONA (lo más temprano posible)
  useEffect(() => {
    const storedId = localStorage.getItem("userId");
    if (storedId) {
      setUserId(storedId);
      setVerified(true);
      console.log("[APP] Usuario recurrente - ID cargado de localStorage:", storedId);
    }
  }, []);

  // Inicializar MiniKit
  useEffect(() => {
    const initMiniKit = async () => {
      try {
        MiniKit.install({ appId: APP_ID });
        if (MiniKit.isInstalled()) {
          setMiniKitReady(true);

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
      }
    };

    initMiniKit();
  }, []);

  // WalletAuth SOLO si es usuario verificado Y NO tiene wallet aún
  useEffect(() => {
    const loadWallet = async () => {
      if (!verified || wallet || !miniKitReady || walletLoading.current) return;

      walletLoading.current = true;
      try {
        const nonceRes = await fetch("/api/nonce");
        if (!nonceRes.ok) throw new Error("No nonce");
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

        // Actualizar username/avatar
        if (MiniKit.user) {
          const u = MiniKit.user.username || null;
          const a = MiniKit.user.avatar_url || null;
          setUsername(u);
          setAvatar(a);
          if (u) setGlobalUsername(u);
        }
      } catch (err: any) {
        console.error("[APP] walletAuth error:", err);
      } finally {
        walletLoading.current = false;
      }
    };

    if (verified && miniKitReady) loadWallet();
  }, [verified, wallet, miniKitReady]);

  const verifyUser = async () => { /* tu función verifyUser actual, sin cambios */ };

  // Renderizar HomePage DIRECTO si ya tenemos userId (usuarios recurrentes)
  // Solo mostramos loading si estamos verificando a un usuario nuevo
  if (verifying || (!userId && !verified)) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#000000",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "#ffffff",
        fontFamily: "system-ui, sans-serif",
        textAlign: "center"
      }}>
        <div style={{
          width: "56px", height: "56px",
          border: "6px solid rgba(255,255,255,0.2)",
          borderTopColor: "#6366f1",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
          marginBottom: "24px"
        }} />
        <p style={{ fontSize: "18px" }}>Cargando H humans...</p>
        <p style={{ fontSize: "14px", opacity: 0.7, marginTop: "8px" }}>
          Preparando tu perfil...
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
