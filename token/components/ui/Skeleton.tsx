interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  style?: React.CSSProperties;
}

export function Skeleton({ width = "100%", height = 16, borderRadius = 6, style }: SkeletonProps) {
  return (
    <div
      className="skeleton"
      style={{ width, height, borderRadius, ...style }}
    />
  );
}

export function TokenCardSkeleton() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 16px",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 14,
        marginBottom: 8,
      }}
    >
      <Skeleton width={44} height={44} borderRadius="50%" />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <Skeleton width="40%" height={14} />
          <Skeleton width="20%" height={14} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <Skeleton width="25%" height={11} />
          <Skeleton width="15%" height={11} />
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <Skeleton width="22%" height={10} />
          <Skeleton width="20%" height={10} />
          <Skeleton width="22%" height={10} />
        </div>
      </div>
    </div>
  );
}

export function AirdropCardSkeleton() {
  return (
    <div
      style={{
        padding: "16px",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 16,
        marginBottom: 12,
      }}
    >
      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        <Skeleton width={46} height={46} borderRadius="50%" />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          <Skeleton width="55%" height={15} />
          <Skeleton width="30%" height={11} />
        </div>
      </div>
      <Skeleton width="100%" height={12} style={{ marginBottom: 6 }} />
      <Skeleton width="80%" height={12} style={{ marginBottom: 12 }} />
      <Skeleton width="100%" height={6} borderRadius={3} style={{ marginBottom: 12 }} />
      <Skeleton width="100%" height={44} borderRadius={12} />
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div style={{ padding: 16 }}>
      <div
        style={{
          padding: "20px",
          background: "rgba(255,255,255,0.03)",
          borderRadius: 16,
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <Skeleton width={48} height={48} borderRadius="50%" />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, justifyContent: "center" }}>
            <Skeleton width="45%" height={15} />
            <Skeleton width="30%" height={11} />
          </div>
        </div>
        <Skeleton width="40%" height={30} style={{ marginBottom: 8 }} />
        <Skeleton width="25%" height={13} />
      </div>
    </div>
  );
}
