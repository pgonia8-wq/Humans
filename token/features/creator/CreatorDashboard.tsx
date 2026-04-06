import { useState, useRef } from "react";
import { MiniKit, Tokens, tokenToDecimals } from "@worldcoin/minikit-js";
import { useApp } from "@/context/AppContext";
import { api } from "@/services/api";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, CheckCircle2, ShieldAlert, Camera, ArrowRight, Sparkles } from "lucide-react";

type Step = "form" | "checking_orb" | "paying" | "creating" | "success" | "orb_required";

interface TokenForm {
  name: string;
  symbol: string;
  emoji: string;
  description: string;
  twitter: string;
  telegram: string;
  website: string;
}

const EMOJIS = ["🌟","💜","🔺","🔥","🌊","🌀","⚡","🦋","🧬","🎯","🪄","🌙","🦄","🏆","🌈","💎","🚀","🪐","🎮","🎵","🎨","🌺","🐉","🦊","⭐","🔮","🎪","🍀","🦅","🐋"];
const CREATION_FEE = 5;
const RECEIVER = import.meta.env?.VITE_PAYMENT_RECEIVER || "";

function generatePayReference(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export default function CreatorDashboard() {
  const { closeCreatorDashboard, user, navigate } = useApp();
  const [step, setStep] = useState<Step>("form");
  const [form, setForm] = useState<TokenForm>({
    name: "", symbol: "", emoji: "🌟", description: "",
    twitter: "", telegram: "", website: "",
  });
  const [avatarBase64, setAvatarBase64] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createdTokenId, setCreatedTokenId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const updateField = (key: keyof TokenForm, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setError(null);
  };

  const handleAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError("Image must be under 2MB"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setAvatarBase64(result.split(",")[1]);
      setAvatarPreview(result);
    };
    reader.readAsDataURL(file);
  };

  const validate = (): string | null => {
    if (!form.name.trim()) return "Token name is required";
    if (form.name.length > 32) return "Name must be 32 characters or less";
    if (!form.symbol.trim()) return "Symbol is required";
    if (form.symbol.length < 2 || form.symbol.length > 8) return "Symbol must be 2-8 characters";
    if (form.description.length < 10) return "Description must be at least 10 characters";
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setStep("checking_orb");
    setError(null);

    try {
      if (!user?.id) throw new Error("Not authenticated");

      const orbRes = await api.checkOrbStatus(user.id);
      if (!orbRes.orbVerified) { setStep("orb_required"); return; }

      setStep("paying");

      if (!MiniKit.isInstalled()) throw new Error("World App not detected. Open from World App.");
      if (!RECEIVER) throw new Error("Payment receiver not configured");

      const payRes = await MiniKit.commandsAsync.pay({
        reference: generatePayReference(),
        to: RECEIVER,
        tokens: [{
          symbol: Tokens.WLD,
          token_amount: tokenToDecimals(CREATION_FEE, Tokens.WLD).toString(),
        }],
        description: `Create token: ${form.symbol}`,
      });

      if (payRes?.finalPayload?.status !== "success") {
        setStep("form");
        return;
      }

      const transactionId = payRes.finalPayload.transaction_id;

      setStep("creating");

      let avatarUrl: string | undefined;
      if (avatarBase64) {
        const uploadRes = await api.uploadAvatar(avatarBase64, user.id, "token", undefined, `${form.symbol}.png`);
        if (uploadRes.success) avatarUrl = uploadRes.url;
      }

      const token = await api.createToken({
        name: form.name.trim(),
        symbol: form.symbol.toUpperCase().trim(),
        description: form.description.trim(),
        emoji: form.emoji,
        creatorId: user.id,
        avatarUrl,
        transactionId,
        twitter: form.twitter.trim() || undefined,
        telegram: form.telegram.trim() || undefined,
        website: form.website.trim() || undefined,
      });

      setCreatedTokenId(token.id);
      setStep("success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setStep("form");
    }
  };

  return (
    <div className="min-h-full bg-background" data-testid="creator-dashboard">
      <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-xl px-4 py-3 flex items-center justify-between border-b border-border/30">
        <h2 className="text-lg font-bold text-foreground">Create Token</h2>
        <button onClick={closeCreatorDashboard} data-testid="button-close-creator" className="p-2 rounded-xl hover:bg-card/60 active:scale-95 transition-all">
          <X className="w-5 h-5 text-foreground" />
        </button>
      </div>

      <div className="px-4 pt-4 pb-20">
        <AnimatePresence mode="wait">
          {step === "form" && (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => fileRef.current?.click()}
                  data-testid="button-upload-avatar"
                  className="w-20 h-20 rounded-2xl bg-card/60 border-2 border-dashed border-border/50 flex items-center justify-center hover:border-primary/50 transition-colors shrink-0 overflow-hidden"
                >
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="preview" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-6 h-6 text-muted-foreground" />
                  )}
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
                <div className="flex-1 space-y-2">
                  <input
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="Token Name"
                    data-testid="input-token-name"
                    className="w-full p-2.5 rounded-xl bg-card/60 border border-border/40 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                  />
                  <input
                    value={form.symbol}
                    onChange={(e) => updateField("symbol", e.target.value.toUpperCase().slice(0, 8))}
                    placeholder="SYMBOL (2-8 chars)"
                    data-testid="input-token-symbol"
                    className="w-full p-2.5 rounded-xl bg-card/60 border border-border/40 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5 block">Emoji</label>
                <div className="flex flex-wrap gap-1.5">
                  {EMOJIS.map((e) => (
                    <button
                      key={e}
                      onClick={() => updateField("emoji", e)}
                      data-testid={`emoji-${e}`}
                      className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all ${
                        form.emoji === e ? "bg-primary/20 border-2 border-primary scale-110" : "bg-card/40 border border-border/30 hover:border-primary/30"
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5 block">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  placeholder="Describe your token (min 10 chars)..."
                  rows={3}
                  data-testid="input-description"
                  className="w-full p-3 rounded-xl bg-card/60 border border-border/40 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] text-muted-foreground uppercase tracking-wider">Socials (optional)</label>
                <input value={form.twitter} onChange={(e) => updateField("twitter", e.target.value)} placeholder="Twitter/X handle" data-testid="input-twitter" className="w-full p-2.5 rounded-xl bg-card/60 border border-border/40 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50" />
                <input value={form.telegram} onChange={(e) => updateField("telegram", e.target.value)} placeholder="Telegram link" data-testid="input-telegram" className="w-full p-2.5 rounded-xl bg-card/60 border border-border/40 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50" />
                <input value={form.website} onChange={(e) => updateField("website", e.target.value)} placeholder="Website URL" data-testid="input-website" className="w-full p-2.5 rounded-xl bg-card/60 border border-border/40 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50" />
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <div className="text-xs text-amber-400 font-medium">Creation fee: {CREATION_FEE} WLD</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Paid via World App to launch your token on the bonding curve</div>
              </div>

              {error && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl">
                  {error}
                </motion.div>
              )}

              <button
                onClick={handleSubmit}
                data-testid="button-create-submit"
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 text-white font-bold text-sm active:scale-[0.97] transition-transform shadow-[0_0_24px_rgba(139,92,246,0.3)] flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" /> Create Token
              </button>
            </motion.div>
          )}

          {step === "checking_orb" && (
            <motion.div key="checking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-20 space-y-4">
              <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
              <div className="text-sm font-medium text-foreground">Checking ORB verification...</div>
            </motion.div>
          )}

          {step === "orb_required" && (
            <motion.div key="orb" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-20 space-y-4">
              <ShieldAlert className="w-12 h-12 text-amber-400 mx-auto" />
              <div className="text-lg font-bold text-foreground">ORB Verification Required</div>
              <p className="text-sm text-muted-foreground px-6">You need to verify with World ID ORB in the main H app before creating tokens.</p>
              <button onClick={() => setStep("form")} data-testid="button-back-form" className="text-sm text-primary font-medium">Go Back</button>
            </motion.div>
          )}

          {step === "paying" && (
            <motion.div key="paying" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-20 space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
              <div className="text-lg font-bold text-foreground">Waiting for Payment</div>
              <p className="text-sm text-muted-foreground">Confirm the {CREATION_FEE} WLD payment in World App</p>
            </motion.div>
          )}

          {step === "creating" && (
            <motion.div key="creating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-20 space-y-4">
              <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
              <div className="text-sm font-medium text-foreground">Creating your token...</div>
              <p className="text-xs text-muted-foreground">Deploying {form.symbol} to the bonding curve</p>
            </motion.div>
          )}

          {step === "success" && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-center py-16 space-y-4">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, delay: 0.1 }}>
                <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto" />
              </motion.div>
              <div className="text-2xl">{form.emoji}</div>
              <div className="text-xl font-bold text-foreground">{form.name}</div>
              <div className="text-sm text-muted-foreground">${form.symbol} is now live on the bonding curve</div>
              <div className="flex gap-3 justify-center pt-2">
                <button
                  onClick={() => {
                    closeCreatorDashboard();
                    if (createdTokenId) navigate("token", { tokenId: createdTokenId });
                  }}
                  data-testid="button-view-token"
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 text-white font-bold text-sm active:scale-95 transition-transform flex items-center gap-2"
                >
                  View Token <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={closeCreatorDashboard}
                  data-testid="button-done"
                  className="px-6 py-3 rounded-xl border border-border/40 text-sm font-medium text-muted-foreground"
                >
                  Done
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
