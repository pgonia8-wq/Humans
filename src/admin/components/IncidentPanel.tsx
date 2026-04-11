import React, { useState, useEffect } from "react";

interface IncidentState {
  tradingPaused: boolean;
  frozenTokens: string[];
  readOnlyMode: boolean;
  degradedMode: boolean;
  alertHistory: any[];
}

const CONTROLS = [
  { action: "pause_trading", offAction: "resume_trading", label: "Pausar Trading", offLabel: "Reanudar Trading", icon: "🛑", color: "#f05050", key: "tradingPaused", desc: "Detiene TODAS las operaciones de compra/venta de tokens. Los usuarios verán un mensaje de mantenimiento." },
  { action: "enable_readonly", offAction: "disable_readonly", label: "Modo Solo Lectura", offLabel: "Desactivar Solo Lectura", icon: "⚠️", color: "#f7a606", key: "readOnlyMode", desc: "Permite ver el feed pero bloquea posts, likes, trades y todas las escrituras." },
  { action: "enable_degraded", offAction: "disable_degraded", label: "Modo Degradado", offLabel: "Desactivar Degradado", icon: "🧯", color: "#06d6f7", key: "degradedMode", desc: "Activa modo cache-heavy: reduce queries a DB, sirve datos cacheados. Para emergencias de carga." },
];

export default function IncidentPanel({ apiCall, tokens }: { apiCall: any; tokens?: any[] }) {
  const [state, setState] = useState<IncidentState | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ action: string; label: string } | null>(null);
  const [reason, setReason] = useState("");
  const [freezeTokenId, setFreezeTokenId] = useState("");
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const load = async () => {
    try {
      const data = await apiCall("incidents");
      setState(data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { const iv = setInterval(load, 5000); return () => clearInterval(iv); }, []);

  const exec = async (action: string) => {
    setActionLoading(action);
    setResult(null);
    try {
      const body: any = { action, reason: reason || undefined };
      if (action === "freeze_token" || action === "unfreeze_token") body.tokenId = freezeTokenId;
      const data = await apiCall("incidents", { method: "POST", body: JSON.stringify(body) });
      if (data.success) {
        setResult({ ok: true, msg: `${data.result} ejecutado` });
        setConfirm(null);
        setReason("");
        load();
      } else {
        setResult({ ok: false, msg: data.error || "Error" });
      }
    } catch (e: any) {
      setResult({ ok: false, msg: e.message });
    }
    setActionLoading(null);
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#666" }}>Cargando controles...</div>;

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: "#e0e0e0" }}>Controles de Incidente</h2>
      <p style={{ fontSize: 12, color: "#666", marginBottom: 20 }}>Kill switches y controles de emergencia del sistema. Cada acción se loguea.</p>

      {result && (
        <div style={{ padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 12, fontWeight: 600, background: result.ok ? "#10f09015" : "#f0505015", border: `1px solid ${result.ok ? "#10f09030" : "#f0505030"}`, color: result.ok ? "#10f090" : "#f05050" }}>
          {result.ok ? "✅" : "❌"} {result.msg}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 24 }}>
        {CONTROLS.map(ctrl => {
          const isActive = state?.[ctrl.key as keyof IncidentState] as boolean;
          return (
            <div key={ctrl.action} style={{ background: "#12121a", border: `2px solid ${isActive ? ctrl.color + "60" : "#1e1e2e"}`, borderRadius: 14, padding: 20, position: "relative", overflow: "hidden" }}>
              {isActive && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: ctrl.color }} />}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 24 }}>{ctrl.icon}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: isActive ? ctrl.color : "#e0e0e0" }}>{ctrl.label}</div>
                  <div style={{ fontSize: 10, color: isActive ? ctrl.color : "#666", fontWeight: 600 }}>
                    {isActive ? "ACTIVO" : "Inactivo"}
                  </div>
                </div>
              </div>
              <p style={{ fontSize: 11, color: "#888", marginBottom: 14, lineHeight: 1.5 }}>{ctrl.desc}</p>
              {confirm?.action === (isActive ? ctrl.offAction : ctrl.action) ? (
                <div>
                  <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Razón (opcional)..."
                    style={{ width: "100%", padding: "8px 12px", background: "#0d0d14", border: "1px solid #2a2a3e", borderRadius: 8, color: "#ccc", fontSize: 12, marginBottom: 8, boxSizing: "border-box" }} />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => exec(isActive ? ctrl.offAction : ctrl.action)} disabled={!!actionLoading}
                      style={{ flex: 1, padding: "10px", background: isActive ? "#10f090" : ctrl.color, color: isActive ? "#000" : "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                      {actionLoading ? "..." : "CONFIRMAR"}
                    </button>
                    <button onClick={() => { setConfirm(null); setReason(""); }}
                      style={{ padding: "10px 16px", background: "#1e1e2e", border: "1px solid #2a2a3e", borderRadius: 8, color: "#888", fontSize: 12, cursor: "pointer" }}>
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setConfirm({ action: isActive ? ctrl.offAction : ctrl.action, label: isActive ? ctrl.offLabel : ctrl.label })}
                  style={{ width: "100%", padding: "10px", background: isActive ? "#10f09015" : `${ctrl.color}15`, border: `1px solid ${isActive ? "#10f09030" : ctrl.color + "30"}`, borderRadius: 8, color: isActive ? "#10f090" : ctrl.color, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  {isActive ? ctrl.offLabel : ctrl.label}
                </button>
              )}
            </div>
          );
        })}

        <div style={{ background: "#12121a", border: `2px solid ${(state?.frozenTokens || []).length > 0 ? "#06d6f760" : "#1e1e2e"}`, borderRadius: 14, padding: 20, position: "relative", overflow: "hidden" }}>
          {(state?.frozenTokens || []).length > 0 && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "#06d6f7" }} />}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 24 }}>🧊</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#e0e0e0" }}>Congelar Token</div>
              <div style={{ fontSize: 10, color: (state?.frozenTokens || []).length > 0 ? "#06d6f7" : "#666", fontWeight: 600 }}>
                {(state?.frozenTokens || []).length > 0 ? `${state?.frozenTokens.length} congelado(s)` : "Ninguno congelado"}
              </div>
            </div>
          </div>
          <p style={{ fontSize: 11, color: "#888", marginBottom: 10, lineHeight: 1.5 }}>Bloquea compra/venta de un token específico. Selecciona el token e ingresa razón.</p>

          {(state?.frozenTokens || []).length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: "#06d6f7", fontWeight: 600, marginBottom: 4 }}>Tokens congelados:</div>
              {state?.frozenTokens.map((tid: string) => (
                <div key={tid} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 8px", background: "#06d6f710", borderRadius: 6, marginBottom: 4, fontSize: 11 }}>
                  <span style={{ color: "#ccc", fontFamily: "monospace" }}>{tid.slice(0, 20)}...</span>
                  <button onClick={() => { setFreezeTokenId(tid); exec("unfreeze_token"); }}
                    style={{ padding: "2px 8px", background: "#10f09020", border: "1px solid #10f09030", borderRadius: 4, color: "#10f090", fontSize: 10, cursor: "pointer" }}>
                    Descongelar
                  </button>
                </div>
              ))}
            </div>
          )}

          <select value={freezeTokenId} onChange={e => setFreezeTokenId(e.target.value)}
            style={{ width: "100%", padding: "8px 12px", background: "#0d0d14", border: "1px solid #2a2a3e", borderRadius: 8, color: "#ccc", fontSize: 12, marginBottom: 8 }}>
            <option value="">Seleccionar token...</option>
            {(tokens || []).map((t: any) => (
              <option key={t.id} value={t.id}>{t.symbol} — {t.name || t.id.slice(0, 12)}</option>
            ))}
          </select>
          <button onClick={() => { if (freezeTokenId) { setConfirm({ action: "freeze_token", label: "Congelar" }); if (confirm?.action === "freeze_token") exec("freeze_token"); else setConfirm({ action: "freeze_token", label: "Congelar" }); } }}
            disabled={!freezeTokenId}
            style={{ width: "100%", padding: "10px", background: "#06d6f715", border: "1px solid #06d6f730", borderRadius: 8, color: "#06d6f7", fontSize: 12, fontWeight: 700, cursor: freezeTokenId ? "pointer" : "default", opacity: freezeTokenId ? 1 : 0.4 }}>
            🧊 Congelar Token
          </button>
        </div>
      </div>

      <div style={{ background: "#12121a", border: "1px solid #1e1e2e", borderRadius: 14, padding: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: "#888", marginBottom: 12 }}>Historial de Alertas del Sistema</h3>
        <div style={{ maxHeight: 300, overflowY: "auto" }}>
          {(state?.alertHistory || []).length === 0 && <div style={{ color: "#555", fontSize: 12 }}>Sin alertas registradas</div>}
          {(state?.alertHistory || []).reverse().map((a: any, i: number) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #1a1a2a", fontSize: 12 }}>
              <span>{a.severity === "critical" ? "🔴" : a.severity === "warning" ? "🟡" : "🔵"}</span>
              <span style={{ color: "#ccc", flex: 1 }}>{a.type}</span>
              <span style={{ color: "#555", fontSize: 10 }}>{new Date(a.timestamp).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
