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

  const { setUsername: setGlobalUsername } = useTheme();

  useEffect(() => {
    if (!MiniKit.isInstalled()) {
      console.warn("[APP] MiniKit no instalado");
      return;
    }

    console.log("[APP] MiniKit instalado - inicializando...");

    // Inicializar MiniKit y obtener usuario si ya está autenticado
    MiniKit.init({
      appId: APP_ID,
    }).then(() => {
      console.log("[APP] MiniKit inicializado");
      if (MiniKit.user) {
        const u = MiniKit.user.username || null;
        const a = MiniKit.user.avatar_url || null;
        setUsername(u);
        setAvatar(a);
        if (u) setGlobalUsername(u); // <-- AGREGADO
        console.log("[APP] MiniKit user:", u, a);
      }
    }).catch(err => {
      console.error("[APP] Error inicializando MiniKit:", err);
    });

    // Escuchar evento de wallet auth
    const unsubscribe = MiniKit.subscribe("wallet-auth", (payload) => {
      console.log("[APP] Wallet auth payload:", payload);
      if (payload?.finalPayload?.status === "success") {
        const u = payload.finalPayload.user?.username || null;
        const a = payload.finalPayload.user?.avatar_url || null;
        setUsername(u);
        setAvatar(a);
        if (u) setGlobalUsername(u); // <-- AGREGADO
        console.log("[APP] MiniKit user post-walletAuth:", u, a);
      }
    });

    return () => unsubscribe();
  }, []);

  const verifyUser = async () => {
    if (!MiniKit.isInstalled()) {
      setError("MiniKit no instalado");
      return;
    }

    if (verifying) return;

    setVerifying(true);
    setError(null);

    try {
      console.log("[APP] Iniciando verificación...");
      const { finalPayload } = await MiniKit.commandsAsync.verify({
        action: "verify-user",
        verification_level: VerificationLevel.Orb,
      });

      console.log("[APP] Verify response:", finalPayload);

      if (finalPayload?.status === "success") {
        setVerified(true);
        console.log("[APP] Verificación exitosa");
      } else {
        setError("Verificación fallida");
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
