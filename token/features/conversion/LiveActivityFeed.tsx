import { useEffect, useState, useRef } from "react";
import { api } from "@/services/api";
import { timeAgo, type ActivityItem } from "@/services/types";
import { ArrowUpRight, ArrowDownRight, Gift } from "lucide-react";

interface Props {
  tokenId: string;
  symbol: string;
  limit?: number;
}

export default function LiveActivityFeed({ tokenId, symbol, limit = 5 }: Props) {
  const [entries, setEntries] = useState<ActivityItem[]>([]);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const prevIdsRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchActivity = () => {
    api.getTokenActivity(tokenId, limit)
      .then((r) => {
        const items = r.activities ?? [];
        const fresh = new Set<string>();
        items.forEach((a) => {
          if (!prevIdsRef.current.has(a.id)) fresh.add(a.id);
        });
        prevIdsRef.current = new Set(items.map((a) => a.id));
        setEntries(items);
        if (fresh.size > 0) {
          setNewIds(fresh);
          setTimeout(() => setNewIds(new Set()), 600);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchActivity();
    timerRef.current = setInterval(fetchActivity, 5000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [tokenId, limit]);

  if (entries.length === 0) return null;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Live Activity</span>
        <span className="text-[10px] text-green-400 font-semibold flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          LIVE
        </span>
      </div>
      <div className="rounded-xl bg-card/30 border border-border/20 overflow-hidden divide-y divide-border/10">
        {entries.map((e) => {
          const isNew = newIds.has(e.id);
          const isBuy = e.type === "buy";
          const isSell = e.type === "sell";
          return (
            <div key={e.id}
              className={`flex items-center justify-between px-3 py-2 transition-colors duration-300 ${
                isNew ? (isSell ? "bg-red-500/10" : "bg-green-500/10") : ""
              }`}>
              <div className="flex items-center gap-2">
                <div className={`w-5 h-5 rounded flex items-center justify-center ${
                  isBuy ? "bg-green-500/15 text-green-400" :
                  isSell ? "bg-red-500/15 text-red-400" :
                  "bg-violet-500/15 text-violet-400"
                }`}>
                  {isBuy ? <ArrowUpRight className="w-3 h-3" /> :
                   isSell ? <ArrowDownRight className="w-3 h-3" /> :
                   <Gift className="w-3 h-3" />}
                </div>
                <span className={`text-[10px] font-bold uppercase ${
                  isBuy ? "text-green-400" : isSell ? "text-red-400" : "text-violet-400"
                }`}>{e.type}</span>
                <span className="text-[11px] text-muted-foreground truncate max-w-[80px]">{e.username}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-mono font-bold ${
                  isBuy ? "text-green-400" : isSell ? "text-red-400" : "text-violet-400"
                }`}>{e.amount.toLocaleString()} {symbol}</span>
                <span className="text-[10px] text-muted-foreground/50">{timeAgo(e.timestamp)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
