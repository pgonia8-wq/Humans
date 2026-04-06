import { useState, useRef } from "react";
import { useApp } from "@/context/AppContext";
import { api } from "@/services/api";
import { MiniKit, Tokens, tokenToDecimals } from "@worldcoin/minikit-js";

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

const EMOJIS = ["🌟","💜","🔺","🔥","🌊","🌀","⚡","🦋","🧬","🎯","🪄","🌙","🦄","🏆","🌈"];
const CREATION_FEE = 5;
const RECEIVER = (import.meta as any).env?.VITE_PAYMENT_RECEIVER || "";

function generatePayReference(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function CreatorDashboard() {
  const { closeCreatorDashboard, user } = useApp();
  const [step, setStep] = useState<Step>("form");
  const [form, setForm] = useState<TokenForm>({
    name: "", symbol: "", emoji: "🌟", description: "",
    twitter: "", telegram: "", website: "",
  });
  const [loading, setLoading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarBase64, setAvatarBase64] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const set = (k: keyof TokenForm, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setError("Image must be under 4MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setAvatarPreview(result);
      setAvatarBase64(result.split(",")[1]);
    };
    reader.readAsDataURL(file);
  };

  const checkOrbFromSupabase = async (): Promise<boolean> => {
    const userId = user?.id;
    if (!userId || userId === "usr_guest") {
      setError("You need to be logged in via World App");
      return false;
    }

    setStep("checking_orb");
    setError(null);

    try {
      const status = await api.checkOrbStatus(userId);

      if (!status.orbVerified) {
        setStep("orb_required");
        setError(
          status.verificationLevel === "device"
            ? "Device verification is not sufficient. You need ORB verification."
            : "ORB verification required. Verify in the main H app first."
        );
        return false;
      }

      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setStep("orb_required");
      return false;
    }
  };

  const executePayment = async (): Promise<string | null> => {
    setStep("paying");
    setError(null);

    try {
      if (!MiniKit.isInstalled()) {
        throw new Error("World App not detected. Open this app from World App.");
      }

      const reference = generatePayReference();

      const payRes = await MiniKit.commandsAsync.pay({
        reference,
        to: RECEIVER,
        tokens: [
          {
            symbol: Tokens.WLD,
            token_amount: tokenToDecimals(CREATION_FEE, Tokens.WLD).toString(),
          },
        ],
        description: `Create token: ${form.name} ($${form.symbol.toUpperCase()})`,
      });

      if (payRes?.finalPayload?.status !== "success") {
        throw new Error("Payment cancelled or failed");
      }

      const transactionId = payRes.finalPayload.transaction_id;
      if (!transactionId) {
        throw new Error("No transaction ID received from payment");
      }

      setTxHash(transactionId);

      const verifyRes = await api.verifyTokenPayment(
        transactionId,
        user?.id ?? "",
        "create_token"
      );

      if (!verifyRes.success) {
        throw new Error("Payment verification failed on server");
      }

      return transactionId;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setStep("form");
      return null;
    }
  };

  const handleCreate = async () => {
    setLoading(true);
    setError(null);

    try {
      const orbOk = await checkOrbFromSupabase();
      if (!orbOk) { setLoading(false); return; }

      const transactionId = await executePayment();
      if (!transactionId) { setLoading(false); return; }

      setStep("creating");

      let avatarUrl: string | undefined;
      if (avatarBase64) {
        try {
          const uploadResult = await api.uploadAvatar(
            avatarBase64,
            user?.id ?? "usr_guest",
            "token",
            undefined,
            `${form.symbol.toLowerCase()}_avatar.png`
          );
          avatarUrl = uploadResult.url;
        } catch (uploadErr) {
          console.warn("[CreatorDashboard] Avatar upload failed, continuing without:", uploadErr);
        }
      }

      await api.createToken({
        name: form.name,
        symbol: form.symbol.toUpperCase(),
        description: form.description,
        emoji: form.emoji,
        creatorId: user?.id ?? "usr_guest",
        avatarUrl,
        twitter: form.twitter || undefined,
        telegram: form.telegram || undefined,
        website: form.website || undefined,
        transactionId,
      });

      setStep("success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setStep("form");
      console.error("[CreatorDashboard]", msg);
    } finally {
      setLoading(false);
    }
  };

  const isValid = form.name.length >= 2 && form.symbol.length >= 2 && form.description.length >= 10;

  const labelStyle = {
    fontSize: 11, color: "#888", fontWeight: 600 as const,
    letterSpacing: "0.06em", textTransform: "uppercase" as const,
    display: "block", marginBottom: 6,
  };

  const inputStyle = {
    width: "100%", padding: "12px 14px",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 10, color: "#e8e9f0", fontSize: 14, outline: "none",
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
        display: "flex", alignItems: "flex-end", zIndex: 300, backdropFilter: "blur(4px)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) closeCreatorDashboard(); }}
    >
      <div
        className="slide-up"
        style={{
          width: "100%", maxHeight: "92vh", background: "#111218",
          borderRadius: "20px 20px 0 0", border: "1px solid rgba(255,255,255,0.1)",
          borderBottom: "none", display: "flex", flexDirection: "column",
        }}
      >
        <div style={{
          padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)",
          display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0,
        }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: "#e8e9f0" }}>
            {step === "success" ? "Token Launched!" : step === "orb_required" ? "ORB Required" : "Create Token"}
          </h2>
          <button onClick={closeCreatorDashboard} style={{
            background: "none", border: "none", color: "#666", fontSize: 20, cursor: "pointer", padding: 4,
          }}>×</button>
        </div>

        <div className="scrollable" style={{ flex: 1, padding: 16 }}>
          {step === "orb_required" ? (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>🔐</div>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: "#f7a606", marginBottom: 12 }}>
                ORB Verification Required
              </h3>
              <p style={{ fontSize: 14, color: "#888", lineHeight: 1.6, marginBottom: 8 }}>
                To create tokens, you must verify your identity with <strong style={{ color: "#8b5cf6" }}>World ID ORB</strong> in the main H app.
              </p>
              <p style={{ fontSize: 12, color: "#666", lineHeight: 1.5, marginBottom: 24 }}>
                This ensures one person = one creator. Device-level verification is not sufficient.
                Go back to the main app and verify with an ORB operator.
              </p>

              {error && (
                <div style={{
                  padding: 12, background: "rgba(240,80,80,0.1)", borderRadius: 12,
                  marginBottom: 16, border: "1px solid rgba(240,80,80,0.2)",
                }}>
                  <p style={{ fontSize: 12, color: "#f05050" }}>{error}</p>
                </div>
              )}

              <button
                onClick={() => { setStep("form"); setError(null); }}
                style={{
                  width: "100%", padding: 12, background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14,
                  color: "#888", fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}
              >
                Go Back
              </button>
            </div>
          ) : step === "success" ? (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>
                {avatarPreview ? (
                  <img src={avatarPreview} alt="" style={{
                    width: 80, height: 80, borderRadius: "50%", objectFit: "cover",
                    border: "3px solid #10f090",
                  }} />
                ) : (
                  form.emoji
                )}
              </div>
              <h3 style={{ fontSize: 22, fontWeight: 800, color: "#10f090", marginBottom: 10 }}>
                {form.name} is live!
              </h3>
              <p style={{ fontSize: 14, color: "#888", lineHeight: 1.6, marginBottom: 8 }}>
                Your token <strong style={{ color: "#8b5cf6" }}>${form.symbol.toUpperCase()}</strong> is now on the bonding curve.
              </p>
              <p style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>
                Creation fee: {CREATION_FEE} WLD · Verified via ORB
              </p>

              {txHash && (
                <div style={{
                  padding: 10, background: "rgba(16,240,144,0.08)", borderRadius: 10,
                  marginBottom: 16, border: "1px solid rgba(16,240,144,0.2)",
                }}>
                  <p style={{ fontSize: 10, color: "#10f090", fontFamily: "monospace", wordBreak: "break-all" }}>
                    TX: {txHash}
                  </p>
                </div>
              )}

              <div style={{
                padding: 16, background: "rgba(139,92,246,0.1)", borderRadius: 14,
                marginBottom: 12, border: "1px solid rgba(139,92,246,0.2)",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: "#888" }}>Total Supply</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#e8e9f0" }}>100,000,000</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: "#888" }}>Initial Price</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#e8e9f0" }}>$0.0000015</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: "#888" }}>Graduation Target</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#e8e9f0" }}>2,000 WLD</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, color: "#888" }}>Security</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#10f090" }}>ORB Verified ✓</span>
                </div>
              </div>

              <button onClick={closeCreatorDashboard} style={{
                width: "100%", padding: 14,
                background: "linear-gradient(135deg,#8b5cf6,#06d6f7)",
                border: "none", borderRadius: 14, color: "#fff", fontSize: 15, fontWeight: 800,
                cursor: "pointer",
              }}>
                View Token
              </button>
            </div>
          ) : step === "checking_orb" ? (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div style={{ fontSize: 48, marginBottom: 16, animation: "spin-slow 2s linear infinite" }}>🔐</div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "#f7a606", marginBottom: 8 }}>
                Checking ORB Status...
              </h3>
              <p style={{ fontSize: 13, color: "#888" }}>
                Verifying your identity from Supabase
              </p>
            </div>
          ) : step === "paying" ? (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div style={{ fontSize: 48, marginBottom: 16, animation: "spin-slow 2s linear infinite" }}>💳</div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "#e8e9f0", marginBottom: 8 }}>
                Processing Payment...
              </h3>
              <p style={{ fontSize: 13, color: "#888" }}>
                Approve {CREATION_FEE} WLD in World App
              </p>
              <p style={{ fontSize: 11, color: "#555", marginTop: 8 }}>
                On-chain verification in progress
              </p>
            </div>
          ) : step === "creating" ? (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div style={{ fontSize: 48, marginBottom: 16, animation: "spin-slow 2s linear infinite" }}>⚡</div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "#8b5cf6", marginBottom: 8 }}>
                Deploying {form.name}...
              </h3>
              <p style={{ fontSize: 13, color: "#888" }}>
                Setting up bonding curve on-chain
              </p>
            </div>
          ) : (
            <>
              <div style={{
                padding: 10, background: "rgba(16,240,144,0.06)", borderRadius: 10,
                marginBottom: 14, border: "1px solid rgba(16,240,144,0.15)",
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <span style={{ fontSize: 16 }}>🔐</span>
                <span style={{ fontSize: 11, color: "#10f090", fontWeight: 600 }}>
                  ORB verification required · On-chain payment via MiniKit
                </span>
              </div>

              <div style={{ marginBottom: 14, textAlign: "center" }}>
                <label style={labelStyle}>Token Avatar</label>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: 80, height: 80, borderRadius: "50%", border: "2px dashed rgba(139,92,246,0.4)",
                    background: avatarPreview ? "transparent" : "rgba(255,255,255,0.04)",
                    cursor: "pointer", overflow: "hidden",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    margin: "0 auto",
                  }}
                >
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="" style={{
                      width: "100%", height: "100%", objectFit: "cover",
                    }} />
                  ) : (
                    <span style={{ fontSize: 28, color: "#8b5cf6" }}>📷</span>
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarSelect}
                  style={{ display: "none" }}
                />
                <p style={{ fontSize: 10, color: "#555", marginTop: 4 }}>Tap to upload (max 4MB)</p>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Token Emoji</label>
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  style={{
                    width: 52, height: 52, fontSize: 28, borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.15)",
                    background: "rgba(255,255,255,0.06)", cursor: "pointer",
                  }}
                >
                  {form.emoji}
                </button>
                {showEmojiPicker && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                    {EMOJIS.map((e) => (
                      <button
                        key={e}
                        onClick={() => { set("emoji", e); setShowEmojiPicker(false); }}
                        style={{
                          width: 40, height: 40, fontSize: 22, borderRadius: 8,
                          border: `1px solid ${form.emoji === e ? "#8b5cf6" : "transparent"}`,
                          background: "rgba(255,255,255,0.04)", cursor: "pointer",
                        }}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {[
                { key: "name", label: "Token Name", placeholder: "e.g. Nova Protocol", maxLength: 30 },
                { key: "symbol", label: "Ticker Symbol", placeholder: "e.g. NOVA (3-5 chars)", maxLength: 8 },
              ].map(({ key, label, placeholder, maxLength }) => (
                <div key={key} style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>{label}</label>
                  <input
                    value={form[key as keyof TokenForm]}
                    onChange={(e) => set(key as keyof TokenForm, key === "symbol" ? e.target.value.toUpperCase() : e.target.value)}
                    placeholder={placeholder}
                    maxLength={maxLength}
                    style={inputStyle}
                  />
                </div>
              ))}

              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="What does your token do? What's the vision?"
                  rows={3}
                  style={{
                    ...inputStyle, resize: "none" as const, fontFamily: "inherit",
                    lineHeight: 1.5, fontSize: 13,
                  }}
                />
              </div>

              <div style={{
                padding: 14, background: "rgba(255,255,255,0.03)", borderRadius: 12,
                marginBottom: 14, border: "1px solid rgba(255,255,255,0.06)",
              }}>
                <label style={labelStyle}>Socials (optional)</label>
                {[
                  { key: "twitter", label: "𝕏 Twitter", placeholder: "https://x.com/..." },
                  { key: "telegram", label: "Telegram", placeholder: "https://t.me/..." },
                  { key: "website", label: "Website", placeholder: "https://..." },
                ].map(({ key, label, placeholder }) => (
                  <div key={key} style={{ marginBottom: 8 }}>
                    <span style={{ fontSize: 11, color: "#666", marginBottom: 4, display: "block" }}>{label}</span>
                    <input
                      value={form[key as keyof TokenForm]}
                      onChange={(e) => set(key as keyof TokenForm, e.target.value)}
                      placeholder={placeholder}
                      style={{ ...inputStyle, fontSize: 12, padding: "8px 12px" }}
                    />
                  </div>
                ))}
              </div>

              <div style={{
                padding: 14, background: "rgba(247,166,6,0.08)", borderRadius: 12,
                marginBottom: 14, border: "1px solid rgba(247,166,6,0.2)",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#f7a606" }}>Creation Fee</div>
                    <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                      On-chain payment via MiniKit Pay
                    </div>
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#f7a606" }}>
                    {CREATION_FEE} WLD
                  </div>
                </div>
              </div>

              <div style={{
                padding: 12, background: "rgba(139,92,246,0.06)", borderRadius: 12,
                marginBottom: 16, border: "1px solid rgba(139,92,246,0.15)",
              }}>
                <div style={{ fontSize: 11, color: "#888", lineHeight: 1.6 }}>
                  <strong style={{ color: "#8b5cf6" }}>Token Details:</strong><br/>
                  Supply: 100M · Initial Price: $0.0000015<br/>
                  Buy Fee: 2% · Sell Fee: 3% · Slippage: 10%<br/>
                  Creator Lock: 24h · Max Hold: 10%<br/>
                  Graduation: 2,000 WLD + 300 holders<br/>
                  <strong style={{ color: "#10f090" }}>Security: ORB Only · On-chain verified</strong>
                </div>
              </div>

              <button
                onClick={handleCreate}
                disabled={!isValid || loading}
                className={isValid && !loading ? "btn-pulse" : ""}
                style={{
                  width: "100%", padding: 16, borderRadius: 14, border: "none",
                  cursor: isValid && !loading ? "pointer" : "not-allowed",
                  fontSize: 15, fontWeight: 800,
                  background: isValid
                    ? "linear-gradient(135deg,#8b5cf6,#06d6f7)"
                    : "rgba(255,255,255,0.06)",
                  color: isValid ? "#fff" : "#555",
                  marginBottom: 16,
                }}
              >
                {loading ? "Processing..." : `🔐 Launch ${form.symbol || "Token"} · ${CREATION_FEE} WLD`}
              </button>

              {error && (
                <p style={{ textAlign: "center", fontSize: 12, color: "#f05050", marginTop: 8 }}>{error}</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
