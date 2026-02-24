import React, { useEffect, useState } from "react";
import FeedPage from "./pages/FeedPage";
import { useMiniKitUser } from "./lib/useMiniKitUser";
import { MiniKit } from "@worldcoin/minikit-js";

const App: React.FC = () => {
  const { walletAddress, status, verifyOrb, proof, isVerifying } = useMiniKitUser();
  const [verified, setVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Contador persistente con localStorage (no se resetea al reload)
  const [retryCount, setRetryCount] = useState(() => {
    const saved = localStorage.getItem('retryCount');
    return saved ? parseInt(saved, 10) : 0;
  });

  // Guardar contador en localStorage cada vez que cambia
  useEffect(() => {
    localStorage.setItem('retryCount', retryCount.toString());
  }, [retryCount]);

  // Timeout para detectar atascado (20 segundos)
  const [loadTimeout, setLoadTimeout] = useState(false);

  // Logs de debug detallados
  useEffect(() => {
    console.log('🔍 MiniKit.isInstalled:', MiniKit.isInstalled?.() ?? 'no disponible');
    console.log('🔍 Status actual:', status ?? 'sin-status');
    console.log('🔍 Wallet:', walletAddress ?? 'sin-wallet');
    console.log('🔍 isVerifying:', isVerifying);
    console.log('🔍 verified:', verified);
    console.log('🔍 Intentos totales:', retryCount);
  }, [status, walletAddress, isVerifying, verified, retryCount]);

  // Timeout visual de 20 segundos
  useEffect(() => {
    const timer = setTimeout(() => setLoadTimeout(true), 20000);
    return () => clearTimeout(timer);
  }, []);

  // AUTO-RETRY cada 6 segundos mientras esté en initializing / polling
  useEffect(() => {
    if (status === "initializing" || status === "polling") {
      const interval = setInterval(() => {
        setRetryCount(c => c + 1);
        MiniKit.install();
        console.log('Auto-retry MiniKit.install() - intento:', retryCount + 1);
      }, 6000); // cada 6 segundos (ajusta si quieres más rápido, ej: 4000)

      return () => clearInterval(interval);
    }
  }, [status, retryCount]);

  // Verificación cuando llegue a "found"
  useEffect(() => {
    if (status !== "found" || !walletAddress || verified) {
      console.log('⏳ Esperando "found"... actual:', status);
      return;
    }

    const doVerify = async () => {
      setVerifying(true);
      try {
        console.log("🚀 Verificando Orb - wallet:", walletAddress);
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

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const result = await res.json();
        if (result.success) {
          setVerified(true);
          console.log("✅ Éxito");
        } else {
          console.error("❌ Backend rechazó:", result);
        }
      } catch (err) {
        console.error("❌ Error verificación:", err);
      } finally {
        setVerifying(false);
      }
    };

    doVerify();
  }, [status, walletAddress, verified, verifyOrb]);

  // Pantalla de carga con timeout
  if (!status || status === "initializing" || status === "polling" || isVerifying || verifying) {
    if (loadTimeout) {
      return (
        <div className="w-screen h-screen flex flex-col items-center justify-center bg-black text-white text-center p-6 gap-6">
          <div className="text-xl font-bold">Cargando World ID... (tomando mucho tiempo)</div>
          <div>Status: {status || 'esperando'}</div>
          <div>Intentos auto/manual: {retryCount}</div>
          <button
            onClick={() => {
              setRetryCount(c => c + 1);
              setLoadTimeout(false);
              MiniKit.install();
            }}
            className="px-8 py-4 bg-white text-black rounded-xl font-bold text-lg active:scale-95"
          >
            Reintentar manual
          </button>
        </div>
      );
    }

    return (
      <div className="w-screen h-screen flex items-center justify-center bg-black text-white text-center p-6">
        Cargando World ID...<br />
        Status: {status || 'esperando'}<br />
        Intentos: {retryCount}
      </div>
    );
  }

  // Error / no detectado
  if (!walletAddress || status === "not-installed" || status === "timeout" || status === "error") {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-black text-white text-center p-6 gap-6">
        <div className="text-xl font-bold">
          Esta aplicación solo funciona dentro de World App<br />
          y con World ID verificado.
        </div>
        <div className="text-sm text-gray-400">
          Status: {status || 'desconocido'}<br />
          Intentos totales: {retryCount}
        </div>
        <button
          onClick={() => {
            setRetryCount(c => c + 1);
            setLoadTimeout(false);
            MiniKit.install();
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
        Wallet detectada: {walletAddress.slice(0, 6)}...
      </div>
    );
  }

  // Pantalla principal
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
