import React, { useState, useEffect, useRef } from "react";
  import { MiniKit, VerificationLevel } from "@worldcoin/minikit-js";
  import { useTheme } from "./lib/ThemeContext";
  import HomePage from "./pages/HomePage";

  const APP_ID = (import.meta as any).env?.VITE_APP_ID ?? "";

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
        try { MiniKit.appReady(); } catch (_) {}
        console.log("[INIT] ▶ App init started", { ts: Date.now() });
        const storedId = localStorage.getItem("userId");
        console.log("[INIT] localStorage userId:", storedId ? storedId.slice(0, 12) + "..." : "null");
        if (storedId) {
          setUserId(storedId);
          setVerified(true);
        }

        const cachedWallet = localStorage.getItem("wallet");
        if (cachedWallet) {
          setWallet(cachedWallet);
          console.log("[INIT] ⚡ Cached wallet:", cachedWallet.slice(0, 10) + "...");
        }

        (() => {
          const poll = (): Promise<void> => new Promise((resolve) => {
            if (MiniKit.isInstalled()) { resolve(); return; }
            let attempts = 0;
            const interval = setInterval(() => {
              attempts++;
              if (MiniKit.isInstalled() || attempts >= 20) {
                clearInterval(interval);
                resolve();
              }
            }, 250);
          });
          poll().then(() => {
            setMiniKitReady(true);
            if (MiniKit.user) {
              const u = MiniKit.user.username || null;
              const a = MiniKit.user?.profilePictureUrl || null;
              if (u) { setUsername(u); setGlobalUsername(u); }
              if (a) setAvatar(a);
            }
          });
        })();

        // Session re-validation removed: verify.mjs only accepts POST (GET → 405).
          // The userId in localStorage is already validated by the original verify flow.

        console.log("[INIT] ◀ App init finished", { ts: Date.now() });
      };

      init();
    }, []);

    useEffect(() => {
      const loadWallet = async () => {
        console.log("[WALLET] ▶ loadWallet check", { verified, wallet: !!wallet, verifying, miniKitReady, loading: walletLoading.current });
        if (!verified || wallet || verifying || !miniKitReady || walletLoading.current) {
          console.log("[WALLET] ⏭ Skipping loadWallet (conditions not met)");
          return;
        }

        if (localStorage.getItem("wallet")) {
          setWallet(localStorage.getItem("wallet")!);
          console.log("[WALLET] ⚡ Cache hit — skip walletAuth");
          return;
        }

        walletLoading.current = true;

        fetch("/api/nonce")
          .then(r => {
            if (!r.ok) throw new Error("nonce failed");
            return r.json();
          })
          .then(({ nonce }) => {
            console.log("[WALLET] Nonce received, calling walletAuth (background)...");
            MiniKit.commandsAsync.walletAuth({
              nonce,
              requestId: "wallet-auth-" + Date.now(),
              expirationTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              notBefore: new Date(Date.now() - 60 * 1000),
              statement: "Autenticar wallet para H humans",
            }).then((auth: any) => {
              const payload = auth?.finalPayload;
              if (payload?.status === "error") {
                console.warn("[WALLET] ❌ WalletAuth error:", JSON.stringify(payload));
                walletLoading.current = false;
                return;
              }
              if (payload?.address && payload?.message && payload?.signature) {
                console.log("[WALLET] ✅ WalletAuth success:", payload.address.slice(0, 10) + "...");
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
                      console.log("[WALLET] ✅ Wallet set + cached:", vData.address.slice(0, 10) + "...");
                    } else {
                      console.warn("[WALLET] ❌ Verify rejected:", vData.error);
                    }
                    walletLoading.current = false;
                  })
                  .catch(e => {
                    console.warn("[WALLET] ❌ Verify error:", e);
                    walletLoading.current = false;
                  });

                const addr = payload.address || MiniKit.user?.walletAddress;
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
                console.warn("[WALLET] ⚠ No address in payload");
                walletLoading.current = false;
              }

              if (!username && MiniKit.user) {
                const u = MiniKit.user.username || null;
                const a = MiniKit.user?.profilePictureUrl || null;
                if (u) { setUsername(u); setGlobalUsername(u); }
                if (a) setAvatar(a);
              }
            }).catch((err: any) => {
              console.warn("[WALLET] ⚠ walletAuth failed:", err.message);
              walletLoading.current = false;
            });
          })
          .catch(err => {
            console.warn("[WALLET] ⚠ nonce failed:", err.message);
            walletLoading.current = false;
          });
      };

      loadWallet();
    }, [verified, wallet, verifying, miniKitReady]);

    const runVerification = async () => {
      setVerifying(true);
      setError(null);

      try {
        if (!MiniKit.isInstalled()) throw new Error("MiniKit no instalado");

        const verifyRes = await MiniKit.commandsAsync.verify({
          action: "verify-user",
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
          console.error("[APP] Backend verify error:", text);
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
        console.error("[APP] Verify error:", err);
        setError(err.message || "Error verificando usuario");
      } finally {
        setVerifying(false);
      }
    };

    const verifyUser = async () => {
      if (verifying) return;
      if (!miniKitReady) {
        let attempts = 0;
        while (!MiniKit.isInstalled() && attempts < 20) {
          await new Promise(r => setTimeout(r, 250));
          attempts++;
        }
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
          signal: wallet ?? "",
          verification_level: VerificationLevel.Orb,
        });
        const proof = verifyRes?.finalPayload;
        if (proof?.status === "error") {
          console.warn("[APP] Orb verify error:", proof.error_code);
          return { success: false };
        }
        if (proof && proof.verification_level === "orb") {
          return { success: true, proof };
        }
        return { success: false };
      } catch (err: any) {
        console.error("[APP] Orb verify failed:", err);
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
  