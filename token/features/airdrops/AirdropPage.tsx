import { useState } from "react";
import { MOCK_AIRDROPS, type Airdrop } from "@/services/mockData";
import { useApp } from "@/context/AppContext";

function AirdropCard({ airdrop, onClaim }: { airdrop: Airdrop; onClaim: (id: string) => void }) {
  const progress = airdrop.claimedAmount / airdrop.totalAmount;
  const spotsLeft = airdrop.maxParticipants - airdrop.participants;
  const alreadyClaimed = !!airdrop.userClaimedAt;

  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(airdrop.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  );

  return (
    <div
      style={{
        padding: "16px",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16,
        marginBottom: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: "50%",
            background: "linear-gradient(135deg,rgba(139,92,246,0.2),rgba(6,214,247,0.1))",
            border: "1px solid rgba(139,92,246,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
            flexShrink: 0,
          }}
        >
          {airdrop.tokenEmoji}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#e8e9f0", marginBottom: 2 }}>
                {airdrop.title}
              </h3>
              <span style={{ fontSize: 11, color: "#666" }}>{airdrop.tokenName}</span>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 15, fontFamily: "monospace", fontWeight: 800, color: "#8b5cf6" }}>
                +{airdrop.dailyAmount} {airdrop.tokenSymbol}
              </div>
              <div style={{ fontSize: 10, color: "#555" }}>
                every {airdrop.cooldownHours}h
              </div>
            </div>
          </div>
        </div>
      </div>

      <p style={{ fontSize: 12, color: "#999", lineHeight: 1.5, marginBottom: 12 }}>
        {airdrop.description}
      </p>

      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
          <span style={{ fontSize: 11, color: "#888" }}>Progress</span>
          <span style={{ fontSize: 11, fontFamily: "monospace", color: "#888" }}>
            {(progress * 100).toFixed(1)}% claimed
          </span>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${progress * 100}%`,
              background: "linear-gradient(90deg,#8b5cf6,#06d6f7)",
              borderRadius: 3,
              transition: "width 0.8s ease",
            }}
          />
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 700, color: "#10f090" }}>
            {spotsLeft.toLocaleString()}
          </div>
          <div style={{ fontSize: 10, color: "#666" }}>spots left</div>
        </div>
        <div>
          <div style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 700, color: "#06d6f7" }}>
            {airdrop.participants.toLocaleString()}
          </div>
          <div style={{ fontSize: 10, color: "#666" }}>participants</div>
        </div>
        <div>
          <div style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 700, color: "#f7a606" }}>
            {daysLeft}d
          </div>
          <div style={{ fontSize: 10, color: "#666" }}>remaining</div>
        </div>
      </div>

      <button
        onClick={() => onClaim(airdrop.id)}
        disabled={alreadyClaimed}
        className={!alreadyClaimed ? "btn-pulse" : ""}
        style={{
          width: "100%",
          padding: "13px",
          borderRadius: 12,
          border: "none",
          cursor: alreadyClaimed ? "not-allowed" : "pointer",
          fontWeight: 700,
          fontSize: 14,
          background: alreadyClaimed
            ? "rgba(255,255,255,0.06)"
            : "linear-gradient(135deg,#8b5cf6,#06d6f7)",
          color: alreadyClaimed ? "#555" : "#fff",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        {alreadyClaimed ? `✓ Claimed — next in ${airdrop.cooldownHours}h` : `🎁 Claim ${airdrop.dailyAmount} ${airdrop.tokenSymbol}`}
      </button>
    </div>
  );
}

export default function AirdropPage() {
  const { emitToBridge, user } = useApp();
  const [airdrops, setAirdrops] = useState(MOCK_AIRDROPS);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const handleClaim = async (id: string) => {
    setClaimingId(id);
    await new Promise((r) => setTimeout(r, 900));

    setAirdrops((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              userClaimedAt: new Date().toISOString(),
              claimedAmount: a.claimedAmount + a.dailyAmount,
              participants: a.participants + 1,
              userTotalClaimed: (a.userTotalClaimed ?? 0) + a.dailyAmount,
            }
          : a
      )
    );

    const airdrop = airdrops.find((a) => a.id === id);
    if (airdrop) {
      emitToBridge("onUserJoinedToken", {
        tokenId: airdrop.tokenId,
        tokenSymbol: airdrop.tokenSymbol,
        userId: user?.id,
        claimedAmount: airdrop.dailyAmount,
      });
    }
    setClaimingId(null);
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "16px 16px 14px" }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#e8e9f0", letterSpacing: "-0.02em" }}>
          🎁 Airdrops
        </h1>
        <p style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
          Claim free tokens daily — verified humans only
        </p>
      </div>

      <div className="scrollable" style={{ flex: 1, padding: "0 16px", paddingBottom: 84 }}>
        {airdrops.map((a) => (
          <AirdropCard
            key={a.id}
            airdrop={a}
            onClaim={handleClaim}
          />
        ))}
      </div>
    </div>
  );
}
