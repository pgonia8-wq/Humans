import React, { useState, useEffect, useRef, lazy, Suspense } from "react";
import { MiniKit, VerificationLevel } from "@worldcoin/minikit-js";
import { useTheme } from "./lib/ThemeContext";

// Fix 1: lazy load de HomePage — saca todo el peso del bundle inicial
// La descarga empieza INMEDIATAMENTE al parsear este archivo,
// no cuando React intenta renderizar el componente.
// Esto elimina la descarga secuencial: chunk inicial y chunk de HomePage
// se descargan en paralelo en lugar de uno después del otro.
const homePagePromise = import("./pages/HomePage");
const HomePage = lazy(() => homePagePromise);

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

  // Fix 2: Un solo useEffect en lugar de tres encadenados
  // Antes: mount → setState(miniKitReady) → re-render → setState(verified) → re-render → loadWallet
  // Ahora: mount → todo en secuencia sin ciclos de render intermedios
  useEffect(() => {
    const init = async () => {
      // Paso 1: leer localStorage de forma sincrónica (sin await, sin render extra)
      const storedId = localStorage.getItem("userId");
      if (storedId) {
        setUserId(storedId);
        setVerified(true);
        console.log("[APP] ID cargado de localStorage:", storedId);
      } else {
        console.log("[APP] No hay ID en localStorage, se verificará después de MiniKit");
      }

      // Paso 2: instalar MiniKit
      try {
        console.log("[APP] Instalando MiniKit...");
        MiniKit.install({ appId: APP_ID });

        const installed = MiniKit.isInstalled();
        console.log("[APP] MiniKit.isInstalled():", installed);

        if (!installed) {
          console.warn("[APP] MiniKit no está disponible");
          return;
        }

        setMiniKitReady(true);
        console.log("[APP] MiniKit listo");

        if (MiniKit.user) {
          const u = MiniKit.user.username || null;
          const a = MiniKit.user.avatar_url || null;
          setUsername(u);
          setAvatar(a);
          if (u) setGlobalUsername(u);
          console.log("[APP] MiniKit user:", u, a);
        }

        // Paso 3: si no había ID guardado, verificar ahora que MiniKit está listo
        // Sin esperar un re-render extra — llamada directa
        if (!storedId) {
          await runVerification();
        }
      } catch (err) {
        console.error("[APP] Error instalando MiniKit:", err);
        setError("Error instalando MiniKit");
      }
    };

    init();
  }, []); // Un solo efecto, sin dependencias cruzadas

  // Wallet auth: sigue siendo efecto separado porque depende de verified + miniKitReady
  // pero ahora ambos se setean en el mismo render (init effect), no en renders distintos
  useEffect(() => {
    const loadWallet = async () => {
      if (!verified || wallet || verifying || !miniKitReady || walletLoading.current) {
        return;
      }

      walletLoading.current = true;
      console.log("[APP] Iniciando walletAuth...");

      try {
        const nonceRes = await fetch("/api/nonce");
        if (!nonceRes.ok) throw new Error("No se pudo obtener nonce");
        const { nonce } = await nonceRes.json();

        console.log("[APP] Nonce recibido:", nonce);

        const auth = await MiniKit.commandsAsync.walletAuth({
          nonce,
          requestId: "wallet-auth-" + Date.now(),
          expirationTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          notBefore: new Date(Date.now() - 60 * 1000),
          statement: "Autenticar wallet para H humans",
        });

        console.log("[APP] walletAuth result:", auth);

        const finalPayload = auth?.finalPayload;
        const address = finalPayload?.address || finalPayload?.wallet_address || null;

        // Error #2 corregido: verificar en el backend que el nonce fue emitido por nosotros
        if (finalPayload?.status === "success" && nonce) {
          try {
            const walletVerifyRes = await fetch("/api/walletVerify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ nonce, address: address || "", status: finalPayload.status }),
            });
            if (!walletVerifyRes.ok) {
              const errData = await walletVerifyRes.json().catch(() => ({}));
              console.error("[APP] Backend rechazó walletVerify:", errData);
              throw new Error(errData.error || "Verificación de wallet fallida en el backend");
            }
            console.log("[APP] WalletVerify: nonce y wallet validados en backend");
          } catch (verifyErr) {
            console.error("[APP] Error en walletVerify:", verifyErr);
            throw verifyErr;
          }
        }

        if (address) {
          setWallet(address);
          console.log("[APP] Wallet obtenida:", address);
        } else {
          console.warn("[APP] WalletAuth success pero sin address");
        }

        if (MiniKit.user) {
          const u = MiniKit.user.username || null;
          const a = MiniKit.user.avatar_url || null;
          setUsername(u);
          setAvatar(a);
          if (u) setGlobalUsername(u);
          console.log("[APP] MiniKit user post-walletAuth:", u, a);
        }
      } catch (err: any) {
        console.error("[APP] Error walletAuth:", err);
        setError(err.message || "Error autenticando wallet");
      } finally {
        walletLoading.current = false;
      }
    };

    loadWallet();
  }, [verified, wallet, verifying, miniKitReady]);

  // Verificación interna usada por el init effect (MiniKit ya está listo aquí)
  const runVerification = async () => {
    setVerifying(true);
    setError(null);

    try {
      if (!MiniKit.isInstalled()) throw new Error("MiniKit no instalado");

      console.log("[APP] Iniciando verify...");

      const verifyRes = await MiniKit.commandsAsync.verify({
        action: "verify-user",
        verification_level: VerificationLevel.Device,
      });

      console.log("[APP] Verify response:", verifyRes);

      const proof = verifyRes?.finalPayload;
      if (!proof) throw new Error("No se recibió proof");

      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: proof }),
      });

      if (!res.ok) {
        const text = await res.text();
        if (text.includes("already verified") && proof.nullifier_hash) {
          console.log("[APP] Usuario ya verificado, usando nullifier_hash existente");
          const id = proof.nullifier_hash;
          localStorage.setItem("userId", id);
          setUserId(id);
          setVerified(true);
          return;
        } else {
          throw new Error(`Backend error: ${text}`);
        }
      }

      const backend = await res.json();
      console.log("[APP] Backend verify:", backend);

      if (backend.success && proof.nullifier_hash) {
        const id = proof.nullifier_hash;
        localStorage.setItem("userId", id);
        setUserId(id);
        setVerified(true);
        console.log("[APP] Usuario verificado:", id);
      } else {
        throw new Error(backend.error || "Backend rechazó la prueba");
      }
    } catch (err: any) {
      console.error("[APP] Verify error:", err);
      setError(err.message || "Error verificando usuario");
    } finally {
      setVerifying(false);
    }
  };

  // verifyUser sigue disponible como prop para que HomePage lo pueda llamar manualmente
  const verifyUser = async () => {
    if (verifying || !miniKitReady) return;
    await runVerification();
  };

  return (
    // Fix 1: Suspense con fondo negro igual al tema oscuro
    // Evita el flash blanco mientras carga el chunk de HomePage
    <Suspense fallback={<div className="min-h-screen bg-[#09090b]" />}>
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
    </Suspense>
  );
};

export default App;
