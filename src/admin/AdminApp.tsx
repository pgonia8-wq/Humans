import React, { useState, useEffect, useCallback } from "react";
import OverviewPanel from "./components/OverviewPanel";
import UsersPanel from "./components/UsersPanel";
import UserDetailPanel from "./components/UserDetailPanel";
import ReportsPanel from "./components/ReportsPanel";
import TokensPanel from "./components/TokensPanel";
import AlertPanel from "./components/AlertPanel";

const TABS = [
  { id: "overview", label: "Panel General", icon: "📊" },
  { id: "users", label: "Usuarios", icon: "👥" },
  { id: "reports", label: "Reportes", icon: "🚨" },
  { id: "tokens", label: "Tokens", icon: "💰" },
  { id: "alerts", label: "Alertas", icon: "⚡" },
] as const;

type TabId = typeof TABS[number]["id"];

function getStoredKey(): string {
  return sessionStorage.getItem("admin_key") || "";
}

export default function AdminApp() {
  const [adminKey, setAdminKey] = useState(getStoredKey());
  const [keyInput, setKeyInput] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");
  const [checking, setChecking] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);

  const apiCall = useCallback(async (path: string, opts?: any) => {
    const key = adminKey || getStoredKey();
    const url = `/api/admin/${path}`;
    const sep = url.includes("?") ? "&" : "?";
    const fullUrl = `${url}${sep}key=${encodeURIComponent(key)}`;
    const res = await fetch(fullUrl, {
      ...opts,
      headers: { "Content-Type": "application/json", "x-admin-key": key, ...(opts?.headers || {}) },
    });
    if (res.status === 401) { setAuthenticated(false); sessionStorage.removeItem("admin_key"); throw new Error("Unauthorized"); }
    return res.json();
  }, [adminKey]);

  const checkAuth = async (key: string) => {
    setChecking(true);
    setAuthError("");
    try {
      const res = await fetch(`/api/health`);
      if (!res.ok) throw new Error("Server unreachable");
      const statsRes = await fetch(`/api/admin/stats?key=${encodeURIComponent(key)}`, {
        headers: { "x-admin-key": key },
      });
      if (statsRes.status === 401) { setAuthError("Clave incorrecta"); setChecking(false); return; }
      const data = await statsRes.json();
      setStats(data);
      setAdminKey(key);
      sessionStorage.setItem("admin_key", key);
      setAuthenticated(true);
    } catch (e: any) {
      setAuthError(e.message || "Error de conexión");
    }
    setChecking(false);
  };

  useEffect(() => {
    const stored = getStoredKey();
    if (stored) checkAuth(stored);
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    const fetchAll = async () => {
      try {
        const data = await apiCall("stats");
        setStats(data);
        const newAlerts: any[] = [];
        if (data.overview.pendingReports > 0) newAlerts.push({ type: "warning", msg: `${data.overview.pendingReports} reportes pendientes` });
        if (data.trading.totalTreasury < 1 && data.trading.totalWldInCurve > 10) newAlerts.push({ type: "critical", msg: "Treasury casi vacío" });
        try {
          const hRes = await fetch("/api/health");
          const hData = await hRes.json();
          setHealth(hData);
          if (hData.alerts) hData.alerts.forEach((a: any) => newAlerts.push({ type: "critical", msg: a.type + ": " + JSON.stringify(a) }));
          if (hData.status === "degraded") newAlerts.push({ type: "warning", msg: "Sistema degradado — latencia alta" });
          if (hData.status === "critical") newAlerts.push({ type: "critical", msg: "Sistema CRÍTICO" });
        } catch {}
        setAlerts(newAlerts);
      } catch {}
    };
    fetchAll();
    const interval = setInterval(fetchAll, 5000);
    return () => clearInterval(interval);
  }, [authenticated, apiCall]);

  const handleViewUser = (userId: string) => { setSelectedUserId(userId); setActiveTab("users"); };

  if (!authenticated) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0f", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', -apple-system, sans-serif" }}>
        <div style={{ background: "#12121a", border: "1px solid #1e1e2e", borderRadius: 16, padding: 40, width: 380, textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🛡️</div>
          <h1 style={{ color: "#e0e0e0", fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Mission Control</h1>
          <p style={{ color: "#666", fontSize: 12, marginBottom: 24 }}>Acceso restringido</p>
          <input
            type="password"
            value={keyInput}
            onChange={e => setKeyInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && keyInput && checkAuth(keyInput)}
            placeholder="Clave de administrador"
            style={{ width: "100%", padding: "12px 16px", background: "#1a1a2e", border: "1px solid #2a2a3e", borderRadius: 10, color: "#e0e0e0", fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 12 }}
          />
          {authError && <p style={{ color: "#f05050", fontSize: 12, marginBottom: 8 }}>{authError}</p>}
          <button
            onClick={() => keyInput && checkAuth(keyInput)}
            disabled={checking || !keyInput}
            style={{ width: "100%", padding: "12px", background: checking ? "#333" : "#6366f1", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: checking ? "wait" : "pointer", opacity: !keyInput ? 0.4 : 1 }}
          >
            {checking ? "Verificando..." : "Entrar"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", fontFamily: "'Inter', -apple-system, sans-serif", color: "#e0e0e0" }}>
      <header style={{ background: "#12121a", borderBottom: "1px solid #1e1e2e", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 20 }}>🛡️</span>
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}>Mission Control</h1>
            <span style={{ fontSize: 10, color: "#666" }}>Humans Admin Dashboard</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {alerts.length > 0 && (
            <span style={{ background: "#f0505020", color: "#f05050", padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600 }}>
              {alerts.length} alerta{alerts.length > 1 ? "s" : ""}
            </span>
          )}
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10f090", boxShadow: "0 0 8px #10f09060" }} title="Conectado" />
          <button onClick={() => { sessionStorage.removeItem("admin_key"); setAuthenticated(false); }} style={{ background: "none", border: "1px solid #2a2a3e", borderRadius: 8, color: "#888", padding: "6px 12px", fontSize: 11, cursor: "pointer" }}>
            Salir
          </button>
        </div>
      </header>

      <div style={{ display: "flex" }}>
        <nav style={{ width: 200, background: "#0f0f18", borderRight: "1px solid #1a1a2a", padding: "16px 8px", minHeight: "calc(100vh - 52px)", flexShrink: 0 }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); if (tab.id !== "users") setSelectedUserId(null); }}
              style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px",
                background: activeTab === tab.id ? "#1a1a2e" : "transparent",
                border: activeTab === tab.id ? "1px solid #2a2a3e" : "1px solid transparent",
                borderRadius: 10, color: activeTab === tab.id ? "#e0e0e0" : "#666",
                fontSize: 13, fontWeight: activeTab === tab.id ? 600 : 400, cursor: "pointer",
                marginBottom: 4, textAlign: "left",
              }}
            >
              <span style={{ fontSize: 16 }}>{tab.icon}</span>
              {tab.label}
              {tab.id === "reports" && stats?.overview?.pendingReports > 0 && (
                <span style={{ marginLeft: "auto", background: "#f05050", color: "#fff", borderRadius: 6, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>
                  {stats.overview.pendingReports}
                </span>
              )}
            </button>
          ))}
        </nav>

        <main style={{ flex: 1, padding: 24, overflow: "auto", maxHeight: "calc(100vh - 52px)" }}>
          {activeTab === "overview" && <OverviewPanel stats={stats} health={health} onViewUser={handleViewUser} />}
          {activeTab === "users" && !selectedUserId && <UsersPanel apiCall={apiCall} onSelectUser={setSelectedUserId} />}
          {activeTab === "users" && selectedUserId && <UserDetailPanel apiCall={apiCall} userId={selectedUserId} onBack={() => setSelectedUserId(null)} />}
          {activeTab === "reports" && <ReportsPanel apiCall={apiCall} onViewUser={handleViewUser} />}
          {activeTab === "tokens" && <TokensPanel tokens={stats?.tokens || []} trading={stats?.trading} />}
          {activeTab === "alerts" && <AlertPanel alerts={alerts} stats={stats} health={health} />}
        </main>
      </div>
    </div>
  );
}
