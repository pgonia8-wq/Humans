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
        console.log("[ERUDA:INIT] ▶ App init started", { ts: Date.now() });
        const storedId = localStorage.getItem("userId");
        console.log("[ERUDA:INIT] localStorage userId:", storedId ? storedId.slice(0, 12) + "..." : "null");
        if (storedId) {
          setUserId(storedId);
        }

        try {
          console.log("[ERUDA:MINIKIT] isInstalled:", MiniKit.isInstalled());
          if (!MiniKit.isInstalled()) {
            console.warn("[ERUDA:MINIKIT] ⏳ Esperando MiniKit...");
            const waitForMiniKit = () =>
              new Promise<boolean>((resolve) => {
                let attempts = 0;
                const interval = setInterval(() => {
                  attempts++;
                  console.log(`[ERUDA:MINIKIT] Poll #${attempts}, installed: ${MiniKit.isInstalled()}`);
                  if (MiniKit.isInstalled()) {
                    clearInterval(interval);
                    resolve(true);
                  } else if (attempts > 20) {
                    clearInterval(interval);
                    resolve(false);
                  }
                }, 250);
              });
            const ready = await waitForMiniKit();
            console.log("[ERUDA:MINIKIT] Poll result:", ready ? "✅ READY" : "❌ TIMEOUT");
            if (!ready) {
              console.warn("[ERUDA:MINIKIT] MiniKit no respondió después de 5s");
              return;
            }
          }

          setMiniKitReady(true);
          console.log("[ERUDA:MINIKIT] ✅ MiniKit ready");

          console.log("[ERUDA:MINIKIT] MiniKit.user raw:", JSON.stringify(MiniKit.user));
          console.log("[ERUDA:MINIKIT] MiniKit keys:", Object.keys(MiniKit).filter(k => typeof (MiniKit as any)[k] !== 'function').join(', '));
          if (MiniKit.user) {
            console.log("[ERUDA:MINIKIT] User:", JSON.stringify({ username: MiniKit.user.username, avatar: !!MiniKit.user.avatar_url, walletAddress: MiniKit.user.walletAddress }));
            const u = MiniKit.user.username || null;
            const a = MiniKit.user.avatar_url || null;
            setUsername(u);
            setAvatar(a);
            if (u) setGlobalUsername(u);
          } else {
            console.log("[ERUDA:MINIKIT] No MiniKit.user — username will come from walletAuth or profile");
          }

          if (!storedId) {
            console.log("[ERUDA:INIT] No storedId → running verification...");
            await runVerification();
          } else {
            console.log("[ERUDA:INIT] Has storedId → checking validity with backend...");
            try {
              const t0 = Date.now();
              const checkRes = await fetch(`/api/verify?userId=${storedId}`);
              console.log("[ERUDA:INIT] /api/verify GET response:", checkRes.status, `(${Date.now() - t0}ms)`);
              if (checkRes.ok) {
                const checkData = await checkRes.json();
                console.log("[ERUDA:INIT] verify check data:", JSON.stringify(checkData));
                if (checkData.valid) {
                  setVerified(true);
                  console.log("[ERUDA:INIT] ✅ User verified from stored session");
                } else {
                  console.log("[ERUDA:INIT] ❌ Stored userId invalid, re-verifying...");
                  localStorage.removeItem("userId");
                  setUserId(null);
                  await runVerification();
                }
              } else {
                console.log("[ERUDA:INIT] verify endpoint not ok, assuming verified");
                setVerified(true);
              }
            } catch (e) {
              console.log("[ERUDA:INIT] verify endpoint unreachable, assuming verified", e);
              setVerified(true);
            }
          }
        } catch (err) {
          console.error("[ERUDA:INIT] ❌ Error inicializando:", err);
          setError("Error inicializando MiniKit");
        }
        console.log("[ERUDA:INIT] ◀ App init finished", { ts: Date.now() });
      };

      init();
    }, []);

    useEffect(() => {
      const loadWallet = async () => {
        console.log("[ERUDA:WALLET] ▶ loadWallet check", { verified, wallet: !!wallet, verifying, miniKitReady, loading: walletLoading.current });
        if (!verified || wallet || verifying || !miniKitReady || walletLoading.current) {
          console.log("[ERUDA:WALLET] ⏭ Skipping loadWallet (conditions not met)");
          return;
        }

        walletLoading.current = true;

        try {
          console.log("[ERUDA:WALLET] Fetching /api/nonce...");
          const t0 = Date.now();
          const nonceRes = await fetch("/api/nonce");
          console.log("[ERUDA:WALLET] /api/nonce response:", nonceRes.status, `(${Date.now() - t0}ms)`);
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
          console.log("[ERUDA:WALLET] walletAuth returned", `(${Date.now() - t1}ms)`, JSON.stringify({ status: auth?.finalPayload?.status, hasAddress: !!auth?.finalPayload?.address }));

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
              console.log("[ERUDA:WALLET] /api/walletVerify response:", vRes.status, `(${Date.now() - t2}ms)`, JSON.stringify(vData));
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

          // Fetch username + avatar from Worldcoin public API using wallet address
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

          // Fallback: try MiniKit.user if Worldcoin API didn't return data
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
        if (verifying || !miniKitReady) return;
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
  