import { memo } from "react";
import { motion } from "framer-motion";
import { Activity, ChevronRight } from "lucide-react";
import { SectionBlock } from "../primitives/SectionBlock";
import { EmptyStatePremium } from "../primitives/EmptyStatePremium";
import type { PostStats } from "../../lib/types";

interface TopPostsProps {
  posts: PostStats[];
}

const RANK_STYLES = [
  "linear-gradient(135deg,#34d399,#059669)",
  "linear-gradient(135deg,#a78bfa,#7c3aed)",
  "linear-gradient(135deg,#60a5fa,#2563eb)",
];

export const TopPosts = memo(function TopPosts({ posts }: TopPostsProps) {
  return (
    <SectionBlock icon={Activity} title="Top Posts" iconColor="text-emerald-400">
      {!posts.length ? (
        <EmptyStatePremium />
      ) : (
        <div className="space-y-2.5" data-testid="top-posts">
          {posts.map((post, i) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay: i * 0.06 }}
              className="flex items-start gap-3 p-3.5 rounded-xl transition-all duration-200"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
              data-testid={`post-item-${post.id}`}
            >
              <div
                className="flex items-center justify-center w-7 h-7 rounded-lg text-xs font-black shrink-0 mt-0.5"
                style={{
                  background: i < 3 ? RANK_STYLES[i] : "rgba(255,255,255,0.07)",
                  color: i < 3 ? "#fff" : "rgba(255,255,255,0.35)",
                }}
              >
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white/75 leading-snug line-clamp-2">{post.content}</p>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  <span className="text-xs text-emerald-400 font-bold">{post.earnings.toFixed(4)} WLD</span>
                  <span className="text-[10px] text-white/25">{post.clicks} clicks</span>
                  <span className="text-[10px] text-white/25">{post.impressions} views</span>
                </div>
              </div>
              <ChevronRight size={14} className="text-white/15 shrink-0 mt-1" />
            </motion.div>
          ))}
        </div>
      )}
    </SectionBlock>
  );
});
