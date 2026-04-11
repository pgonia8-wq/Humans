import React, { useState, useEffect } from "react";

export default function UserDetailPanel({ apiCall, userId, onBack }: { apiCall: any; userId: string; onBack: () => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"info" | "posts" | "trades" | "chats" | "reports">("info");
  const [banLoading, setBanLoading] = useState(false);
  const [banReason, setBanReason] = useState("");
  const [showBanInput, setShowBanInput] = useState(false);

  useEffect(() => {
    setLoading(true);
    apiCall(`user-detail?userId=${encodeURIComponent(userId)}`).then((d: any) => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, [userId]);

  const handleBan = async () => {
    setBanLoading(true);
    try {
      await apiCall("ban", { method: "POST", body: JSON.stringify({ userId, action: "ban", reason: banReason || "Violación de normas" }) });
      setData((d: any) => ({ ...d, profile: { ...d.profile, banned: true, ban_reason: banReason } }));
      setShowBanInput(false);
    } catch {}
    setBanLoading(false);
  };

  const handleUnban = async () => {
    setBanLoading(true);
    try {
      await apiCall("ban", { method: "POST", body: JSON.stringify({ userId, action: "unban" }) });
      setData((d: any) => ({ ...d, profile: { ...d.profile, banned: false, ban_reason: null } }));
    } catch {}
    setBanLoading(false);
  };

  if (loading) return <div style={{ color: "#666", textAlign: "center", paddingTop: 80 }}>Cargando perfil...</div>;
  if (!data?.profile) return <div style={{ color: "#666", textAlign: "center", paddingTop: 80 }}>Usuario no encontrado</div>;

  const p = data.profile;
  const tabs = [
    { id: "info", label: "Info General" },
    { id: "posts", label: `Posts (${data.posts?.length || 0})` },
    { id: "trades", label: `Trades (${data.trades?.length || 0})` },
    { id: "chats", label: `Chats (${(data.messages?.dms?.length || 0) + (data.messages?.globalChats?.length || 0)})` },
    { id: "reports", label: `Reportes (${data.reports?.length || 0})` },
  ];

  return (
    <div>
      <button onClick={onBack} style={{ background: "none", border: "none", color: "#6366f1", fontSize: 13, cursor: "pointer", marginBottom: 16, padding: 0 }}>
        ← Volver a usuarios
      </button>

      <div style={{ background: "#12121a", border: "1px solid #1e1e2e", borderRadius: 14, padding: 24, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#1e1e2e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, overflow: "hidden" }}>
            {p.avatar_url ? <img src={p.avatar_url} style={{ width: 56, height: 56, objectFit: "cover" }} /> : "👤"}
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#e0e0e0", margin: 0 }}>{p.username || "sin nombre"}</h2>
            <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>ID: {p.id}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <span style={{ padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600, background: p.tier === "official" ? "#6366f120" : "#1e1e2e", color: p.tier === "official" ? "#6366f1" : "#888" }}>{p.tier || "free"}</span>
              {p.verified && <span style={{ padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600, background: "#10f09020", color: "#10f090" }}>Verificado</span>}
              {p.banned && <span style={{ padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600, background: "#f0505020", color: "#f05050" }}>BANEADO</span>}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            {p.banned ? (
              <button onClick={handleUnban} disabled={banLoading} style={{ padding: "10px 20px", background: "#10f090", color: "#000", border: "none", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                {banLoading ? "..." : "Desbanear"}
              </button>
            ) : (
              <>
                {!showBanInput ? (
                  <button onClick={() => setShowBanInput(true)} style={{ padding: "10px 20px", background: "#f05050", color: "#fff", border: "none", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    Banear usuario
                  </button>
                ) : (
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input value={banReason} onChange={e => setBanReason(e.target.value)} placeholder="Razón del baneo..." style={{ padding: "8px 12px", background: "#1a1a2e", border: "1px solid #2a2a3e", borderRadius: 8, color: "#e0e0e0", fontSize: 12, width: 200 }} />
                    <button onClick={handleBan} disabled={banLoading} style={{ padding: "8px 16px", background: "#f05050", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                      {banLoading ? "..." : "Confirmar"}
                    </button>
                    <button onClick={() => setShowBanInput(false)} style={{ padding: "8px 12px", background: "#1e1e2e", border: "1px solid #2a2a3e", borderRadius: 8, color: "#888", fontSize: 12, cursor: "pointer" }}>
                      Cancelar
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {p.ban_reason && (
          <div style={{ background: "#f0505010", border: "1px solid #f0505030", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#f05050" }}>
            Razón del baneo: {p.ban_reason}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginTop: 16 }}>
          <div><div style={{ fontSize: 10, color: "#666" }}>Reputación</div><div style={{ fontSize: 18, fontWeight: 700 }}>{p.reputation_score || 0}</div></div>
          <div><div style={{ fontSize: 10, color: "#666" }}>País</div><div style={{ fontSize: 14, fontWeight: 600 }}>{p.country || "—"}</div></div>
          <div><div style={{ fontSize: 10, color: "#666" }}>Verificación</div><div style={{ fontSize: 14, fontWeight: 600 }}>{p.verification_level || "ninguna"}</div></div>
          <div><div style={{ fontSize: 10, color: "#666" }}>Registrado</div><div style={{ fontSize: 14, fontWeight: 600 }}>{p.created_at ? new Date(p.created_at).toLocaleDateString() : "—"}</div></div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            style={{ padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", background: tab === t.id ? "#1e1e2e" : "transparent", border: tab === t.id ? "1px solid #2a2a3e" : "1px solid transparent", color: tab === t.id ? "#e0e0e0" : "#666" }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ background: "#12121a", border: "1px solid #1e1e2e", borderRadius: 14, padding: 20, maxHeight: 500, overflow: "auto" }}>
        {tab === "info" && (
          <div style={{ fontSize: 13, color: "#ccc" }}>
            <p><strong>Bio:</strong> {p.bio || "Sin bio"}</p>
            <p><strong>Wallet:</strong> {p.wallet_address || "No conectada"} {p.wallet_verified ? "✓" : ""}</p>
            <p><strong>ORB:</strong> {p.orb_verified_at ? `Verificado ${new Date(p.orb_verified_at).toLocaleDateString()}` : "No verificado"}</p>
            <h4 style={{ marginTop: 16, color: "#888" }}>Holdings ({data.holdings?.length || 0})</h4>
            {(data.holdings || []).map((h: any, i: number) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #1a1a2a", fontSize: 12 }}>
                <span>{h.token_symbol}</span>
                <span>{Number(h.amount).toLocaleString()} tokens</span>
                <span style={{ color: Number(h.pnl) >= 0 ? "#10f090" : "#f05050" }}>{Number(h.pnl).toFixed(4)} WLD</span>
              </div>
            ))}
          </div>
        )}

        {tab === "posts" && (
          <div>
            {(data.posts || []).map((post: any) => (
              <div key={post.id} style={{ padding: "12px 0", borderBottom: "1px solid #1a1a2a" }}>
                <div style={{ fontSize: 13, color: "#ccc", marginBottom: 4 }}>{post.content?.slice(0, 200)}{post.content?.length > 200 ? "..." : ""}</div>
                <div style={{ fontSize: 10, color: "#666", display: "flex", gap: 16 }}>
                  <span>❤️ {post.likes}</span>
                  <span>👁 {post.views}</span>
                  <span>{new Date(post.created_at).toLocaleString()}</span>
                </div>
              </div>
            ))}
            {(data.posts || []).length === 0 && <div style={{ color: "#666", fontSize: 13 }}>Sin posts</div>}
          </div>
        )}

        {tab === "trades" && (
          <div>
            {(data.trades || []).map((t: any, i: number) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #1a1a2a", fontSize: 12 }}>
                <span style={{ color: t.type === "buy" ? "#10f090" : "#f05050", fontWeight: 600, width: 50 }}>{t.type.toUpperCase()}</span>
                <span style={{ color: "#ccc" }}>{t.token_symbol}</span>
                <span style={{ color: "#888" }}>{Number(t.amount).toLocaleString()} tokens</span>
                <span style={{ color: "#888" }}>{Number(t.total).toFixed(6)} WLD</span>
                <span style={{ color: "#555", fontSize: 10 }}>{new Date(t.timestamp).toLocaleString()}</span>
              </div>
            ))}
            {(data.trades || []).length === 0 && <div style={{ color: "#666", fontSize: 13 }}>Sin trades</div>}
          </div>
        )}

        {tab === "chats" && (
          <div>
            <h4 style={{ color: "#888", fontSize: 12, marginBottom: 8 }}>Mensajes directos</h4>
            {(data.messages?.dms || []).map((m: any) => (
              <div key={m.id} style={{ padding: "8px 0", borderBottom: "1px solid #1a1a2a", fontSize: 12 }}>
                <div style={{ color: "#ccc" }}>{m.content}</div>
                <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>Conversación: {m.conversation_id?.slice(0, 20)} · {new Date(m.created_at).toLocaleString()}</div>
              </div>
            ))}
            {(data.messages?.dms || []).length === 0 && <div style={{ color: "#666", fontSize: 12, marginBottom: 16 }}>Sin DMs</div>}

            <h4 style={{ color: "#888", fontSize: 12, marginBottom: 8, marginTop: 16 }}>Chat global</h4>
            {(data.messages?.globalChats || []).map((m: any) => (
              <div key={m.id} style={{ padding: "8px 0", borderBottom: "1px solid #1a1a2a", fontSize: 12 }}>
                <div style={{ color: "#ccc" }}>{m.content}</div>
                <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>{new Date(m.created_at).toLocaleString()}</div>
              </div>
            ))}
            {(data.messages?.globalChats || []).length === 0 && <div style={{ color: "#666", fontSize: 12 }}>Sin mensajes globales</div>}
          </div>
        )}

        {tab === "reports" && (
          <div>
            {(data.reports || []).map((r: any) => (
              <div key={r.id} style={{ padding: "10px 0", borderBottom: "1px solid #1a1a2a", fontSize: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ color: r.reporter_id === userId ? "#f7a606" : "#06d6f7" }}>
                    {r.reporter_id === userId ? "Reportó a otro" : "Fue reportado"}
                  </span>
                  <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600, background: r.status === "pending" ? "#f7a60620" : "#1e1e2e", color: r.status === "pending" ? "#f7a606" : "#666" }}>
                    {r.status}
                  </span>
                </div>
                <div style={{ color: "#ccc" }}>Razón: {r.reason || "Sin especificar"}</div>
                <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>{new Date(r.created_at).toLocaleString()}</div>
              </div>
            ))}
            {(data.reports || []).length === 0 && <div style={{ color: "#666", fontSize: 13 }}>Sin reportes</div>}
          </div>
        )}
      </div>
    </div>
  );
}
