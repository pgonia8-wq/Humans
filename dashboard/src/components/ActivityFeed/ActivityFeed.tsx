import { memo } from "react";
import { motion } from "framer-motion";
import { Clock } from "lucide-react";
import { SectionBlock } from "../primitives/SectionBlock";
import { EmptyStatePremium } from "../primitives/EmptyStatePremium";
import { getFlag, timeAgo } from "../../lib/utils";
import type { ActivityItem } from "../../lib/types";

interface ActivityFeedProps {
  activity: ActivityItem[];
}

export const ActivityFeed = memo(function ActivityFeed({ activity }: ActivityFeedProps) {
  return (
    <SectionBlock icon={Clock} title="Live Activity" iconColor="text-amber-400">
      <div className="flex items-center gap-1.5 mb-3 -mt-1">
        <motion.div
          className="w-1.5 h-1.5 rounded-full bg-emerald-400"
          animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
        <span className="text-[10px] text-emerald-400/60 uppercase tracking-widest font-medium">En vivo</span>
      </div>

      {!activity.length ? (
        <EmptyStatePremium />
      ) : (
        <div className="space-y-0" data-testid="activity-feed">
          {activity.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.04 }}
              className="flex items-center gap-3 py-2.5 border-b last:border-0"
              style={{ borderColor: "rgba(255,255,255,0.04)" }}
              data-testid={`activity-item-${item.id}`}
            >
              <motion.div
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.type === "click" ? "bg-emerald-400" : "bg-blue-400/40"}`}
                animate={item.type === "click" ? { scale: [1, 1.4, 1] } : {}}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
              />
              <p className="text-xs text-white/60 flex-1 leading-snug">
                {item.type === "click" ? (
                  <>
                    Usuario de {getFlag(item.country)}{item.country} hizo clic en tu anuncio{" "}
                    <span className="text-emerald-400 font-bold">(+{item.value.toFixed(4)} WLD)</span>
                  </>
                ) : (
                  <>Usuario de {getFlag(item.country)}{item.country} vio tu post</>
                )}
              </p>
              <span className="text-[9px] text-white/20 shrink-0 font-medium">{timeAgo(item.created_at)}</span>
            </motion.div>
          ))}
        </div>
      )}
    </SectionBlock>
  );
});
