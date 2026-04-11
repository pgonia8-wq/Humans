import React, { useState, useEffect } from "react";

export default function ReportsPanel({ apiCall, onViewUser }: { apiCall: any; onViewUser: (id: string) => void }) {
  const [reports, setReports] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiCall(`reports?status=${statusFilter}&page=${page}`);
      setReports(data.reports || []);
      setTotal(data.total || 0);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [page, statusFilter]);

  const handleAction = async (reportId: string, action: string, banUser = false) => {
    setActionLoading(reportId);
    try {
      await apiCall("reports", { method: "POST", body: JSON.stringify({ reportId, action, banUser }) });
      load();
    } catch {}
    setActionLoading(null);
  };

  const statuses = [
    { id: "pending", label: "Pendientes" },
    { id: "resolved", label: "Resueltos" },
    { id: "dismissed", label: "Descartados" },
    { id: "all", label: "Todos" },
  ];

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20, color: "#e0e0e0" }}>Reportes</h2>

      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        {statuses.map(s => (
          <button key={s.id} onClick={() => { setStatusFilter(s.id); setPage(0); }}
            style={{ padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", background: statusFilter === s.id ? "#1e1e2e" : "transparent", border: statusFilter === s.id ? "1px solid #2a2a3e" : "1px solid transparent", color: statusFilter === s.id ? "#e0e0e0" : "#666" }}>
            {s.label}
          </button>
        ))}
      </div>

      <div style={{ background: "#12121a", border: "1px solid #1e1e2e", borderRadius: 14, overflow: "hidden" }}>
        {reports.map(r => (
          <div key={r.id} style={{ padding: "16px 20px", borderBottom: "1px solid #1a1a2a" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 13, color: "#ccc", marginBottom: 4 }}>
                  <strong>Razón:</strong> {r.reason || "Sin especificar"}
                </div>
                <div style={{ fontSize: 11, color: "#666", display: "flex", gap: 16 }}>
                  {r.user_id && (
                    <span style={{ cursor: "pointer", color: "#6366f1" }} onClick={() => onViewUser(r.user_id)}>
                      Reportado: {r.user_id.slice(0, 16)}...
                    </span>
                  )}
                  {r.reporter_id && <span>Reportó: {r.reporter_id.slice(0, 16)}...</span>}
                  {r.post_id && <span>Post: {r.post_id.slice(0, 8)}...</span>}
                  <span>{new Date(r.created_at).toLocaleString()}</span>
                </div>
              </div>
              <span style={{ padding: "3px 10px", borderRadius: 6, fontSize: 10, fontWeight: 600, background: r.status === "pending" ? "#f7a60620" : r.status === "resolved" ? "#10f09020" : "#1e1e2e", color: r.status === "pending" ? "#f7a606" : r.status === "resolved" ? "#10f090" : "#666" }}>
                {r.status}
              </span>
            </div>

            {r.status === "pending" && (
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button onClick={() => handleAction(r.id, "dismiss")} disabled={actionLoading === r.id}
                  style={{ padding: "6px 14px", background: "#1e1e2e", border: "1px solid #2a2a3e", borderRadius: 8, color: "#888", fontSize: 11, cursor: "pointer" }}>
                  Descartar
                </button>
                {r.post_id && (
                  <button onClick={() => handleAction(r.id, "remove_post")} disabled={actionLoading === r.id}
                    style={{ padding: "6px 14px", background: "#f7a60620", border: "1px solid #f7a60640", borderRadius: 8, color: "#f7a606", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                    Eliminar post
                  </button>
                )}
                {r.user_id && (
                  <button onClick={() => handleAction(r.id, "resolve", true)} disabled={actionLoading === r.id}
                    style={{ padding: "6px 14px", background: "#f0505020", border: "1px solid #f0505040", borderRadius: 8, color: "#f05050", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                    Banear usuario
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
        {reports.length === 0 && !loading && (
          <div style={{ padding: 40, textAlign: "center", color: "#666", fontSize: 13 }}>
            {statusFilter === "pending" ? "Sin reportes pendientes 🎉" : "No hay reportes con este filtro"}
          </div>
        )}
        {loading && <div style={{ padding: 20, textAlign: "center", color: "#666" }}>Cargando...</div>}
      </div>

      {total > 30 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 16 }}>
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)} style={{ padding: "8px 16px", background: "#1e1e2e", border: "1px solid #2a2a3e", borderRadius: 8, color: "#888", cursor: page === 0 ? "default" : "pointer", opacity: page === 0 ? 0.3 : 1 }}>← Anterior</button>
          <span style={{ padding: "8px 16px", color: "#666", fontSize: 12 }}>Página {page + 1}</span>
          <button disabled={(page + 1) * 30 >= total} onClick={() => setPage(p => p + 1)} style={{ padding: "8px 16px", background: "#1e1e2e", border: "1px solid #2a2a3e", borderRadius: 8, color: "#888", cursor: (page + 1) * 30 >= total ? "default" : "pointer", opacity: (page + 1) * 30 >= total ? 0.3 : 1 }}>Siguiente →</button>
        </div>
      )}
    </div>
  );
}
