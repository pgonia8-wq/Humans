/**
 * ProfilePage — Portfolio del usuario.
 * Derivado de getAllTotems + filtrar por owner_id.
 * TODO(backend): endpoint /api/user/portfolio dedicado con balances por tótem.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { User, LogOut, Wallet, ShieldCheck } from "lucide-react";
import { getAllTotems } from "../../lib/tradeApi";
import type { TotemProfile } from "../../lib/tradeApi";
import { enrich, shortAddr } from "../services/derive";
import TokenRow from "../components/TokenRow";
import Stat from "../components/Stat";
import { useShell } from "../context/ShellContext";

export default function ProfilePage() {
    const { userId, walletAddress, isOrbVerified, openToken, onClose } = useShell();
    // World App username (lazy fetch via MiniKit). Si no se puede resolver,
    // mostramos la dirección abreviada — nunca el nullifier crudo.
    const [username, setUsername] = useState<string | null>(null);
    useEffect(() => {
      if (!walletAddress) return;
      let alive = true;
      (async () => {
        try {
          const mod: any = await import("@worldcoin/minikit-js");
          const mk = mod?.MiniKit;
          if (mk?.user?.username && alive) { setUsername(mk.user.username); return; }
          if (typeof mk?.getUserByAddress === "function") {
            const u = await mk.getUserByAddress(walletAddress);
            if (u?.username && alive) setUsername(u.username);
          }
        } catch { /* MiniKit no disponible — fallback a address corta */ }
      })();
      return () => { alive = false; };
    }, [walletAddress]);
    const displayName = username
      ? "@" + username
      : (walletAddress ? shortAddr(walletAddress) : "Anónimo");
  const [items, setItems] = useState<TotemProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getAllTotems("score", 100, userId || undefined);
      setItems(list);
    } catch { /* silencioso */ }
    finally { setLoading(false); }
  }, [userId]);
  useEffect(() => { load(); }, [load]);

  const owned = useMemo(
    () => items.filter(t => t.isOwner === true || t.owner_id === userId).map(enrich),
    [items, userId],
  );

  return (
    <div className="h-full w-full overflow-y-auto pb-28 scrollbar-hide">
      {/* Header */}
      <div className="px-4 pt-4">
        <h1 className="text-2xl font-bold text-white">Mi perfil</h1>
      </div>

      {/* User card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="mx-4 mt-4 rounded-2xl p-4"
        style={{
          background: "linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(167,139,250,0.15) 100%)",
          border: "1px solid rgba(255,255,255,0.10)",
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.30)" }}>
            <User size={24} color="#ffffff" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white font-semibold truncate text-base">{displayName}</div>
            <div className="text-xs mt-0.5 flex items-center gap-1.5" style={{ color: "rgba(255,255,255,0.65)" }}>
              <Wallet size={12} /> {walletAddress ? shortAddr(walletAddress) : "sin wallet"}
            </div>
            <div className="text-xs mt-0.5 flex items-center gap-1.5"
              style={{ color: isOrbVerified ? "#22c55e" : "#fbbf24" }}>
              <ShieldCheck size={12} /> {isOrbVerified ? "Orb verificado" : "Orb pendiente"}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="px-4 mt-4 grid grid-cols-2 gap-2">
        <Stat label="Tótems propios"   value={owned.length.toString()} color="#22c55e" />
        <Stat label="Estado" value={isOrbVerified ? "Activo" : "Limitado"}
              hint={isOrbVerified ? "Puede crear y tradear" : "Verifica Orb"} />
      </div>

      {/* Mis tótems */}
      <div className="px-4 mt-6">
        <div className="text-[11px] uppercase tracking-wider mb-2"
          style={{ color: "rgba(255,255,255,0.45)" }}>
          Mis tótems
        </div>
        <div className="flex flex-col gap-2">
          {loading && (
            <div className="text-center text-sm py-6" style={{ color: "rgba(255,255,255,0.45)" }}>
              Cargando…
            </div>
          )}
          {!loading && owned.length === 0 && (
            <div className="text-center text-sm py-6" style={{ color: "rgba(255,255,255,0.45)" }}>
              No has creado tótems aún.
            </div>
          )}
          {!loading && owned.map((t, i) => (
            <TokenRow key={t.address} t={t} index={i} onClick={openToken} />
          ))}
        </div>
      </div>

      {/* Close/back to app */}
      <div className="px-4 mt-8">
        <button onClick={onClose}
          className="w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.10)",
            color: "rgba(255,255,255,0.70)",
          }}>
          <LogOut size={14} /> Volver a H
        </button>
      </div>
    </div>
  );
}
