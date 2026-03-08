import React, { useState, useEffect } from "react";
import { MiniKit, VerificationLevel } from "@worldcoin/minikit-js";

const APP_ID = "app_6a98c88249208506dcd4e04b529111fc"; // <-- tu App ID

const App = () => {
  const [wallet, setWallet] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    try {
      MiniKit.install({ appId: APP_ID }); // <-- App ID aplicado
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
          walletAddress: MiniKit.walletAddress,
          minikitData: MiniKit.data
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
    <div>
      <button onClick={verifyUser} disabled={verifying || verified}>
        {verified ? "Verificado ✅" : verifying ? "Verificando…" : "Verificar"}
      </button>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
};

export default App;
