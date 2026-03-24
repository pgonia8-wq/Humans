import { memo } from "react";
import { GlassCard } from "./GlassCard";

interface SectionBlockProps {
  icon: React.ElementType;
  title: string;
  iconColor: string;
  children: React.ReactNode;
  className?: string;
}

export const SectionBlock = memo(function SectionBlock({
  icon: Icon,
  title,
  iconColor,
  children,
  className = "",
}: SectionBlockProps) {
  return (
    <GlassCard className={`p-5 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <Icon size={15} className={iconColor} />
        <h2 className="text-xs font-semibold text-white/60 uppercase tracking-widest">{title}</h2>
      </div>
      {children}
    </GlassCard>
  );
});
