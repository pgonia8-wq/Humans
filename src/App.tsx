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
          const t0 = Date.now();
          console.log("[ERUDA:INIT] ▶ App init started", { ts: t0, APP_ID: APP_ID ? APP_ID.slice(0,12)+"..." : "EMPTY" });
          console.log("[ERUDA:INIT] MiniKit imported:", typeof MiniKit);
          console.log("[ERUDA:INIT] MiniKit.isInstalled():", MiniKit.isInstalled());
          console.log("[ERUDA:INIT] MiniKit.user:", JSON.stringify(MiniKit.user || null));
          console.log("[ERUDA:INIT] MiniKit.walletAddress:", MiniKit.walletAddress || "null");

          const storedId = localStorage.getItem("userId");
          console.log("[ERUDA:INIT] localStorage userId:", storedId ? storedId.slice(0, 12) + "..." : "null");
          if (storedId) {
            setUserId(storedId);
            setVerified(true);
            console.log("[ERUDA:INIT] ✅ Returning user — setVerified(true)");
          } else {
            console.log("[ERUDA:INIT] 🆕 New user — needs verification");
          }

          (() => {
            console.log("[ERUDA:POLL] ▶ MiniKit poll started");
            const pollStart = Date.now();
            const poll = (): Promise<void> => new Promise((resolve) => {
              if (MiniKit.isInstalled()) {
                console.log("[ERUDA:POLL] ✅ MiniKit already installed (0ms)");
                resolve();
                return;
              }
              let attempts = 0;
              const interval = setInterval(() => {
                attempts++;
                const installed = MiniKit.isInstalled();
                if (attempts % 5 === 0 || installed) {
                  console.log("[ERUDA:POLL] attempt", attempts, "installed:", installed, "(" + (Date.now() - pollStart) + "ms)");
                }
                if (installed || attempts >= 20) {
                  clearInterval(interval);
                  if (!installed) console.log("[ERUDA:POLL] ⏱ Timeout after 20 attempts (" + (Date.now() - pollStart) + "ms)");
                  resolve();
                }
              }, 250);
            });
            poll().then(() => {
              console.log("[ERUDA:POLL] ◀ Poll finished. MiniKit.isInstalled():", MiniKit.isInstalled(), "(" + (Date.now() - pollStart) + "ms)");
              setMiniKitReady(true);
              console.log("[ERUDA:POLL] setMiniKitReady(true)");
              try {
                MiniKit.commands.ready();
                console.log("[ERUDA:POLL] ✅ MiniKit.commands.ready() called OK");
              } catch (e) {
                console.warn("[ERUDA:POLL] ⚠ MiniKit.commands.ready() error:", e);
              }
              if (MiniKit.user) {
                console.log("[ERUDA:POLL] MiniKit.user found:", JSON.stringify({ username: MiniKit.user.username, hasAvatar: !!MiniKit.user.avatar_url }));
                const u = MiniKit.user.username || null;
                const a = MiniKit.user.avatar_url || null;
                if (u) { setUsername(u); setGlobalUsername(u); }
                if (a) setAvatar(a);
              } else {
                console.log("[ERUDA:POLL] MiniKit.user is null/undefined");
              }
            });
          })();

          if (storedId) {
            console.log("[ERUDA:SESSION] ▶ Validating session for:", storedId.slice(0,12)+"...");
            fetch(`/api/verify?userId=${storedId}`)
              .then(r => {
                console.log("[ERUDA:SESSION] /api/verify GET response:", r.status);
                return r.ok ? r.json() : null;
              })
              .then(data => {
                console.log("[ERUDA:SESSION] /api/verify data:", JSON.stringify(data));
                if (data && !data.valid) {
                  console.log("[ERUDA:SESSION] ❌ Session invalid — clearing userId");
                  localStorage.removeItem("userId");
                  setUserId(null);
                  setVerified(false);
                } else {
                  console.log("[ERUDA:SESSION] ✅ Session valid");
                }
              })
              .catch((e) => {
                console.warn("[ERUDA:SESSION] ⚠ /api/verify fetch error:", e);
              });
          }

          console.log("[ERUDA:INIT] ◀ App init finished (" + (Date.now() - t0) + "ms)");
        };

        init();
      }, []);

      useEffect(() => {
        const loadWallet = async () => {
          console.log("[ERUDA:WALLET] ▶ loadWallet check", { verified, wallet: !!wallet, verifying, miniKitReady, loading: walletLoading.current });
          if (!verified || wallet || verifying || !miniKitReady || walletLoading.current) {
            console.log("[ERUDA:WALLET] ⏭ Skipping loadWallet — conditions:", {
              "!verified": !verified,
              "wallet exists": !!wallet,
              "verifying": verifying,
              "!miniKitReady": !miniKitReady,
              "loading": walletLoading.current
            });
            return;
          }

          walletLoading.current = true;
          console.log("[ERUDA:WALLET] 🔄 Starting wallet auth flow...");

          try {
            console.log("[ERUDA:WALLET] Fetching /api/nonce...");
            const t0 = Date.now();
            const nonceRes = await fetch("/api/nonce");
            console.log("[ERUDA:WALLET] /api/nonce response:", nonceRes.status, "(" + (Date.now() - t0) + "ms)");
            if (!nonceRes.ok) throw new Error("No se pudo obtener nonce");
            const { nonce } = await nonceRes.json();
            console.log("[ERUDA:WALLET] Nonce received:", nonce?.slice(0, 8) + "...");

            console.log("[ERUDA:WALLET] Calling MiniKit.commandsAsync.walletAuth...");
            const t1 = Date.now();
            const auth = await MiniKit.commandsAsync.walletAuth({
              nonce,
              requestId: "wallet-auth-" + Date.now(),
              expirationTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              notBefore: new Date(Date.now() - 60 * 1000),
              statement: "Autenticar wallet para H humans",
            });
            console.log("[ERUDA:WALLET] walletAuth returned (" + (Date.now() - t1) + "ms)", JSON.stringify({ status: auth?.finalPayload?.status, hasAddress: !!auth?.finalPayload?.address }));

            const payload = auth?.finalPayload;

            if (payload?.status === "error") {
              console.warn("[ERUDA:WALLET] ❌ WalletAuth error:", JSON.stringify(payload));
            } else if (payload?.address && payload?.message && payload?.signature) {
              console.log("[ERUDA:WALLET] ✅ WalletAuth success, address:", payload.address.slice(0, 10) + "...");
              try {
                console.log("[ERUDA:WALLET] POST /api/walletVerify...");
                const t2 = Date.now();
                const vRes = await fetch("/api/walletVerify", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ payload, nonce, userId }),
                });
                const vData = await vRes.json();
                console.log("[ERUDA:WALLET] /api/walletVerify response:", vRes.status, "(" + (Date.now() - t2) + "ms)", JSON.stringify(vData));
                if (vData.success) {
                  setWallet(vData.address);
                  console.log("[ERUDA:WALLET] ✅ Wallet set:", vData.address.slice(0, 10) + "...");
                } else {
                  console.warn("[ERUDA:WALLET] ❌ Wallet verify rejected:", vData.error);
                }
              } catch (e) {
                console.warn("[ERUDA:WALLET] ❌ Wallet verify unreachable:", e);
              }
            } else {
              console.warn("[ERUDA:WALLET] ⚠ WalletAuth success pero sin address. Payload:", JSON.stringify(payload));
            }

            const resolvedAddress = wallet || payload?.address || MiniKit.walletAddress;
            if (resolvedAddress) {
              try {
                console.log("[ERUDA:WALLET] Fetching username from Worldcoin API for:", resolvedAddress.slice(0, 10) + "...");
                const wcRes = await fetch(`https://usernames.worldcoin.org/api/v1/${resolvedAddress}`);
                if (wcRes.ok) {
                  const wcData = await wcRes.json();
                  console.log("[ERUDA:WALLET] Worldcoin username API:", JSON.stringify(wcData));
                  const u = wcData.username || null;
                  const a = wcData.profile_picture_url || wcData.profilePictureUrl || null;
                  if (u) {
                    setUsername(u);
                    setGlobalUsername(u);
                    console.log("[ERUDA:WALLET] ✅ Username set from Worldcoin:", u);
                  }
                  if (a) {
                    setAvatar(a);
                    console.log("[ERUDA:WALLET] ✅ Avatar set from Worldcoin");
                  }
                } else {
                  console.log("[ERUDA:WALLET] Worldcoin username API returned:", wcRes.status);
                }
              } catch (e) {
                console.warn("[ERUDA:WALLET] Worldcoin username API error:", e);
              }
            }

            if (!username && MiniKit.user) {
              const u = MiniKit.user.username || null;
              const a = MiniKit.user.avatar_url || MiniKit.user.profilePictureUrl || null;
              if (u) { setUsername(u); setGlobalUsername(u); }
              if (a) setAvatar(a);
              console.log("[ERUDA:WALLET] Fallback MiniKit.user:", u);
            }
          } catch (err: any) {
            console.error("[ERUDA:WALLET] ❌ Error walletAuth:", err);
            setError("Error autenticando wallet");
          } finally {
            walletLoading.current = false;
            console.log("[ERUDA:WALLET] ◀ loadWallet finished");
          }
        };

        loadWallet();
      }, [verified, wallet, verifying, miniKitReady]);

      const runVerification = async () => {
        console.log("[ERUDA:VERIFY] ▶ runVerification started");
        setVerifying(true);
        setError(null);

        try {
          console.log("[ERUDA:VERIFY] MiniKit.isInstalled():", MiniKit.isInstalled());
          if (!MiniKit.isInstalled()) throw new Error("MiniKit no instalado");

          console.log("[ERUDA:VERIFY] Calling MiniKit.commandsAsync.verify({ action: 'verify-user', level: Device })...");
          const t0 = Date.now();
          const verifyRes = await MiniKit.commandsAsync.verify({
            action: "verify-user",
            verification_level: VerificationLevel.Device,
          });
          console.log("[ERUDA:VERIFY] verify returned (" + (Date.now() - t0) + "ms)", JSON.stringify({ status: verifyRes?.finalPayload?.status, hasHash: !!verifyRes?.finalPayload?.nullifier_hash }));

          const proof = verifyRes?.finalPayload;
          if (!proof) throw new Error("No se recibió proof");

          console.log("[ERUDA:VERIFY] POST /api/verify with proof...");
          const t1 = Date.now();
          const res = await fetch("/api/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ payload: proof }),
          });
          console.log("[ERUDA:VERIFY] /api/verify response:", res.status, "(" + (Date.now() - t1) + "ms)");

          if (!res.ok) {
            const text = await res.text();
            console.error("[ERUDA:VERIFY] ❌ Backend verify error:", text);
            if (text.includes("already verified") && proof.nullifier_hash) {
              const id = proof.nullifier_hash;
              localStorage.setItem("userId", id);
              setUserId(id);
              setVerified(true);
              console.log("[ERUDA:VERIFY] ✅ Already verified — reusing nullifier as userId");
              return;
            } else {
              throw new Error("Error de verificación. Intenta de nuevo.");
            }
          }

          const backend = await res.json();
          console.log("[ERUDA:VERIFY] Backend response:", JSON.stringify(backend));

          if (backend.success && proof.nullifier_hash) {
            const id = proof.nullifier_hash;
            localStorage.setItem("userId", id);
            setUserId(id);
            setVerified(true);
            console.log("[ERUDA:VERIFY] ✅ Verified! userId:", id.slice(0,12)+"...");
          } else {
            throw new Error(backend.error || "Backend rechazó la prueba");
          }
        } catch (err: any) {
          console.error("[ERUDA:VERIFY] ❌ Error:", err);
          setError(err.message || "Error verificando usuario");
        } finally {
          setVerifying(false);
          console.log("[ERUDA:VERIFY] ◀ runVerification finished");
        }
      };

      const verifyUser = async () => {
          console.log("[ERUDA:VERIFY] ▶ verifyUser called", { verifying, miniKitReady });
          if (verifying) return;
            if (!miniKitReady) {
              console.log("[ERUDA:VERIFY] miniKitReady=false, polling manually...");
              let attempts = 0;
              while (!MiniKit.isInstalled() && attempts < 20) {
                await new Promise(r => setTimeout(r, 250));
                attempts++;
              }
              if (!MiniKit.isInstalled()) {
                console.log("[ERUDA:VERIFY] ❌ MiniKit not installed after 20 attempts");
                setError("Abre esta app dentro de World App");
                return;
              }
              setMiniKitReady(true);
            }
            await runVerification();
          };

        const verifyOrb = async (): Promise<{ success: boolean; proof?: any }> => {
          console.log("[ERUDA:ORB] ▶ verifyOrb called", { miniKitReady, orbVerifying });
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
              console.warn("[ERUDA:ORB] ❌ Orb verify error:", proof.error_code);
              return { success: false };
            }
            if (proof && proof.verification_level === "orb") {
              console.log("[ERUDA:ORB] ✅ Orb verified!");
              return { success: true, proof };
            }
            console.log("[ERUDA:ORB] ⚠ Orb not completed");
            return { success: false };
          } catch (err: any) {
            console.error("[ERUDA:ORB] ❌ Orb verify failed:", err);
            return { success: false };
          } finally {
            setOrbVerifying(false);
            console.log("[ERUDA:ORB] ◀ verifyOrb finished");
          }
        };

        console.log("[ERUDA:RENDER] App render", { verified, userId: userId?.slice(0,8), miniKitReady, wallet: !!wallet });

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
  