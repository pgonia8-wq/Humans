import { memo } from "react";
import { motion } from "framer-motion";

export const SkeletonPulse = memo(function SkeletonPulse({ className = "" }: { className?: string }) {
  return (
    <motion.div
      className={`rounded-xl bg-white/6 ${className}`}
      animate={{ opacity: [0.4, 0.8, 0.4] }}
      transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
    />
  );
});
