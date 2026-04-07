import { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Megaphone, Plus, Play, Pause, Eye, MousePointerClick, DollarSign, X } from "lucide-react";
import { SectionBlock } from "../primitives/SectionBlock";
import { EmptyStatePremium } from "../primitives/EmptyStatePremium";
import { useCampaigns, type Campaign, type CreateCampaignInput } from "../../hooks/useCampaigns";

interface AdvertiserPanelProps {
  userId: string | null | undefined;
}

const AD_CATEGORIES = ["Tecnología", "Finanzas & Inversión", "Crypto / Web3", "Lifestyle", "Gaming", "Educación", "Sin preferencia"];

interface CreateCampaignModalProps {
  onClose: () => void;
  onCreate: (input: CreateCampaignInput) => Promise<boolean>;
}

const CreateCampaignModal = memo(function CreateCampaignModal({ onClose, onCreate }: CreateCampaignModalProps) {
  const [name, setName] = useState("");
  const [budget, setBudget] = useState("");
  const [category, setCategory] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const isValid = name.trim().length > 0 && parseFloat(budget) > 0;

  const handleCreate = async () => {
    if (!isValid) return;
    setSaving(true);
    await onCreate({ name: name.trim(), budget: parseFloat(budget), category });
    setSaving(false);
    setDone(true);
    setTimeout(onClose, 800);
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative w-full max-w-md rounded-t-3xl p-6 pb-10"
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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-bold text-white">Nueva Campaña</h3>
            <p className="text-xs text-white/30 mt-0.5">Configura tu campaña publicitaria</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white/40 hover:text-white transition-all"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[10px] text-white/40 uppercase tracking-widest font-semibold mb-1.5 block">
              Nombre de campaña
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Campaña verano 2025"
              className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/20 outline-none"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
            />
          </div>

          <div>
            <label className="text-[10px] text-white/40 uppercase tracking-widest font-semibold mb-1.5 block">
              Presupuesto (WLD)
            </label>
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="0.0000"
              className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/20 outline-none"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
            />
          </div>

          <div>
            <label className="text-[10px] text-white/40 uppercase tracking-widest font-semibold mb-1.5 block">
              Categoría objetivo
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm text-white/70 outline-none appearance-none"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <option value="">Seleccionar categoría</option>
              {AD_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <button
          onClick={handleCreate}
          disabled={!isValid || saving || done}
          className="w-full mt-6 py-3.5 rounded-2xl text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-40"
          style={{
            background: done ? "rgba(52,211,153,0.6)" : "linear-gradient(135deg, #7c3aed, #059669)",
            boxShadow: "0 4px 24px rgba(109,40,217,0.35)",
          }}
        >
          {done ? "¡Campaña creada!" : saving ? "Lanzando…" : "Lanzar Campaña"}
        </button>
      </motion.div>
    </motion.div>
  );
});

interface CampaignCardProps {
  campaign: Campaign;
  onToggleStatus: (id: string, status: "active" | "paused") => void;
}

const CampaignCard = memo(function CampaignCard({ campaign, onToggleStatus }: CampaignCardProps) {
  const spent = campaign.spent ?? 0;
  const budget = campaign.budget ?? 0;
  const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-2xl space-y-3"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white/85 truncate">{campaign.name}</p>
          <p className="text-[10px] text-white/30 mt-0.5">
            {spent.toFixed(4)} / {budget.toFixed(4)} WLD gastado
          </p>
        </div>
        <button
          onClick={() => onToggleStatus(campaign.id, campaign.status === "active" ? "paused" : "active")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-semibold uppercase tracking-wider transition-all active:scale-95"
          style={{
            background: campaign.status === "active" ? "rgba(52,211,153,0.15)" : "rgba(255,255,255,0.06)",
            border: campaign.status === "active" ? "1px solid rgba(52,211,153,0.25)" : "1px solid rgba(255,255,255,0.08)",
            color: campaign.status === "active" ? "#34d399" : "rgba(255,255,255,0.35)",
          }}
        >
          {campaign.status === "active" ? <Pause size={10} /> : <Play size={10} />}
          {campaign.status === "active" ? "Pausar" : "Reanudar"}
        </button>
      </div>

      {/* Budget progress bar */}
      <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: "linear-gradient(90deg, #7c3aed, #34d399)" }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: Eye, label: "Impresiones", value: (campaign.impressions ?? 0).toLocaleString(), color: "#60a5fa" },
          { icon: MousePointerClick, label: "Clicks", value: (campaign.clicks ?? 0).toLocaleString(), color: "#a78bfa" },
          { icon: DollarSign, label: "Gastado", value: spent.toFixed(4), color: "#34d399" },
        ].map(({ icon: Icon, label, value, color }) => (
          <div
            key={label}
            className="flex flex-col items-center py-2 rounded-xl"
            style={{ background: "rgba(255,255,255,0.03)" }}
          >
            <Icon size={11} style={{ color }} className="mb-1" />
            <p className="text-xs font-bold text-white/80">{value}</p>
            <p className="text-[9px] text-white/25 mt-0.5">{label}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
});

export const AdvertiserPanel = memo(function AdvertiserPanel({ userId }: AdvertiserPanelProps) {
  const [showModal, setShowModal] = useState(false);
  const { campaigns, loading, createCampaign, updateStatus } = useCampaigns(userId);

  return (
    <>
      <SectionBlock icon={Megaphone} title="Advertiser Panel" iconColor="text-blue-400">
        <div className="flex items-center justify-between mb-4 -mt-1">
          <p className="text-xs text-white/30">Gestiona tus campañas publicitarias</p>
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white"
            style={{
              background: "linear-gradient(135deg, rgba(109,40,217,0.5), rgba(16,185,129,0.35))",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <Plus size={12} />
            Crear Campaña
          </motion.button>
        </div>

        {loading && (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
            ))}
          </div>
        )}

        {!loading && campaigns.length === 0 && (
          <EmptyStatePremium
            icon={Megaphone}
            iconColor="text-blue-400"
            title="Lanza tu primera campaña"
            description="Llega a miles de usuarios con tus anuncios. Configura presupuesto, audiencia y lanza en segundos."
            actionLabel="Crear Campaña"
            onAction={() => setShowModal(true)}
            compact
          />
        )}

        {!loading && campaigns.length > 0 && (
          <div className="space-y-3">
            {campaigns.map((c) => (
              <CampaignCard
                key={c.id}
                campaign={c}
                onToggleStatus={(id, status) => updateStatus(id, status)}
              />
            ))}
          </div>
        )}
      </SectionBlock>

      <AnimatePresence>
        {showModal && (
          <CreateCampaignModal
            onClose={() => setShowModal(false)}
            onCreate={createCampaign}
          />
        )}
      </AnimatePresence>
    </>
  );
});
