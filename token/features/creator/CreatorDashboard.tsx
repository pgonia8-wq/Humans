import { useState } from "react";
import { useApp } from "@/context/AppContext";

type Step = "form" | "preview" | "success";

interface TokenForm {
  name: string;
  symbol: string;
  emoji: string;
  description: string;
  totalSupply: string;
  lockPercent: string;
  lockDays: string;
}

const EMOJIS = ["🌟","💜","🔺","🔥","🌊","🌀","⚡","🦋","🧬","🎯","🪄","🌙","🦄","🏆","🌈"];

export default function CreatorDashboard() {
  const { closeCreatorDashboard, user } = useApp();
  const [step, setStep] = useState<Step>("form");
  const [form, setForm] = useState<TokenForm>({
    name: "",
    symbol: "",
    emoji: "🌟",
    description: "",
    totalSupply: "1000000",
    lockPercent: "60",
    lockDays: "90",
  });
  const [loading, setLoading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const set = (k: keyof TokenForm, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleCreate = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1400));
    setLoading(false);
    setStep("success");
  };

  const isValid = form.name.length >= 2 && form.symbol.length >= 2 && form.description.length >= 10;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "flex-end",
        zIndex: 300,
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) closeCreatorDashboard(); }}
    >
      <div
        className="slide-up"
        style={{
          width: "100%",
          maxHeight: "92vh",
          background: "#111218",
          borderRadius: "20px 20px 0 0",
          border: "1px solid rgba(255,255,255,0.1)",
          borderBottom: "none",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: "14px 16px",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <h2 style={{ fontSize: 17, fontWeight: 800, color: "#e8e9f0" }}>
            {step === "success" ? "🎉 Token Launched!" : "🏗️ Create Token"}
          </h2>
          <button
            onClick={closeCreatorDashboard}
            style={{ background: "none", border: "none", color: "#666", fontSize: 20, cursor: "pointer", padding: 4 }}
          >
            ×
          </button>
        </div>

        <div className="scrollable" style={{ flex: 1, padding: 16 }}>
          {step === "success" ? (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>{form.emoji}</div>
              <h3 style={{ fontSize: 22, fontWeight: 800, color: "#10f090", marginBottom: 10 }}>
                {form.name} is live!
              </h3>
              <p style={{ fontSize: 14, color: "#888", lineHeight: 1.6, marginBottom: 28 }}>
                Your token <strong style={{ color: "#8b5cf6" }}>${form.symbol.toUpperCase()}</strong> is now on the bonding curve.
                Share it with the World community to drive early adoption.
              </p>
              <div
                style={{
                  padding: "16px",
                  background: "rgba(139,92,246,0.1)",
                  borderRadius: 14,
                  marginBottom: 24,
                  border: "1px solid rgba(139,92,246,0.2)",
                }}
              >
                <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>Creator ID</div>
                <div style={{ fontFamily: "monospace", fontSize: 13, color: "#8b5cf6", fontWeight: 600 }}>
                  {user?.id}
                </div>
              </div>
              <button
                onClick={closeCreatorDashboard}
                style={{
                  width: "100%",
                  padding: "14px",
                  background: "linear-gradient(135deg,#8b5cf6,#06d6f7)",
                  border: "none",
                  borderRadius: 14,
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                View in Explorer
              </button>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, color: "#888", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                  Token Emoji
                </label>
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  style={{
                    width: 52,
                    height: 52,
                    fontSize: 28,
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.15)",
                    background: "rgba(255,255,255,0.06)",
                    cursor: "pointer",
                    WebkitTapHighlightColor: "transparent",
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
                          width: 40,
                          height: 40,
                          fontSize: 22,
                          borderRadius: 8,
                          border: `1px solid ${form.emoji === e ? "#8b5cf6" : "transparent"}`,
                          background: "rgba(255,255,255,0.04)",
                          cursor: "pointer",
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
                  <label style={{ fontSize: 11, color: "#888", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                    {label}
                  </label>
                  <input
                    value={form[key as keyof TokenForm]}
                    onChange={(e) => set(key as keyof TokenForm, key === "symbol" ? e.target.value.toUpperCase() : e.target.value)}
                    placeholder={placeholder}
                    maxLength={maxLength}
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 10,
                      color: "#e8e9f0",
                      fontSize: 14,
                      outline: "none",
                    }}
                  />
                </div>
              ))}

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, color: "#888", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="What does your token do? What's the vision?"
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 10,
                    color: "#e8e9f0",
                    fontSize: 13,
                    outline: "none",
                    resize: "none",
                    fontFamily: "inherit",
                    lineHeight: 1.5,
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                <div>
                  <label style={{ fontSize: 11, color: "#888", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                    Total Supply
                  </label>
                  <input
                    type="number"
                    value={form.totalSupply}
                    onChange={(e) => set("totalSupply", e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 10,
                      color: "#e8e9f0",
                      fontSize: 13,
                      outline: "none",
                      fontFamily: "monospace",
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: "#888", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                    Lock % of Supply
                  </label>
                  <input
                    type="number"
                    value={form.lockPercent}
                    onChange={(e) => set("lockPercent", e.target.value)}
                    min={0}
                    max={100}
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 10,
                      color: "#e8e9f0",
                      fontSize: 13,
                      outline: "none",
                      fontFamily: "monospace",
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 11, color: "#888", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                  Lock Duration (days)
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  {[30, 60, 90, 180, 365].map((d) => (
                    <button
                      key={d}
                      onClick={() => set("lockDays", String(d))}
                      style={{
                        flex: 1,
                        padding: "8px 4px",
                        borderRadius: 8,
                        border: `1px solid ${form.lockDays === String(d) ? "#8b5cf6" : "rgba(255,255,255,0.1)"}`,
                        background: form.lockDays === String(d) ? "rgba(139,92,246,0.15)" : "rgba(255,255,255,0.04)",
                        color: form.lockDays === String(d) ? "#8b5cf6" : "#666",
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                        WebkitTapHighlightColor: "transparent",
                      }}
                    >
                      {d}d
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleCreate}
                disabled={!isValid || loading}
                className={isValid && !loading ? "btn-pulse" : ""}
                style={{
                  width: "100%",
                  padding: "16px",
                  borderRadius: 14,
                  border: "none",
                  cursor: isValid && !loading ? "pointer" : "not-allowed",
                  fontSize: 15,
                  fontWeight: 800,
                  background: isValid
                    ? "linear-gradient(135deg,#8b5cf6,#06d6f7)"
                    : "rgba(255,255,255,0.06)",
                  color: isValid ? "#fff" : "#555",
                  marginBottom: 16,
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                {loading ? "Deploying token..." : `🚀 Launch ${form.symbol || "Token"} on Curve`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
