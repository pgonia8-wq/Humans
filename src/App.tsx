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
      MiniKit.install();
      if (MiniKit.isInstalled()) {
        setWallet(MiniKit.walletAddress);
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

      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payload: proof,
          walletAddress: MiniKit.walletAddress,   // <-- agregado
          minikitData: MiniKit.data               // <-- agregado
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
    <HomePage userId={userId} />
  );
};

export default App;
