import React, { useEffect, useState } from "react";
import FeedPage from "./pages/FeedPage";
import { useMiniKitUser } from "./lib/useMiniKitUser";

const App: React.FC = () => {
  const { walletAddress, status, verifyOrb, isVerifying } = useMiniKitUser();
  const [verified, setVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  console.log('🔍 Estado completo:', { 
    status: status || 'sin-status', 
    wallet: walletAddress ? walletAddress.slice(0,8)+'...' : 'sin-wallet', 
    isVerifying, 
    verified,
    retryCount 
  });

  useEffect(() => {
    if (status !== "found" || !walletAddress || verified) return;

    const doVerify = async () => {
      setVerifying(true);
      try {
        console.log("🚀 Iniciando verificación Orb");
        const orbProof = await verifyOrb("verify_user", walletAddress);

        const res = await fetch("/api/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            payload: orbProof,
            action: "verify_user",
            signal: walletAddress,
          }),
        });

        const result = await res.json();
        if (result.success) {
          setVerified(true);
          console.log("✅ Verificación exitosa");
        } else {
          console.error("❌ Backend rechazó", result);
        }
      } catch (err) {
        console.error("❌ Error verificación:", err);
      } finally {
        setVerifying(false);
      }
    };

    doVerify();
  }, [status, walletAddress, verified, verifyOrb]);

  // Pantalla de carga
  if (!status || status === "initializing" || status === "polling" || isVerifying || verifying) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-black text-white text-center p-6">
        Cargando World ID...<br />
        Status: {status || 'esperando bridge'}
      </div>
    );
  }

  // No detectado (con botón de reintentar)
  if (!walletAddress || status === "not-installed" || status === "timeout") {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-black text-white text-center p-6 gap-6">
        <div>
          Esta aplicación solo funciona dentro de World App<br />
          y con World ID verificado.
        </div>
        <div className="text-sm text-gray-400">
          Status: {status || 'not-installed'}<br />
          Intentos: {retryCount}
        </div>
        <button 
          onClick={() => {
            setRetryCount(c => c + 1);
            window.location.reload();
          }}
          className="px-8 py-4 bg-white text-black rounded-xl font-bold text-lg active:scale-95"
        >
          Reintentar detección
        </button>
      </div>
    );
  }

  // Verificando
  if (!verified) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-black text-white text-center p-6">
        Verificando World ID...<br />
        Wallet detectada
      </div>
    );
  }

  // App principal
  return (
    <div className="w-screen h-screen bg-black text-white flex flex-col">
      <header className="p-4 text-xl font-bold text-center">Human Feed</header>
      <main className="flex-1 overflow-auto p-4">
        <FeedPage wallet={walletAddress} />
      </main>
    </div>
  );
};

export default App;
