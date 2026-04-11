import React, { useState, useEffect } from "react";

export default function UsersPanel({ apiCall, onSelectUser }: { apiCall: any; onSelectUser: (id: string) => void }) {
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), filter });
      if (search) params.set("search", search);
      const data = await apiCall(`users?${params}`);
      setUsers(data.users || []);
      setTotal(data.total || 0);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [page, filter]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(0); load(); };

  const filters = [
    { id: "all", label: "Todos" },
    { id: "banned", label: "Baneados" },
    { id: "verified", label: "Verificados" },
    { id: "reported", label: "Reportados" },
  ];

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20, color: "#e0e0e0" }}>Usuarios</h2>

      <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <form onSubmit={handleSearch} style={{ display: "flex", gap: 8, flex: 1, minWidth: 200 }}>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o ID..."
            style={{ flex: 1, padding: "10px 14px", background: "#12121a", border: "1px solid #1e1e2e", borderRadius: 10, color: "#e0e0e0", fontSize: 13, outline: "none" }}
          />
          <button type="submit" style={{ padding: "10px 20px", background: "#6366f1", color: "#fff", border: "none", borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            Buscar
          </button>
        </form>
        <div style={{ display: "flex", gap: 4 }}>
          {filters.map(f => (
            <button key={f.id} onClick={() => { setFilter(f.id); setPage(0); }}
              style={{
                padding: "8px 14px", borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: "pointer",
                background: filter === f.id ? "#1e1e2e" : "transparent",
                border: filter === f.id ? "1px solid #2a2a3e" : "1px solid transparent",
                color: filter === f.id ? "#e0e0e0" : "#666",
              }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ color: "#555", fontSize: 11, marginBottom: 12 }}>{total} usuario{total !== 1 ? "s" : ""} encontrado{total !== 1 ? "s" : ""}</div>

      <div style={{ background: "#12121a", border: "1px solid #1e1e2e", borderRadius: 14, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #1e1e2e" }}>
              {["Usuario", "Tier", "Verificado", "Reputación", "Estado", "Registrado", ""].map((h, i) => (
                <th key={i} style={{ padding: "12px 16px", textAlign: "left", fontSize: 10, fontWeight: 600, color: "#666", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} style={{ borderBottom: "1px solid #1a1a2a", cursor: "pointer" }} onClick={() => onSelectUser(u.id)}>
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#1e1e2e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, overflow: "hidden" }}>
                      {u.avatar_url ? <img src={u.avatar_url} style={{ width: 32, height: 32, objectFit: "cover" }} /> : "👤"}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: "#e0e0e0" }}>{u.username || "sin nombre"}</div>
                      <div style={{ fontSize: 10, color: "#555" }}>{u.id?.slice(0, 16)}...</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <span style={{ padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600, background: u.tier === "official" ? "#6366f120" : u.tier?.includes("premium") ? "#f7a60620" : "#1e1e2e", color: u.tier === "official" ? "#6366f1" : u.tier?.includes("premium") ? "#f7a606" : "#888" }}>
                    {u.tier || "free"}
                  </span>
                </td>
                <td style={{ padding: "12px 16px", color: u.verified ? "#10f090" : "#666" }}>{u.verified ? "✓ Sí" : "No"}</td>
                <td style={{ padding: "12px 16px", color: "#888" }}>{u.reputation_score || 0}</td>
                <td style={{ padding: "12px 16px" }}>
                  {u.banned ? (
                    <span style={{ padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600, background: "#f0505020", color: "#f05050" }}>BANEADO</span>
                  ) : (
                    <span style={{ padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600, background: "#10f09020", color: "#10f090" }}>Activo</span>
                  )}
                </td>
                <td style={{ padding: "12px 16px", color: "#666", fontSize: 11 }}>{u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}</td>
                <td style={{ padding: "12px 16px" }}>
                  <button style={{ padding: "6px 12px", background: "#1e1e2e", border: "1px solid #2a2a3e", borderRadius: 8, color: "#888", fontSize: 11, cursor: "pointer" }}>
                    Ver detalle →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <div style={{ padding: 20, textAlign: "center", color: "#666" }}>Cargando...</div>}
      </div>

      {total > 30 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 16 }}>
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)} style={{ padding: "8px 16px", background: "#1e1e2e", border: "1px solid #2a2a3e", borderRadius: 8, color: "#888", cursor: page === 0 ? "default" : "pointer", opacity: page === 0 ? 0.3 : 1 }}>← Anterior</button>
          <span style={{ padding: "8px 16px", color: "#666", fontSize: 12 }}>Página {page + 1} de {Math.ceil(total / 30)}</span>
          <button disabled={(page + 1) * 30 >= total} onClick={() => setPage(p => p + 1)} style={{ padding: "8px 16px", background: "#1e1e2e", border: "1px solid #2a2a3e", borderRadius: 8, color: "#888", cursor: (page + 1) * 30 >= total ? "default" : "pointer", opacity: (page + 1) * 30 >= total ? 0.3 : 1 }}>Siguiente →</button>
        </div>
      )}
    </div>
  );
}
