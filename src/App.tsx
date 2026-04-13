import React, { useState, useEffect, useRef } from "react";
  import { MiniKit, VerificationLevel } from "@worldcoin/minikit-js";
  import { useTheme } from "./lib/ThemeContext";
  import HomePage from "./pages/HomePage";

  const App = () => {
    const [wallet, setWallet] = useState<string | null>(null);
    const [verified, setVerified] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [miniKitReady, setMiniKitReady] = useState(false);
    const [orbVerifying, setOrbVerifying] = useState(false);
    const [username, setUsername] = useState<string | null>(null);
    const [avatar, setAvatar] = useState<string | null>(null);
    const walletLoading = useRef(false);

    const { setUsername: setGlobalUsername } = useTheme();

    useEffect(() => {
      const init = async () => {
        console.log("[App] Init started");
        console.log("[App] MiniKit.isInstalled:", MiniKit.isInstalled());

        const isInstalled = MiniKit.isInstalled();
        setMiniKitReady(isInstalled);

        if (isInstalled && MiniKit.user) {
          const u = MiniKit.user.username || null;
          const a = (MiniKit.user as any).profilePictureUrl || null;
          if (u) { setUsername(u); setGlobalUsername(u); }
          if (a) setAvatar(a);
          console.log("[App] MiniKit user:", JSON.stringify(MiniKit.user));
        }

        const storedId = localStorage.getItem("userId");
        console.log("[App] storedId:", storedId ? storedId.slice(0, 12) + "..." : "null");
        if (storedId) {
          setUserId(storedId);
          try {
            const profileRes = await fetch(`/api/get-profile?userId=${encodeURIComponent(storedId)}`);
            if (profileRes.ok) {
              const { profile } = await profileRes.json();
              if (profile?.verification_level) {
                setVerified(true);
                console.log("[App] Backend confirmed verification:", profile.verification_level);
              } else {
                localStorage.removeItem("userId");
                setUserId(null);
                console.warn("[App] Backend: userId not verified, cleared");
              }
            } else {
              localStorage.removeItem("userId");
              setUserId(null);
              console.warn("[App] Backend profile not found, cleared");
            }
          } catch (e) {
            console.warn("[App] Could not re-validate userId, requiring fresh verification");
            localStorage.removeItem("userId");
            setUserId(null);
          }
        }

        const cachedWallet = localStorage.getItem("wallet");
        if (cachedWallet) {
          setWallet(cachedWallet);
          console.log("[App] Cached wallet:", cachedWallet.slice(0, 10) + "...");
        }

        console.log("[App] Init complete");
      };

      init();
    }, []);

    useEffect(() => {
      const loadWallet = async () => {
        if (!verified || wallet || verifying || !miniKitReady || walletLoading.current) return;

        if (localStorage.getItem("wallet")) {
          setWallet(localStorage.getItem("wallet")!);
          console.log("[App] Wallet cache hit");
          return;
        }

        walletLoading.current = true;
        console.log("[App] Fetching nonce...");

        try {
          const nonceRes = await fetch("/api/nonce");
          if (!nonceRes.ok) throw new Error("nonce failed");
          const { nonce } = await nonceRes.json();
          console.log("[App] Got nonce, calling walletAuth...");

          const auth = await MiniKit.commandsAsync.walletAuth({
            nonce,
            requestId: "wallet-auth-" + Date.now(),
            expirationTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            notBefore: new Date(Date.now() - 60 * 1000),
            statement: "Autenticar wallet para H humans",
          });

          const payload = auth?.finalPayload;
          console.log("[App] walletAuth status:", payload?.status);

          if (payload?.status === "error") {
            console.warn("[App] WalletAuth error:", JSON.stringify(payload));
            walletLoading.current = false;
            return;
          }

          if (payload?.address && payload?.message && payload?.signature) {
            console.log("[App] WalletAuth success:", payload.address.slice(0, 10) + "...");

            fetch("/api/walletVerify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ payload, nonce, userId }),
            })
              .then(r => r.json())
              .then(vData => {
                if (vData.success) {
                  setWallet(vData.address);
                  localStorage.setItem("wallet", vData.address);
                  console.log("[App] Wallet verified + cached");
                } else {
                  console.warn("[App] Verify rejected:", vData.error);
                }
                walletLoading.current = false;
              })
              .catch(e => {
                console.warn("[App] Verify error:", e);
                walletLoading.current = false;
              });

            const addr = payload.address || (MiniKit as any).user?.walletAddress;
            if (addr) {
              fetch(`https://usernames.worldcoin.org/api/v1/${addr}`)
                .then(r => r.ok ? r.json() : null)
                .then(data => {
                  if (data) {
                    const u = data.username || null;
                    const a = data.profile_picture_url || data.profilePictureUrl || null;
                    if (u) { setUsername(u); setGlobalUsername(u); }
                    if (a) setAvatar(a);
                  }
                })
                .catch(() => {});
            }
          } else {
            console.warn("[App] No address in payload");
            walletLoading.current = false;
          }

          if (!username && MiniKit.user) {
            const u = MiniKit.user.username || null;
            const a = (MiniKit.user as any).profilePictureUrl || null;
            if (u) { setUsername(u); setGlobalUsername(u); }
            if (a) setAvatar(a);
          }
        } catch (err: any) {
          console.warn("[App] Wallet flow error:", err.message);
          walletLoading.current = false;
        }
      };

      loadWallet();
    }, [verified, wallet, verifying, miniKitReady]);

    const runVerification = async () => {
      setVerifying(true);
      setError(null);

      try {
        if (!MiniKit.isInstalled()) throw new Error("MiniKit no instalado");

        const storedUserId = localStorage.getItem("userId");
        const verifyRes = await MiniKit.commandsAsync.verify({
          action: "verify-user",
          signal: storedUserId ?? "",
          verification_level: VerificationLevel.Device,
        });

        const proof = verifyRes?.finalPayload;
        if (!proof) throw new Error("No se recibió proof");

        const res = await fetch("/api/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ payload: proof }),
        });

        if (!res.ok) {
          const text = await res.text();
          console.error("[App] Backend verify error:", text);
          if (text.includes("already verified") && proof.nullifier_hash) {
            const id = proof.nullifier_hash;
            localStorage.setItem("userId", id);
            setUserId(id);
            setVerified(true);
            return;
          } else {
            throw new Error("Error de verificación. Intenta de nuevo.");
          }
        }

        const backend = await res.json();

        if (backend.success && proof.nullifier_hash) {
          const id = proof.nullifier_hash;
          localStorage.setItem("userId", id);
          setUserId(id);
          setVerified(true);
        } else {
          throw new Error(backend.error || "Backend rechazó la prueba");
        }
      } catch (err: any) {
        console.error("[App] Verify error:", err);
        setError(err.message || "Error verificando usuario");
      } finally {
        setVerifying(false);
      }
    };

    const verifyUser = async () => {
      if (verifying) return;
      if (!miniKitReady) {
        if (!MiniKit.isInstalled()) {
          setError("Abre esta app dentro de World App");
          return;
        }
        setMiniKitReady(true);
      }
      await runVerification();
    };

    const verifyOrb = async (): Promise<{ success: boolean; proof?: any }> => {
      if (!miniKitReady || orbVerifying) return { success: false };
      setOrbVerifying(true);
      try {
        const verifyRes = await MiniKit.commandsAsync.verify({
          action: "user-orb",
          signal: userId ?? "",
          verification_level: VerificationLevel.Orb,
        });
        const proof = verifyRes?.finalPayload;
        if (proof?.status === "error") {
          console.warn("[App] Orb verify error:", proof.error_code);
          return { success: false };
        }
        if (proof && proof.verification_level === "orb") {
          return { success: true, proof };
        }
        return { success: false };
      } catch (err: any) {
        console.error("[App] Orb verify failed:", err);
        return { success: false };
      } finally {
        setOrbVerifying(false);
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
        verifyOrb={verifyOrb}
      />
    );
  };

  export default App;
  