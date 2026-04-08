import { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, ArrowDownToLine, Clock, CheckCircle, X, AlertCircle } from "lucide-react";
import { SectionBlock } from "../primitives/SectionBlock";
import { EmptyStatePremium } from "../primitives/EmptyStatePremium";
import { useWithdrawals, type Withdrawal } from "../../hooks/useWithdrawals";

const MIN_WITHDRAW = 0.1;
const STATUS_LABELS: Record<Withdrawal["status"], { label: string; color: string }> = {
  pending: { label: "Pendiente", color: "#f59e0b" },
  processing: { label: "Procesando", color: "#60a5fa" },
  completed: { label: "Completado", color: "#34d399" },
  failed: { label: "Fallido", color: "#f87171" },
};

interface WithdrawPanelProps {
  userId: string | null | undefined;
  totalEarnings: number;
  open?: boolean;
  onClose?: () => void;
}

type WithdrawStep = "idle" | "processing" | "done";

interface WithdrawModalProps {
  balance: number;
  onClose: () => void;
  onSubmit: (amount: number, wallet: string, token: "WLD" | "USDC") => Promise<void>;
}

const WithdrawModal = memo(function WithdrawModal({ balance, onClose, onSubmit }: WithdrawModalProps) {
  const [amount, setAmount] = useState("");
  const [wallet, setWallet] = useState("");
  const [method, setMethod] = useState<"WLD" | "USDC">("WLD");
  const [step, setStep] = useState<WithdrawStep>("idle");

  const numAmount = parseFloat(amount) || 0;
  const creatorShare = numAmount * 0.7;
  const reinvestShare = numAmount * 0.25;
  const poolShare = numAmount * 0.05;
  const isValid = numAmount >= MIN_WITHDRAW && numAmount <= balance && wallet.trim().length > 10;

  const handleWithdraw = async () => {
    if (!isValid) return;
    setStep("processing");
    await onSubmit(numAmount, wallet.trim(), method);
    setStep("done");
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
              Tu solicitud de <span className="text-emerald-400 font-bold">{numAmount.toFixed(4)} {method}</span> está en proceso.
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
              <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center text-white/40 hover:text-white transition-all">
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
                <div className="flex justify-between mb-1.5">
                  <label className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">Cantidad</label>
                  <button onClick={() => setAmount(balance.toFixed(4))} className="text-[10px] text-violet-400 font-semibold">
                    Máximo
                  </button>
                </div>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.0000"
                  max={balance}
                  className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/20 outline-none"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                />
                {numAmount > 0 && numAmount < MIN_WITHDRAW && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <AlertCircle size={11} className="text-amber-400" />
                    <p className="text-[10px] text-amber-400">Mínimo: {MIN_WITHDRAW} WLD</p>
                  </div>
                )}
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
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                />
              </div>

              {numAmount >= MIN_WITHDRAW && (
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
                    { label: "5% Pool comunitario", value: poolShare, color: "#60a5fa" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex justify-between items-center">
                      <span className="text-xs text-white/40">{label}</span>
                      <span className="text-xs font-bold" style={{ color }}>{value.toFixed(4)} {method}</span>
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

export const WithdrawPanel = memo(function WithdrawPanel({ userId, totalEarnings, open, onClose }: WithdrawPanelProps) {
  const [showModal, setShowModal] = useState(false);
  const { withdrawals, loading, createWithdrawal } = useWithdrawals(userId);
  const hasBalance = totalEarnings >= MIN_WITHDRAW;
  const missing = Math.max(0, MIN_WITHDRAW - totalEarnings);

  const handleOpen = () => { if (hasBalance) setShowModal(true); };
  const handleClose = () => {setShowModal(false); onClose?.();
};
  const isOpen = showModal || !!open;
  const handleSubmit = async (amount: number, wallet: string, token: "WLD" | "USDC") => {
    await createWithdrawal({ amount, wallet_address: wallet, currency: token });
  };

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

        {!hasBalance && missing > 0 && (
          <div
            className="flex items-center gap-2.5 px-4 py-3 rounded-xl mb-3"
            style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.18)" }}
          >
            <AlertCircle size={14} className="text-amber-400 shrink-0" />
            <p className="text-[11px] text-amber-300/70 leading-snug">
              Necesitas {missing.toFixed(4)} WLD más para poder retirar (mínimo {MIN_WITHDRAW} WLD)
            </p>
          </div>
        )}

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleOpen}
          disabled={!hasBalance}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: hasBalance ? "linear-gradient(135deg, #7c3aed, #059669)" : "rgba(255,255,255,0.06)",
            boxShadow: hasBalance ? "0 4px 20px rgba(109,40,217,0.35)" : "none",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <ArrowDownToLine size={15} />
          {hasBalance ? "Retirar Fondos" : `Faltan ${missing.toFixed(4)} WLD`}
        </motion.button>

        <div className="mt-5">
          <div className="flex items-center gap-1.5 mb-3">
            <Clock size={11} className="text-white/25" />
            <p className="text-[10px] text-white/25 uppercase tracking-widest font-semibold">Historial de retiros</p>
          </div>

          {loading && (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
              ))}
            </div>
          )}

          {!loading && withdrawals.length === 0 && (
            <EmptyStatePremium
              icon={ArrowDownToLine}
              iconColor="text-emerald-400"
              title="Sin retiros aún"
              description="Cuando acumules ganancias podrás retirar directamente a tu wallet."
              compact
            />
          )}

          {!loading && withdrawals.length > 0 && (
            <div className="space-y-2">
              {withdrawals.map((w) => {
                const st = STATUS_LABELS[w.status] ?? { label: w.status, color: "rgba(255,255,255,0.4)" };
                return (
                  <div
                    key={w.id}
                    className="flex items-center justify-between px-4 py-3 rounded-xl"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <div>
                      <p className="text-xs font-semibold text-white/80">{w.amount.toFixed(4)} {w.currency}</p>
                      <p className="text-[10px] text-white/25 font-mono mt-0.5">{w.wallet_address.slice(0, 10)}…</p>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg" style={{ color: st.color, background: `${st.color}18` }}>
                      {st.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SectionBlock>

<AnimatePresence>
  {isOpen && (
    <WithdrawModal
      balance={totalEarnings}
      onClose={handleClose}
      onSubmit={handleSubmit}
    />
  )}
</AnimatePresence>
    </>
  );
});
