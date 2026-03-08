import { useState, useEffect } from "react";
import { MiniKit, VerificationLevel } from "@worldcoin/minikit-js";
import HomePage from "./pages/HomePage";
import ErrorBoundary from "./components/ErrorBoundary";

function App() {
  const [verified, setVerified] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Carga userId de localStorage si ya verificado
    const storedUserId = localStorage.getItem('userId');
    if (storedUserId) {
      setUserId(storedUserId);
      setVerified(true);
    }
  }, []);

  const handleVerify = async () => {
    try {
      setError(null);
      setMessage("Verificando con H…");

      if (!MiniKit.isInstalled()) {
        setError("World App no detectada");
        return;
      }

      const verifyRes = await MiniKit.commandsAsync.verify({
        action: "verify-user",
        verification_level: VerificationLevel.Device,
      });

      const finalPayload = verifyRes?.finalPayload;

      // ── INSERT LOG PARA DEPURAR nullifier_hash ──
      console.log("verifyRes:", verifyRes);
      console.log("finalPayload.proof:", finalPayload?.proof);
      console.log("nullifier_hash:", finalPayload?.proof?.nullifier_hash);

      if (!finalPayload || finalPayload.status !== "success") {
        setError("Verificación cancelada o fallida");
        return;
      }

      const proofData = finalPayload.proof;
      if (!proofData) {
        setError("No se encontró proof válido");
        return;
      }

      const id = proofData.nullifier_hash;  // identificador único de World ID

      // Guardar en localStorage antes de renderizar HomePage
      localStorage.setItem('userId', id);
      setUserId(id);

      const body = {
        proof: proofData.proof,
        merkle_root: proofData.merkle_root,
        nullifier_hash: proofData.nullifier_hash,
        verification_level: proofData.verification_level,
        action: "verify-user",
        max_age: 7200,
        userId: id,
      };

      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = await res.json();

      if (result.success) {
        setVerified(true);  // ahora HomePage se renderizará con userId definido
        setMessage("✅ Verificación exitosa");
      } else {
        setError("Backend rechazó la prueba: " + (result.error || ""));
      }
    } catch (err: any) {
      setError("Error durante verificación: " + err.message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      {!verified || !userId ? (
        <div className="bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center w-full max-w-md">
          <img
            src="/logo.png"
            alt="Logo H"
            className="w-40 h-40 rounded-full mb-6 shadow-lg object-contain"  // logo centrado
          />
          <p className="text-black text-2xl font-bold mb-6 text-center">
            Verificando con H…
          </p>
          <button
            onClick={handleVerify}
            className="px-8 py-3 bg-black text-white rounded-full shadow-lg hover:bg-gray-800 transition"
          >
            Iniciar verificación
          </button>
          {message && <p className="mt-4 text-gray-700">{message}</p>}
          {error && <p className="mt-2 text-red-600">{error}</p>}
        </div>
      ) : (
        <ErrorBoundary>
          <HomePage userId={userId} />
        </ErrorBoundary>
      )}
    </div>
  );
}

export default App;
