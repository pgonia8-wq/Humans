import React, { useState, useEffect } from "react";
import HomePage from "./pages/HomePage";
import { MiniKit, VerificationLevel } from "@worldcoin/minikit-js";

const App = () => {
  const [wallet, setWallet] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Carga ID de localStorage
  useEffect(() => {
    const storedId = localStorage.getItem("userId");
    if (storedId) {
      setUserId(storedId);
      setVerified(true);
      console.log("[APP] ID cargado de localStorage:", storedId);
    }
  }, []);

  // Inicializa MiniKit + fuerza permisos
  useEffect(() => {
    console.log("[APP] Inicializando MiniKit...");
    try {
      MiniKit.install({
        appId: "app_6a98c88249208506dcd4e04b529111fc",
      });

      const installed = MiniKit.isInstalled();
      console.log("[APP] MiniKit.isInstalled():", installed);

      if (installed) {
        // Fuerza fetch de permisos
        MiniKit.fetchPermissions()
          .then((perms) => {
            console.log("[APP] Permisos fetched:", perms);
            // Intenta forzar wallet
            const w = MiniKit.walletAddress;
            setWallet(w);
            console.log("[APP] Wallet después de fetchPermissions:", w);
          })
          .catch((err) => console.error("[APP] Error fetch permissions:", err));
      }
    } catch (err) {
      console.error("[APP] MiniKit install error:", err);
      setError("Error al instalar MiniKit");
    }
  }, []);

  const verifyUser = async () => {
    if (verifying) return;
    setVerifying(true);
    setError(null);

    try {
      if (!MiniKit.isInstalled()) throw new Error("MiniKit no instalado");

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
