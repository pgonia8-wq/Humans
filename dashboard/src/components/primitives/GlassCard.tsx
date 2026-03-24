import { memo } from "react";
import { GLASS } from "../../lib/tokens";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const GlassCard = memo(function GlassCard({ children, className = "", style = {} }: GlassCardProps) {
  return (
    <div
      className={`relative rounded-2xl overflow-hidden ${className}`}
      style={{ ...GLASS, ...style }}
    >
      {children}
    </div>
  );
});
