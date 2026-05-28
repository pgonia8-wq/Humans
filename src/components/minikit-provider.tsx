import { ReactNode, useEffect, useState } from "react";
  import { MiniKit } from "@worldcoin/minikit-js";

  const APP_ID = (import.meta as any).env?.VITE_APP_ID || "";

  export default function MiniKitProvider({ children }: { children: ReactNode }) {
    const [ready, setReady] = useState(false);

    useEffect(() => {
      let mounted = true;

      const initMiniKit = async () => {
        try {
          await MiniKit.install(APP_ID);

          console.log("[MiniKitProvider] installed");

          if (MiniKit.isInstalled()) {
            try {
              if (MiniKit.appReady) {
                MiniKit.appReady();
                console.log("[MiniKitProvider] appReady()");
              } else if ((MiniKit.commands as any)?.ready) {
                (MiniKit.commands as any).ready();
                console.log("[MiniKitProvider] ready() fallback");
              }
            } catch (e) {
              console.warn("[MiniKitProvider] ready failed", e);
            }
          }

        } catch (err) {
          console.error("[MiniKitProvider] install error:", err);
        } finally {
          if (mounted) setReady(true);
        }
      };

      initMiniKit();

      return () => {
        mounted = false;
      };
    }, []);

    if (!ready) {
      return (
        <div style={{
          position: "fixed",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#06060d",
        }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            border: "2px solid transparent",
            borderTopColor: "#a855f7",
            borderRightColor: "#6366f1",
            animation: "spin 0.8s linear infinite",
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      );
    }

    return <>{children}</>;
  }
  