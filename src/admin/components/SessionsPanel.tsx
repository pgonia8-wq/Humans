import React, { useState, useEffect } from "react";

export default function SessionsPanel({ apiCall, onViewUser }: { apiCall: any; onViewUser: (id: string) => void }) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [searchUser, setSearchUser] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const params = `page=${page}${searchUser ? `&userId=${encodeURIComponent(searchUser)}` : ""}`;
      const data = await apiCall(`sessions?${params}`);
      setSessions(data.sessions || []);
      setTotal(data.total || 0);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [page]);
  useEffect(() => {
    const iv = setInterval(load, 10000);
    return () => clearInterval(iv);
  }, [page, searchUser]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(0); load(); };

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, color: "#e0e0e0" }}>Historial de Sesiones</h2>

      <form onSubmit={handleSearch} style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <input value={searchUser} onChange={e => setSearchUser(e.target.value)} placeholder="Filtrar por user ID..."
          style={{ flex: 1, minWidth: 200, padding: "8px 12px", background: "#12121a", border: "1px solid #1e1e2e", borderRadius: 8, color: "#e0e0e0", fontSize: 12, outline: "none" }} />
        <button type="submit" style={{ padding: "8px 16px", background: "#6366f1", color: "#fff", border: "none", borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Buscar</button>
      </form>

      <div style={{ background: "#12121a", border: "1px solid #1e1e2e", borderRadius: 14, overflow: "hidden" }}>
        {loading && <div style={{ padding: 30, textAlign: "center", color: "#666" }}>Cargando...</div>}
        {!loading && sessions.length === 0 && <div style={{ padding: 40, textAlign: "center", color: "#666" }}>Sin sesiones registradas</div>}
        {sessions.map((s, i) => (
          <div key={i} style={{ padding: "10px 16px", borderBottom: "1px solid #1a1a2a", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 14 }}>🔑</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: "#ccc" }}>{s.event}</div>
              <div style={{ fontSize: 10, color: "#666" }}>
                {s.username && <span style={{ marginRight: 8 }}>{s.username}</span>}
                {s.user_id && <span style={{ color: "#6366f1", cursor: "pointer" }} onClick={() => onViewUser(s.user_id)}>{s.user_id.slice(0, 16)}...</span>}
              </div>
            </div>
            {s.ip && <span style={{ fontSize: 9, color: "#555", fontFamily: "monospace" }}>{s.ip}</span>}
            <span style={{ fontSize: 9, color: "#555" }}>{new Date(s.created_at).toLocaleString()}</span>
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
