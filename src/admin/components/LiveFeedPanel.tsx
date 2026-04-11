import React, { useState, useEffect, useRef } from "react";

const SEV_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  info: { bg: "#06d6f708", border: "#06d6f720", text: "#06d6f7" },
  warning: { bg: "#f7a60608", border: "#f7a60620", text: "#f7a606" },
  error: { bg: "#f0505008", border: "#f0505020", text: "#f05050" },
  critical: { bg: "#f0505015", border: "#f0505040", text: "#ff3030" },
};

function timeAgo(ts: string) {
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export default function LiveFeedPanel({ apiCall, onViewUser }: { apiCall: any; onViewUser: (id: string) => void }) {
  const [feed, setFeed] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      const data = await apiCall("activity?limit=80");
      setFeed(data.feed || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!autoRefresh) return;
    const iv = setInterval(load, 3000);
    return () => clearInterval(iv);
  }, [autoRefresh]);

  const filters = [
    { id: "all", label: "Todo", icon: "📡" },
    { id: "trade", label: "Trades", icon: "💱" },
    { id: "post", label: "Posts", icon: "📝" },
    { id: "admin", label: "Admin", icon: "🛡️" },
    { id: "report", label: "Reportes", icon: "🚨" },
    { id: "session", label: "Sesiones", icon: "🔑" },
  ];

  const filtered = filter === "all" ? feed : feed.filter(f => f.type === filter);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#e0e0e0", margin: 0 }}>Actividad en Vivo</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: autoRefresh ? "#10f090" : "#666", boxShadow: autoRefresh ? "0 0 8px #10f09060" : "none" }} />
          <button onClick={() => setAutoRefresh(!autoRefresh)}
            style={{ padding: "4px 10px", background: autoRefresh ? "#10f09015" : "#1e1e2e", border: `1px solid ${autoRefresh ? "#10f09030" : "#2a2a3e"}`, borderRadius: 6, color: autoRefresh ? "#10f090" : "#666", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>
            {autoRefresh ? "Auto-refresh ON" : "Pausado"}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 12, flexWrap: "wrap" }}>
        {filters.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            style={{ padding: "6px 10px", borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer", background: filter === f.id ? "#1e1e2e" : "transparent", border: filter === f.id ? "1px solid #2a2a3e" : "1px solid transparent", color: filter === f.id ? "#e0e0e0" : "#666" }}>
            {f.icon} {f.label}
          </button>
        ))}
      </div>

      <div ref={scrollRef} style={{ background: "#0d0d14", border: "1px solid #1a1a2a", borderRadius: 14, maxHeight: "calc(100vh - 200px)", overflow: "auto" }}>
        {loading && <div style={{ padding: 40, textAlign: "center", color: "#666" }}>Cargando feed...</div>}
        {!loading && filtered.length === 0 && <div style={{ padding: 40, textAlign: "center", color: "#666" }}>Sin actividad reciente</div>}
        {filtered.map((item, i) => {
          const c = SEV_COLORS[item.severity] || SEV_COLORS.info;
          return (
            <div key={i} style={{ padding: "10px 16px", borderBottom: "1px solid #14141f", display: "flex", alignItems: "center", gap: 10, background: c.bg }}>
              <span style={{ fontSize: 14, flexShrink: 0 }}>{item.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: c.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.msg}</div>
              </div>
              {item.userId && (
                <button onClick={() => onViewUser(item.userId)} style={{ padding: "2px 6px", background: "#1e1e2e", border: "1px solid #2a2a3e", borderRadius: 4, color: "#6366f1", fontSize: 9, cursor: "pointer", flexShrink: 0 }}>
                  ver
                </button>
              )}
              <span style={{ fontSize: 9, color: "#555", flexShrink: 0, minWidth: 24, textAlign: "right" }}>{timeAgo(item.ts)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
