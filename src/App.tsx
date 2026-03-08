import React, { useState, useEffect } from "react";
import HomePage from "./pages/HomePage";
import { MiniKit, VerificationLevel } from "@worldcoin/minikit-js";

const App = () => {
  const [wallet, setWallet] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    try {
      // Inicializamos MiniKit con tu App ID
      MiniKit.install({
        appId: "app_6a98c88249208506dcd4e04b529111fc"
      });

      if (MiniKit.isInstalled()) {
        setWallet(MiniKit.walletAddress);
      } else {
        console.warn("[APP] MiniKit no instalado aún");
      }
    } catch (err) {
      console.error("MiniKit install error:", err);
      setError("Error al instalar MiniKit");
    }
  }, []);

  const verifyUser = async () => {
    if (!wallet || verifying) return;
    setVerifying(true);
    setError(null);

    try {
      const verifyRes = await MiniKit.commandsAsync.verify({
        action: "verify-user",
        signal: wallet,
        verification_level: VerificationLevel.Device,
      });

      console.log("🔥 Payload recibido:", verifyRes);

      const proof = verifyRes?.finalPayload;
      if (!proof) throw new Error("No se recibió proof");

      // Enviamos al backend
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payload: proof,
          walletAddress: MiniKit.walletAddress,
          minikitData: MiniKit.data,
        }),
      });

      const backend = await res.json();
      console.log("✅ Backend response:", backend);

      if (backend.success) {
        localStorage.setItem("userId", proof.nullifier_hash);
        setUserId(proof.nullifier_hash);
        setVerified(true);
      } else {
        setError("Backend rechazó la prueba");
      }

    } catch (err: any) {
      console.error("Verify error:", err);
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
