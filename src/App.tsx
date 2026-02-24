import React, { useEffect, useState } from "react";
import FeedPage from "./pages/FeedPage";
import { useMiniKitUser } from "./lib/useMiniKitUser";

const App: React.FC = () => {
  const { walletAddress, status, verifyOrb, isVerifying } = useMiniKitUser();
  const [verified, setVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [retryCount, setRetryCount] = useState(() => {
    const saved = localStorage.getItem("retryCount");
    return saved ? parseInt(saved, 10) : 0;
  });
  const [isRetrying, setIsRetrying] = useState(false);
  const [backendResult, setBackendResult] = useState<string | null>(null);
  const [lastPayload, setLastPayload] = useState<any>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);

  // Guardar retryCount en localStorage
  useEffect(() => {
    localStorage.setItem("retryCount", retryCount.toString());
  }, [retryCount]);

  // AUTO-RETRY seguro cada 6 segundos si está stuck
  useEffect(() => {
    let interval: NodeJS.Timer;
    if (
      (status === "initializing" || status === "polling" || status === "error") &&
      !verified
    ) {
      interval = setInterval(() => {
        setRetryCount((c) => c + 1);
        setIsRetrying(true);
        setTimeout(() => setIsRetrying(false), 2000);
      }, 6000);
    }
    return () => clearInterval(interval);
  }, [status, verified]);

  // Verificación cuando status llegue a "found"
  useEffect(() => {
    if (status !== "found" || !walletAddress || verified) return;

    const doVerify = async () => {
      setVerifying(true);
      setBackendResult(null);
      setLastPayload(null);
      setLastAction(null);

      try {
        const action = "verifica-que-eres-humano";
        setLastAction(action);

        // Generar proof Orb
        const orbProof = await verifyOrb(action, walletAddress);
        setLastPayload(orbProof);

        // Enviar al backend
        const res = await fetch("/api/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            payload: orbProof,
            action,
            signal: walletAddress,
          }),
        });

        const result = await res.json();
        if (result.success) {
          setVerified(true);
          setBackendResult("✅ Verificado correctamente");
        } else {
          setBackendResult("❌ Backend rechazó el proof");
        }
      } catch (err: any) {
        setBackendResult(`❌ Error: ${err.message}`);
      } finally {
        setVerifying(false);
      }
    };

    doVerify();
  }, [status, walletAddress, verified, verifyOrb]);

  // Pantalla de carga
  if (
    !status ||
    status === "initializing" ||
    status === "polling" ||
    isVerifying ||
    verifying
  ) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-black text-white text-center p-6">
        Cargando World ID...<br />
        Status: {status || "esperando"}<br />
        Wallet: {walletAddress || "sin wallet"}<br />
        Verificando: {verifying ? "Sí" : "No"}
      </div>
    );
  }

  // Error o no detectado
  if (!walletAddress || status === "not-installed" || status === "timeout" || status === "error") {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-black text-white text-center p-6 gap-6">
        <div className="text-xl font-bold">
          Esta aplicación solo funciona dentro de World App y con World ID verificado.
        </div>
        <div className="text-sm text-gray-400">
          Status: {status || "desconocido"}<br />
          Wallet: {walletAddress || "sin wallet"}<br />
          Intentos totales: {retryCount}
        </div>
        {isRetrying ? (
          <div className="text-lg text-yellow-400">Reintentando...</div>
        ) : (
          <button
            onClick={() => {
              setRetryCount((c) => c + 1);
              setIsRetrying(true);
              setTimeout(() => setIsRetrying(false), 1000);
            }}
            disabled={isRetrying}
            className="px-8 py-4 bg-white text-black rounded-xl font-bold text-lg active:scale-95 transition-transform disabled:opacity-50"
          >
            Reintentar detección
          </button>
        )}
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

      {/* 🔹 Panel de debug completo */}
      <div className="fixed bottom-0 left-0 w-full bg-black bg-opacity-90 text-white p-2 text-xs z-50 flex flex-col gap-1 max-h-64 overflow-y-auto">
        <div>Status: {status}</div>
        <div>Wallet: {walletAddress}</div>
        <div>Verificando Orb: {verifying ? "Sí" : "No"}</div>
        <div>Verificado: {verified ? "✅ Sí" : "❌ No"}</div>
        <div>Backend: {backendResult || "esperando..."}</div>
        <div>Acción enviada: {lastAction || "-"}</div>
        <div>
          Payload Orb (truncado):
          {lastPayload
            ? " " +
              JSON.stringify(lastPayload)
                .replace(/\s/g, "")
                .slice(0, 200) + "..."
            : "-"}
        </div>
      </div>
    </div>
  );
};

export default App;
