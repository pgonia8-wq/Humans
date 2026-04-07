import { memo } from "react";
import { SkeletonPulse } from "./SkeletonPulse";

export const LoadingSkeleton = memo(function LoadingSkeleton() {
  return (
    <div className="px-4 space-y-4 pb-8">
      <SkeletonPulse className="h-36 rounded-3xl" />
      <div className="grid grid-cols-2 gap-3">
        <SkeletonPulse className="h-24" />
        <SkeletonPulse className="h-24" />
        <SkeletonPulse className="h-24" />
        <SkeletonPulse className="h-24" />
      </div>
      <SkeletonPulse className="h-52" />
      <SkeletonPulse className="h-64" />
      <SkeletonPulse className="h-56" />
    </div>
  );
});
