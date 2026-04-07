interface Props {
  buyPressure: number;
}

export default function BuyPressureIndicator({ buyPressure }: Props) {
  const sellPressure = 100 - buyPressure;
  const isBullish = buyPressure > 50;

  return (
    <div className="rounded-xl bg-card/30 border border-border/20 p-3">
      <div className="flex justify-between items-center mb-2">
        <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Buy / Sell Pressure</span>
        <span className={`text-[10px] font-bold ${isBullish ? "text-green-400" : "text-red-400"}`}>
          {isBullish ? "🟢 BULLISH" : "🔴 BEARISH"}
        </span>
      </div>
      <div className="h-2 rounded-full bg-red-500/30 overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-green-400 to-cyan-400 transition-all duration-1000"
          style={{ width: `${buyPressure}%` }} />
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-[10px] font-bold text-green-400 font-mono">{buyPressure}% BUY</span>
        <span className="text-[10px] font-bold text-red-400 font-mono">{sellPressure}% SELL</span>
      </div>
    </div>
  );
}
