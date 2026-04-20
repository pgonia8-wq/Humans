// Design System — H by humans / World App 2026
// Solo clases y tokens visuales. Sin lógica de negocio.

export const ds = {
  // ── Superficies glass ───────────────────────────────────────
  glass: {
    dark: "bg-zinc-950/85 backdrop-blur-2xl border border-white/10 shadow-2xl",
    light: "bg-white/85 backdrop-blur-2xl border border-black/10 shadow-2xl",
  },
  glassSurface: {
    dark: "bg-[#111113]/90 backdrop-blur-xl border border-white/[0.08] shadow-xl",
    light: "bg-white/90 backdrop-blur-xl border border-black/[0.07] shadow-xl",
  },

  // ── Fondo base ──────────────────────────────────────────────
  bg: {
    dark: "bg-[#0a0a0a] text-white",
    light: "bg-[#f8f9fa] text-gray-900",
  },

  // ── Tarjetas / contenedores ─────────────────────────────────
  card: {
    dark: "bg-[#111113] border border-white/[0.07]",
    light: "bg-white border border-gray-100 shadow-sm",
  },

  // ── Separadores ─────────────────────────────────────────────
  divider: {
    dark: "border-white/[0.06]",
    light: "border-gray-100",
  },

  // ── Tipografía ──────────────────────────────────────────────
  text: {
    primary:   { dark: "text-white",           light: "text-gray-900" },
    secondary: { dark: "text-gray-400",         light: "text-gray-500" },
    muted:     { dark: "text-gray-600",         light: "text-gray-400" },
    faint:     { dark: "text-gray-700",         light: "text-gray-300" },
  },

  // ── Avatar ──────────────────────────────────────────────────
  avatar: {
    size: "w-[52px] h-[52px]",
    ring: {
      dark:  "ring-2 ring-white/20",
      light: "ring-2 ring-black/10",
    },
  },

  // ── Gradientes de acento ─────────────────────────────────────
  gradient: {
    primary:   "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
    premium:   "linear-gradient(135deg, #b45309 0%, #fbbf24 100%)",
    tip:       "linear-gradient(135deg, #f59e0b 0%, #fb923c 100%)",
    boost:     "linear-gradient(135deg, #fb923c 0%, #f97316 100%)",
    emerald:   "linear-gradient(135deg, #10b981 0%, #059669 100%)",
  },

  // ── Botones de acción icon ────────────────────────────────────
  iconBtn: {
    base: "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all duration-150 hover:scale-105 active:scale-[0.97]",
    like: {
      active: "text-pink-500 bg-pink-500/10",
      dark:   "text-gray-500 hover:text-pink-400 hover:bg-pink-500/[0.09]",
      light:  "text-gray-400 hover:text-pink-500 hover:bg-pink-50",
    },
    comment: {
      dark:   "text-gray-500 hover:text-blue-400 hover:bg-blue-500/[0.09]",
      light:  "text-gray-400 hover:text-blue-500 hover:bg-blue-50",
    },
    repost: {
      dark:   "text-gray-500 hover:text-emerald-400 hover:bg-emerald-500/[0.09]",
      light:  "text-gray-400 hover:text-emerald-500 hover:bg-emerald-50",
    },
    tip: {
      dark:   "text-amber-500 hover:bg-amber-500/[0.09]",
      light:  "text-amber-600 hover:bg-amber-50",
    },
    boost: {
      dark:   "text-orange-400 hover:bg-orange-500/[0.09]",
      light:  "text-orange-500 hover:bg-orange-50",
    },
    chat: {
      dark:   "text-violet-400 hover:bg-violet-500/[0.09]",
      light:  "text-violet-600 hover:bg-violet-50",
    },
  },

  // ── Radios ──────────────────────────────────────────────────
  radius: {
    card: "rounded-3xl",
    secondary: "rounded-2xl",
    pill: "rounded-full",
  },

  // ── Inputs ──────────────────────────────────────────────────
  input: {
    dark:  "bg-white/[0.05] border border-white/[0.09] text-white placeholder-gray-600 focus:ring-violet-500/60",
    light: "bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-violet-400/60",
  },
} as const;
