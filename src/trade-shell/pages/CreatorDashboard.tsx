/**
 * CreatorDashboard — Wizard de creación de tótem.
 * Adaptado: el contrato deriva address/emoji/symbol; aquí solo pedimos nombre.
 * POST /api/totem/create requiere session token (Orb-verified wallet).
 */
import { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Sparkles, ShieldCheck, Check, Camera, Upload } from "lucide-react";
import { createTotem } from "../../lib/tradeApi";
import type { TotemProfile } from "../../lib/tradeApi";
import { deriveEmoji, deriveSymbol, saveTotemImage } from "../services/derive";
import { useShell } from "../context/ShellContext";
import OrbGateModal from "../components/OrbGateModal";

type Step = "name" | "preview" | "confirm" | "done";

// Address derivada idéntica a TradeCenterPage.CreateTotemModal (compat).
function deriveAddress(wallet: string | null, userId: string, name: string): string {
  const seedSrc = (wallet ?? userId ?? "anon") + ":" + name.trim().toLowerCase();
  let h1 = 0xdeadbeef ^ seedSrc.length;
  let h2 = 0x41c6ce57 ^ seedSrc.length;
  for (let i = 0; i < seedSrc.length; i++) {
    const ch = seedSrc.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = (h1 ^ (h1 >>> 16)) >>> 0;
  h2 = (h2 ^ (h2 >>> 13)) >>> 0;
  const hex = (h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0")).repeat(3).slice(0, 40);
  return "0x" + hex;
}

export default function CreatorDashboard() {
  const { userId, walletAddress, isOrbVerified, verifyOrb, onOrbVerifiedChange, openToken, closeCreator } = useShell();
  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState<string | null>(null);
  const [orbGate, setOrbGate] = useState(false);
    const [created, setCreated] = useState<TotemProfile | null>(null);
    // Avatar custom (data URL) — el creador puede subir su propia imagen.
    const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement | null>(null);
    function onPickImage() { fileRef.current?.click(); }
    function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!/^image\//.test(file.type))         { setErr("Solo imágenes."); return; }
      if (file.size > 5 * 1024 * 1024)          { setErr("Máximo 5 MB."); return; }
      const reader = new FileReader();
      reader.onload = () => {
        const url = String(reader.result || "");
        if (url.startsWith("data:image/")) { setImageDataUrl(url); setErr(null); }
      };
      reader.readAsDataURL(file);
    }

  const validName = name.trim().length >= 2 && name.trim().length <= 32;
  const derivedAddr = useMemo(
    () => validName ? deriveAddress(walletAddress, userId, name) : "",
    [validName, walletAddress, userId, name],
  );
  const emoji  = useMemo(() => derivedAddr ? deriveEmoji(derivedAddr) : "✨", [derivedAddr]);
  const symbol = useMemo(() => deriveSymbol(name || "XX"), [name]);

  async function submitCreate() {
    if (!validName || busy) return;
    if (!isOrbVerified) { setOrbGate(true); return; }
    setBusy(true); setErr(null);
    try {
      const t = await createTotem(derivedAddr, name.trim());
      setCreated(t);
      setStep("done");
    } catch (e: any) {
      setErr(e?.message ?? "No se pudo crear el tótem.");
    } finally { setBusy(false); }
  }

  return (
    <div className="h-full w-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2">
        <button onClick={closeCreator} className="p-2 -ml-2 rounded-lg hover:bg-white/5" aria-label="Volver">
          <ArrowLeft size={20} color="#ffffff" />
        </button>
        <h1 className="text-lg font-semibold text-white">Crear tótem</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-28 scrollbar-hide">
          {/* Hero banner premium 2026 */}
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl p-5 mb-5"
            style={{
              background: "radial-gradient(120% 90% at 0% 0%, rgba(167,139,250,0.22) 0%, rgba(34,197,94,0.10) 45%, rgba(0,0,0,0) 80%), linear-gradient(180deg, rgba(20,20,28,0.85) 0%, rgba(10,10,14,0.85) 100%)",
              border: "1px solid rgba(255,255,255,0.10)",
              boxShadow: "0 24px 60px -32px rgba(167,139,250,0.30), inset 0 1px 0 rgba(255,255,255,0.05)",
            }}
          >
            <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full"
                 style={{ background: "radial-gradient(circle, rgba(167,139,250,0.20) 0%, rgba(0,0,0,0) 70%)", filter: "blur(8px)" }} />
            <div className="relative flex items-start gap-4">
              <motion.div
                key={emoji}
                initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.25 }}
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl shrink-0"
                style={{
                  background: "linear-gradient(135deg, rgba(34,197,94,0.18), rgba(167,139,250,0.18))",
                  border: "1px solid rgba(255,255,255,0.10)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
                }}
              >
                {validName ? emoji : "✨"}
              </motion.div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "rgba(167,139,250,0.85)" }}>
                  Crea tu tótem · 2026
                </div>
                <div className="text-white font-bold text-lg mt-0.5 truncate">
                  {validName ? name : "Tu nombre, tu símbolo"}
                </div>
                <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.55)" }}>
                  Curva bonding pura · Un humano, un creador · Onchain wins
                </div>
              </div>
            </div>
          </motion.div>

          {/* Stepper */}
        <div className="flex items-center gap-2 mb-6">
          {(["name", "preview", "confirm"] as Step[]).map((s, i) => {
            const active = step === s || (step === "done" && s === "confirm");
            const done   = (step === "preview" && s === "name") ||
                           (step === "confirm" && (s === "name" || s === "preview")) ||
                           (step === "done");
            return (
              <div key={s} className="flex-1 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold"
                  style={{
                    background: active ? "rgba(34,197,94,0.20)" : done ? "rgba(34,197,94,0.10)" : "rgba(255,255,255,0.05)",
                    border:     `1px solid ${active || done ? "rgba(34,197,94,0.45)" : "rgba(255,255,255,0.10)"}`,
                    color:      active || done ? "#22c55e" : "rgba(255,255,255,0.45)",
                  }}>
                  {done ? <Check size={12} /> : i + 1}
                </div>
                {i < 2 && <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />}
              </div>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {step === "name" && (
            <motion.div key="name" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-xl font-bold text-white">Nombra tu tótem</h2>
                <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>
                  Sube tu propia imagen y elige un nombre permanente.
                </p>

                {/* Avatar uploader — toma una foto o elige de la galería */}
                <div className="mt-5 flex items-center gap-4">
                  <button
                    type="button"
                    onClick={onPickImage}
                    className="relative w-24 h-24 rounded-2xl flex items-center justify-center overflow-hidden shrink-0 active:scale-95 transition"
                    style={{
                      background: imageDataUrl
                        ? "transparent"
                        : "linear-gradient(135deg, rgba(34,197,94,0.18), rgba(167,139,250,0.18))",
                      border: "1px solid rgba(255,255,255,0.12)",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10), 0 16px 32px -16px rgba(0,0,0,0.55)",
                    }}
                  >
                    {imageDataUrl ? (
                      <img src={imageDataUrl} alt="avatar"
                           style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div className="flex flex-col items-center gap-1" style={{ color: "rgba(255,255,255,0.65)" }}>
                        <Camera size={22} />
                        <span className="text-[10px] uppercase tracking-wider">Foto</span>
                      </div>
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] uppercase tracking-wider mb-1" style={{ color: "rgba(255,255,255,0.55)" }}>
                      Avatar del tótem
                    </div>
                    <div className="text-xs" style={{ color: "rgba(255,255,255,0.50)" }}>
                      Toca para tomar una foto o elegir una imagen. Opcional. Máx 5 MB.
                    </div>
                    <button
                      type="button"
                      onClick={onPickImage}
                      className="mt-2 inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md"
                      style={{
                        background: "rgba(167,139,250,0.10)",
                        border: "1px solid rgba(167,139,250,0.30)",
                        color: "#c4b5fd",
                      }}
                    >
                      <Upload size={12} /> {imageDataUrl ? "Cambiar imagen" : "Subir imagen"}
                    </button>
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={onFileChange}
                  />
                </div>

                              <input
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 32))}
                placeholder="p. ej. Guardián del Agua"
                className="mt-4 w-full px-4 py-3 rounded-xl text-white placeholder:text-white/30 focus:outline-none"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" }}
                autoFocus
              />
              <div className="mt-1 text-[11px]" style={{ color: "rgba(255,255,255,0.40)" }}>
                {name.trim().length}/32
              </div>
              <button
                onClick={() => validName && setStep("preview")}
                disabled={!validName}
                className="mt-6 w-full py-3 rounded-xl font-semibold disabled:opacity-40"
                style={{ background: "linear-gradient(135deg,#22c55e 0%,#16a34a 100%)", color: "#fff" }}
              >
                Continuar
              </button>
            </motion.div>
          )}

          {step === "preview" && (
            <motion.div key="preview" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-xl font-bold text-white">Identidad derivada</h2>
              <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>
                El emoji, símbolo y address se derivan de tu wallet + nombre.
              </p>

              <div className="mt-5 rounded-2xl p-5 text-center"
                  style={{
                    background:
                      "radial-gradient(120% 90% at 50% 0%, rgba(167,139,250,0.20) 0%, rgba(0,0,0,0) 75%), linear-gradient(180deg, rgba(20,20,28,0.85) 0%, rgba(10,10,14,0.85) 100%)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    backdropFilter: "blur(14px) saturate(140%)",
                    WebkitBackdropFilter: "blur(14px) saturate(140%)",
                    boxShadow: "0 24px 60px -28px rgba(167,139,250,0.30), inset 0 1px 0 rgba(255,255,255,0.08)",
                  }}>
                  <div className="mx-auto w-24 h-24 rounded-2xl flex items-center justify-center text-6xl mb-3 overflow-hidden"
                    style={{
                      background: imageDataUrl ? "transparent" : "rgba(0,0,0,0.30)",
                      border: "1px solid rgba(255,255,255,0.10)",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), 0 12px 24px -12px rgba(0,0,0,0.55)",
                    }}>
                    {imageDataUrl
                      ? <img src={imageDataUrl} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <span>{emoji}</span>}
                  </div>
                  <div className="text-white font-bold text-lg">{name}</div>
                  <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.55)" }}>
                    {symbol} · {derivedAddr.slice(0, 10)}…{derivedAddr.slice(-6)}
                  </div>
                </div>

                <div className="mt-4 rounded-xl p-3 text-xs"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.60)" }}>
                <div className="flex items-center gap-2 mb-1" style={{ color: "#22c55e" }}>
                  <Sparkles size={12} /> <span className="font-semibold">Reglas de graduación</span>
                  </div>
                  <div className="space-y-1">
                    <div>· <b className="text-white">Score nivel 4</b> alcanzado.</div>
                    <div>· <b className="text-white">45 días</b> de permanencia.</div>
                    <div>· <b className="text-white">15.000 WLD</b> equivalentes en supply.</div>
                    <div>· Curva bonding <b className="text-white">cúbica</b> (precio sube con el cubo del supply).</div>
                  </div>
                </div>

              <div className="mt-5 flex gap-2">
                <button onClick={() => setStep("name")}
                  className="flex-1 py-3 rounded-xl font-semibold"
                  style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.70)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  Atrás
                </button>
                <button onClick={() => setStep("confirm")}
                  className="flex-1 py-3 rounded-xl font-semibold"
                  style={{ background: "linear-gradient(135deg,#22c55e 0%,#16a34a 100%)", color: "#fff" }}>
                  Siguiente
                </button>
              </div>
            </motion.div>
          )}

          {step === "confirm" && (
            <motion.div key="confirm" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-xl font-bold text-white">Confirmar</h2>
              <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>
                Crear un tótem requiere verificación Orb. Un humano = un creador.
              </p>

              <div className="mt-4 rounded-xl p-4 space-y-2 text-sm"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex justify-between">
                  <span style={{ color: "rgba(255,255,255,0.55)" }}>Nombre</span>
                  <span className="text-white font-semibold">{name}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: "rgba(255,255,255,0.55)" }}>Símbolo</span>
                  <span className="text-white font-mono">{symbol}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: "rgba(255,255,255,0.55)" }}>Emoji</span>
                  <span className="text-2xl">{emoji}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: "rgba(255,255,255,0.55)" }}>Verificación</span>
                  <span className="flex items-center gap-1" style={{ color: isOrbVerified ? "#22c55e" : "#fbbf24" }}>
                    <ShieldCheck size={14} /> {isOrbVerified ? "Verificado" : "Pendiente"}
                  </span>
                </div>
              </div>

              {err && (
                <div className="mt-3 rounded-lg px-3 py-2 text-xs"
                  style={{ background: "rgba(248,113,113,0.10)", border: "1px solid rgba(248,113,113,0.3)", color: "#fca5a5" }}>
                  {err}
                </div>
              )}

              <div className="mt-5 flex gap-2">
                <button onClick={() => setStep("preview")} disabled={busy}
                  className="flex-1 py-3 rounded-xl font-semibold disabled:opacity-50"
                  style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.70)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  Atrás
                </button>
                <button onClick={submitCreate} disabled={busy || !validName}
                  className="flex-1 py-3 rounded-xl font-semibold disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg,#22c55e 0%,#16a34a 100%)", color: "#fff" }}>
                  {busy ? "Creando…" : isOrbVerified ? "Crear tótem" : "Verificar y crear"}
                </button>
              </div>
            </motion.div>
          )}

          {step === "done" && created && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center pt-8">
                <div className="mx-auto w-24 h-24 rounded-2xl flex items-center justify-center text-6xl mb-4 overflow-hidden"
                  style={{
                    background: imageDataUrl ? "transparent" : "rgba(0,0,0,0.30)",
                    border: "1px solid rgba(255,255,255,0.10)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), 0 16px 32px -16px rgba(0,0,0,0.55)",
                  }}>
                  {imageDataUrl
                    ? <img src={imageDataUrl} alt={created.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <span>{deriveEmoji(created.address)}</span>}
                </div>
                <h2 className="text-2xl font-bold text-white">¡Tótem creado!</h2>
              <div className="text-white font-semibold mt-1">{created.name}</div>
              <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.50)" }}>
                {created.address.slice(0, 10)}…{created.address.slice(-6)}
              </div>
              <button
                onClick={() => { closeCreator(); openToken(created.address); }}
                className="mt-6 w-full py-3 rounded-xl font-semibold"
                style={{ background: "linear-gradient(135deg,#22c55e 0%,#16a34a 100%)", color: "#fff" }}>
                Ver mi tótem
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {orbGate && (
        <OrbGateModal
          intent="create"
          onClose={() => setOrbGate(false)}
          onVerify={async () => { await verifyOrb(); onOrbVerifiedChange(true); }}
        />
      )}
    </div>
  );
}
