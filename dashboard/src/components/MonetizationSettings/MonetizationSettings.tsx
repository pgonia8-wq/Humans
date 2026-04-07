import { memo, useState } from "react";
import { motion } from "framer-motion";
import { Settings, Info, ChevronDown } from "lucide-react";
import { SectionBlock } from "../primitives/SectionBlock";
import { useMonetizationSettings, type MonetizationSettings as SettingsData } from "../../hooks/useMonetizationSettings";

const AD_CATEGORIES = [
  "Tecnología",
  "Finanzas & Inversión",
  "Crypto / Web3",
  "Lifestyle",
  "Gaming",
  "Educación",
  "Salud & Bienestar",
  "Sin preferencia",
];

interface MonetizationSettingsProps {
  userId: string | null | undefined;
  settings?: SettingsData;
  onUpdate?: (patch: Partial<SettingsData>) => void;
}

interface ToggleRowProps {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}

const ToggleRow = memo(function ToggleRow({ label, description, value, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 border-b last:border-0" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white/80">{label}</p>
        <p className="text-[11px] text-white/30 mt-0.5 leading-snug">{description}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className="relative shrink-0 w-11 h-6 rounded-full transition-all duration-300 active:scale-95"
        style={{
          background: value ? "linear-gradient(135deg, #059669, #34d399)" : "rgba(255,255,255,0.08)",
          boxShadow: value ? "0 0 12px rgba(52,211,153,0.3)" : "none",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <motion.div
          className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm"
          animate={{ left: value ? "calc(100% - 1.375rem)" : "2px" }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
        />
      </button>
    </div>
  );
});

export const MonetizationSettings = memo(function MonetizationSettings({ userId, settings: extSettings, onUpdate: extUpdate }: MonetizationSettingsProps) {
  const internal = useMonetizationSettings(extSettings ? null : userId);
  const settings = extSettings ?? internal.settings;
  const update = extUpdate ?? internal.updateSettings;

  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  return (
    <SectionBlock icon={Settings} title="Configuración de Monetización" iconColor="text-amber-400">
      <div className="space-y-0 mb-5">
        <ToggleRow
          label="Anuncios en posts"
          description="Activa para mostrar anuncios en tu contenido y ganar WLD por impresiones y clics."
          value={settings.ads_enabled}
          onChange={(v) => update({ ads_enabled: v })}
        />
        <ToggleRow
          label="Permitir sponsorships"
          description="Recibe propuestas directas de marcas para colaboraciones patrocinadas."
          value={settings.sponsorships_enabled}
          onChange={(v) => update({ sponsorships_enabled: v })}
        />
      </div>

      <div className="mb-5">
        <label className="text-[10px] text-white/40 uppercase tracking-widest font-semibold mb-2 block">
          Categoría preferida de anuncios
        </label>
        <div className="relative">
          <button
            onClick={() => setShowCategoryDropdown((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm text-white/70 transition-all"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <span>{settings.ad_category}</span>
            <motion.div animate={{ rotate: showCategoryDropdown ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown size={14} className="text-white/30" />
            </motion.div>
          </button>

          {showCategoryDropdown && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              className="absolute top-full left-0 right-0 z-20 mt-1 rounded-2xl overflow-hidden"
              style={{
                background: "rgba(14,14,28,0.97)",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
              }}
            >
              {AD_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => { update({ ad_category: cat }); setShowCategoryDropdown(false); }}
                  className="w-full text-left px-4 py-3 text-sm transition-all border-b last:border-0"
                  style={{
                    color: settings.ad_category === cat ? "#a78bfa" : "rgba(255,255,255,0.55)",
                    borderColor: "rgba(255,255,255,0.04)",
                    background: settings.ad_category === cat ? "rgba(124,58,237,0.1)" : "transparent",
                  }}
                >
                  {cat}
                </button>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      <div
        className="flex items-start gap-3 p-4 rounded-2xl"
        style={{ background: "rgba(96,165,250,0.06)", border: "1px solid rgba(96,165,250,0.12)" }}
      >
        <Info size={14} className="text-blue-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-blue-300/80 mb-1">¿Cómo funciona la monetización?</p>
          <p className="text-[11px] text-white/35 leading-relaxed">
            Cuando un usuario ve o hace clic en un anuncio en tu post, recibes WLD directamente en tu wallet.
            El 70% es tuyo, el 25% se reinvierte y el 5% va al pool comunitario.
          </p>
        </div>
      </div>
    </SectionBlock>
  );
});
