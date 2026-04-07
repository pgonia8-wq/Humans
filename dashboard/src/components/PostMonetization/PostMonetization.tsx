import { memo } from "react";
import { motion } from "framer-motion";
import { Coins, FileText } from "lucide-react";
import { SectionBlock } from "../primitives/SectionBlock";
import { EmptyStatePremium } from "../primitives/EmptyStatePremium";
import { usePostMonetization } from "../../hooks/usePostMonetization";

interface PostMonetizationProps {
  userId: string | null | undefined;
}

const MONETIZED_STYLE = {
  background: "rgba(52,211,153,0.1)",
  border: "1px solid rgba(52,211,153,0.2)",
};
const NOT_MONETIZED_STYLE = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.06)",
};

export const PostMonetization = memo(function PostMonetization({ userId }: PostMonetizationProps) {
  const { posts, loading, toggleMonetized } = usePostMonetization(userId);

  return (
    <SectionBlock icon={Coins} title="Monetización de Posts" iconColor="text-amber-400">
      <p className="text-xs text-white/30 mb-4 -mt-1">
        Activa la monetización post a post para maximizar tus ingresos.
      </p>

      {loading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-14 rounded-xl animate-pulse"
              style={{ background: "rgba(255,255,255,0.04)" }}
            />
          ))}
        </div>
      )}

      {!loading && posts.length === 0 && (
        <EmptyStatePremium
          icon={FileText}
          iconColor="text-amber-400"
          title="Aún no tienes posts"
          description="Cuando publiques contenido aparecerá aquí y podrás activar la monetización individualmente."
          compact
        />
      )}

      {!loading && posts.length > 0 && (
        <div className="space-y-2">
          {posts.map((post, idx) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
              style={post.monetized ? MONETIZED_STYLE : NOT_MONETIZED_STYLE}
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white/80 truncate">
                  {post.content?.slice(0, 80) || "Post sin contenido"}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: post.monetized ? "#34d399" : "rgba(255,255,255,0.25)" }}>
                  {post.monetized ? "Monetizado" : "Sin monetizar"}
                </p>
              </div>
              <button
                onClick={() => toggleMonetized(post.id)}
                className="relative shrink-0 w-10 h-5 rounded-full transition-all duration-300 active:scale-95"
                style={{
                  background: post.monetized
                    ? "linear-gradient(135deg, #059669, #34d399)"
                    : "rgba(255,255,255,0.08)",
                  boxShadow: post.monetized ? "0 0 10px rgba(52,211,153,0.3)" : "none",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <motion.div
                  className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm"
                  animate={{ left: post.monetized ? "calc(100% - 1.125rem)" : "2px" }}
                  transition={{ type: "spring", damping: 20, stiffness: 300 }}
                />
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </SectionBlock>
  );
});
