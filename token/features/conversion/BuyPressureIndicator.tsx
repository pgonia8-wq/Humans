interface Props {
  buyPressure: number;
}

export default function BuyPressureIndicator({ buyPressure }: Props) {
  const sellPressure = 100 - buyPressure;
  const isBullish = buyPressure > 50;

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        borderRadius: 10,
        padding: "10px 14px",
        marginBottom: 10,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: "#888", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          Buy / Sell Pressure
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, color: isBullish ? "#10f090" : "#f05050" }}>
          {isBullish ? "🟢 BULLISH" : "🔴 BEARISH"}
        </span>
      </div>

      <div style={{ height: 8, borderRadius: 4, background: "rgba(240,80,80,0.3)", overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${buyPressure}%`,
            background: "linear-gradient(90deg,#10f090,#06d6f7)",
            borderRadius: 4,
            transition: "width 1s cubic-bezier(0.34,1.56,0.64,1)",
          }}
        />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#10f090", fontFamily: "monospace" }}>
          {buyPressure}% BUY
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#f05050", fontFamily: "monospace" }}>
          {sellPressure}% SELL
        </span>
      </div>
    </div>
  );
}
