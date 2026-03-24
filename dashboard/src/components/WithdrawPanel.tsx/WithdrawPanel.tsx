import { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, ArrowDownToLine, Clock, CheckCircle, X } from "lucide-react";
import { SectionBlock } from "../primitives/SectionBlock";
import { EmptyStatePremium } from "../primitives/EmptyStatePremium";
import { GlassCard } from "../primitives/GlassCard";

interface WithdrawPanelProps {
  totalEarnings: number;
}

type WithdrawStep = "idle" | "confirm" | "processing" | "done";

interface WithdrawModalProps {
  balance: number;
  onClose: () => void;
}

const WithdrawModal = memo(function WithdrawModal({ balance, onClose }: WithdrawModalProps) {
  const [amount, setAmount] = useState("");
  const [wallet, setWallet] = useState("");
  const [method, setMethod] = useState<"WLD" | "USDC">("WLD");
  const [step, setStep] = useState<WithdrawStep>("idle");

  const numAmount = parseFloat(amount) || 0;
  const creatorShare = numAmount * 0.7;
  const reinvestShare = numAmount * 0.25;
  const poolShare = numAmount * 0.05;
  const isValid = numAmount > 0 && numAmount <= balance && wallet.trim().length > 0;

  const handleWithdraw = () => {
    setStep("processing");
    setTimeout(() => setStep("done"), 2000);
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={step === "done" ? onClose : undefined} />
      <motion.div
        className="relative w-full max-w-md rounded-t-3xl pb-10"
        style={{
          background: "rgba(12,12,24,0.97)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderBottom: "none",
        }}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
      >
        {step === "done" ? (
          <motion.div
            className="flex flex-col items-center py-12 px-6 text-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <motion.div
              className="w-20 h-20 rounded-3xl mb-5 flex items-center justify-center"
              style={{ background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.25)" }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <CheckCircle size={36} className="text-emerald-400" />
            </motion.div>
            <h3 className="text-lg font-bold text-white mb-2">Retiro Enviado</h3>
            <p className="text-sm text-white/40 max-w-xs leading-relaxed mb-2">
              Tu solicitud de retiro de{" "}
              <span className="text-emerald-400 font-bold">{numAmount.toFixed(4)} {method}</span>{" "}
              está siendo procesada.
            </p>
            <p className="text-xs text-white/25 mb-8">Tiempo estimado: 24–48 horas</p>
            <button
              onClick={onClose}
              className="px-8 py-3 rounded-2xl text-sm font-bold text-white active:scale-95 transition-all"
              style={{ background: "linear-gradient(135deg, #7c3aed, #059669)" }}
            >
              Entendido
            </button>
          </motion.div>
        ) : step === "processing" ? (
          <div className="flex flex-col items-center py-12 px-6 text-center">
            <motion.div
              className="w-16 h-16 rounded-full border-2 border-violet-500/30 border-t-violet-400 mb-6"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            <p className="text-base font-semibold text-white/70">Procesando retiro…</p>
          </div>
        ) : (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-bold text-white">Retirar Fondos</h3>
                <p className="text-xs text-white/30 mt-0.5">Saldo disponible: {balance.toFixed(4)} WLD</p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white/40 hover:text-white hover:bg-white/8 transition-all"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex gap-2">
                {(["WLD", "USDC"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMethod(m)}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95"
                    style={{
                      background: method === m ? "rgba(109,40,217,0.35)" : "rgba(255,255,255,0.04)",
                      border: method === m ? "1px solid rgba(109,40,217,0.5)" : "1px solid rgba(255,255,255,0.07)",
                      color: method === m ? "#a78bfa" : "rgba(255,255,255,0.35)",
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>

              <div>
                <label className="text-[10px] text-white/40 uppercase tracking-widest font-semibold mb-1.5 block">
                  Cantidad a retirar
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.0000"
                  max={balance}
                  className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/20 outline-none"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                />
              </div>

              <div>
                <label className="text-[10px] text-white/40 uppercase tracking-widest font-semibold mb-1.5 block">
                  Wallet address
                </label>
                <input
                  type="text"
                  value={wallet}
                  onChange={(e) => setWallet(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/20 outline-none font-mono"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                />
              </div>

              {numAmount > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="rounded-2xl p-4 space-y-2"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <p className="text-[10px] text-white/30 uppercase tracking-widest font-semibold mb-3">Resumen</p>
                  {[
                    { label: "70% Tú recibes", value: creatorShare, color: "#34d399" },
                    { label: "25% Reinversión", value: reinvestShare, color: "#a78bfa" },
                    { label: "5% Pool", value: poolShare, color: "#60a5fa" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex justify-between items-center">
                      <span className="text-xs text-white/40">{label}</span>
                      <span className="text-xs font-bold" style={{ color }}>
                        {value.toFixed(4)} {method}
                      </span>
                    </div>
                  ))}
                </motion.div>
              )}
            </div>

            <button
              onClick={handleWithdraw}
              disabled={!isValid}
              className="w-full mt-5 py-3.5 rounded-2xl text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(135deg, #7c3aed, #059669)",
                boxShadow: isValid ? "0 4px 24px rgba(109,40,217,0.35)" : "none",
              }}
            >
              Confirmar Retiro
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
});

export const WithdrawPanel = memo(function WithdrawPanel({ totalEarnings }: WithdrawPanelProps) {
  const [showModal, setShowModal] = useState(false);
  const hasBalance = totalEarnings > 0;

  return (
    <>
      <SectionBlock icon={Wallet} title="Wallet & Retiros" iconColor="text-emerald-400">
        <div
          className="rounded-2xl p-5 mb-4"
          style={{
            background: "linear-gradient(135deg, rgba(16,185,129,0.12), rgba(109,40,217,0.12))",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <p className="text-[10px] text-white/35 uppercase tracking-widest font-semibold mb-1">Saldo disponible</p>
          <div className="flex items-end gap-2">
            <span
              className="text-3xl font-black tracking-tight"
              style={{
                background: "linear-gradient(135deg, #34d399, #a78bfa)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {totalEarnings.toFixed(4)}
            </span>
            <span className="text-sm text-white/40 mb-1">WLD</span>
          </div>
          <p className="text-[10px] text-white/25 mt-2">≈ ${(totalEarnings * 2.4).toFixed(2)} USD</p>
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => hasBalance && setShowModal(true)}
          disabled={!hasBalance}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            background: hasBalance ? "linear-gradient(135deg, #7c3aed, #059669)" : "rgba(255,255,255,0.06)",
            boxShadow: hasBalance ? "0 4px 20px rgba(109,40,217,0.35)" : "none",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <ArrowDownToLine size={15} />
          {hasBalance ? "Retirar Fondos" : "Sin saldo disponible"}
        </motion.button>

        <div className="mt-5">
          <div className="flex items-center gap-1.5 mb-3">
            <Clock size={11} className="text-white/25" />
            <p className="text-[10px] text-white/25 uppercase tracking-widest font-semibold">Historial de retiros</p>
          </div>
          <EmptyStatePremium
            icon={ArrowDownToLine}
            iconColor="text-emerald-400"
            title="Sin retiros aún"
            description="Cuando acumules ganancias podrás retirar directamente a tu wallet."
            compact
          />
        </div>
      </SectionBlock>

      <AnimatePresence>
        {showModal && (
          <WithdrawModal balance={totalEarnings} onClose={() => setShowModal(false)} />
        )}
      </AnimatePresence>
    </>
  );
});
