import React, { useState, useEffect } from "react";

export default function ErrorsPanel({ apiCall }: { apiCall: any }) {
  const [errors, setErrors] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [timeRange, setTimeRange] = useState("24h");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const since = timeRange === "1h" ? new Date(Date.now() - 3600000).toISOString()
      : timeRange === "6h" ? new Date(Date.now() - 21600000).toISOString()
      : timeRange === "24h" ? new Date(Date.now() - 86400000).toISOString()
      : new Date(Date.now() - 604800000).toISOString();
    try {
      const data = await apiCall(`errors?page=${page}&since=${since}`);
      setErrors(data.errors || []);
      setTotal(data.total || 0);
      setSummary(data.summary || null);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [page, timeRange]);
  useEffect(() => {
    const iv = setInterval(load, 10000);
    return () => clearInterval(iv);
  }, [page, timeRange]);

  const ranges = [
    { id: "1h", label: "1 hora" },
    { id: "6h", label: "6 horas" },
    { id: "24h", label: "24 horas" },
    { id: "7d", label: "7 días" },
  ];

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, color: "#e0e0e0" }}>Errores del Sistema</h2>

      <div style={{ display: "flex", gap: 4, marginBottom: 16, flexWrap: "wrap" }}>
        {ranges.map(r => (
          <button key={r.id} onClick={() => { setTimeRange(r.id); setPage(0); }}
            style={{ padding: "6px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", background: timeRange === r.id ? "#1e1e2e" : "transparent", border: timeRange === r.id ? "1px solid #2a2a3e" : "1px solid transparent", color: timeRange === r.id ? "#e0e0e0" : "#666" }}>
            {r.label}
          </button>
        ))}
      </div>

      {summary && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 16 }}>
          <div style={{ background: "#12121a", border: "1px solid #1e1e2e", borderRadius: 12, padding: 16, textAlign: "center" }}>
            <div style={{ fontSize: 10, color: "#666" }}>Total Errores</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: summary.totalErrors > 0 ? "#f05050" : "#10f090" }}>{summary.totalErrors}</div>
          </div>
          <div style={{ background: "#12121a", border: "1px solid #1e1e2e", borderRadius: 12, padding: 16, textAlign: "center" }}>
            <div style={{ fontSize: 10, color: "#666" }}>Críticos</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: summary.criticalCount > 0 ? "#ff3030" : "#10f090" }}>{summary.criticalCount}</div>
          </div>
          {Object.entries(summary.byEndpoint || {}).slice(0, 4).map(([ep, count]: [string, any]) => (
            <div key={ep} style={{ background: "#12121a", border: "1px solid #1e1e2e", borderRadius: 12, padding: 16, textAlign: "center" }}>
              <div style={{ fontSize: 9, color: "#666", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ep}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#f7a606" }}>{count}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ background: "#12121a", border: "1px solid #1e1e2e", borderRadius: 14, overflow: "hidden" }}>
        {loading && <div style={{ padding: 30, textAlign: "center", color: "#666" }}>Cargando...</div>}
        {!loading && errors.length === 0 && (
          <div style={{ padding: 40, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#10f090" }}>Sin errores</div>
            <div style={{ fontSize: 11, color: "#666" }}>En las últimas {timeRange === "1h" ? "hora" : timeRange === "6h" ? "6 horas" : timeRange === "24h" ? "24 horas" : "7 días"}</div>
          </div>
        )}
        {errors.map((e, i) => (
          <div key={i} style={{ padding: "12px 16px", borderBottom: "1px solid #1a1a2a", background: e.severity === "critical" ? "#f0505008" : "transparent" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4, flexWrap: "wrap", gap: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12 }}>{e.severity === "critical" ? "🔴" : "🟠"}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: e.severity === "critical" ? "#ff3030" : "#f7a606" }}>{e.event}</span>
              </div>
              <span style={{ fontSize: 9, color: "#555" }}>{new Date(e.created_at).toLocaleString()}</span>
            </div>
            <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>
              {e.endpoint && <span style={{ marginRight: 12 }}>Endpoint: <span style={{ color: "#ccc" }}>{e.endpoint}</span></span>}
              {e.latency_ms && <span style={{ marginRight: 12 }}>Latencia: <span style={{ color: e.latency_ms > 500 ? "#f7a606" : "#ccc" }}>{e.latency_ms}ms</span></span>}
              {e.user_id && <span>User: <span style={{ color: "#6366f1" }}>{e.user_id.slice(0, 12)}...</span></span>}
            </div>
            {e.details && (
              <div style={{ fontSize: 10, color: "#666", fontFamily: "monospace", background: "#0a0a0f", borderRadius: 6, padding: "6px 10px", marginTop: 4, overflow: "auto", maxHeight: 80 }}>
                {typeof e.details === "object" ? JSON.stringify(e.details, null, 1) : String(e.details)}
              </div>
            )}
          </div>
        ))}
      </div>

      {total > 50 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 12 }}>
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)} style={{ padding: "6px 14px", background: "#1e1e2e", border: "1px solid #2a2a3e", borderRadius: 6, color: "#888", cursor: page === 0 ? "default" : "pointer", opacity: page === 0 ? 0.3 : 1, fontSize: 11 }}>← Anterior</button>
          <span style={{ padding: "6px 14px", color: "#666", fontSize: 11 }}>Página {page + 1}</span>
          <button disabled={(page + 1) * 50 >= total} onClick={() => setPage(p => p + 1)} style={{ padding: "6px 14px", background: "#1e1e2e", border: "1px solid #2a2a3e", borderRadius: 6, color: "#888", cursor: "pointer", fontSize: 11 }}>Siguiente →</button>
        </div>
      )}
    </div>
  );
}
