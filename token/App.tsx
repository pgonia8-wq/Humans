import { AppProvider, useApp } from "@/context/AppContext";
import BottomTabBar from "@/components/BottomTabBar";
import DiscoveryPage from "@/features/tokens/DiscoveryPage";
import TokenPage from "@/features/tokens/TokenPage";
import AirdropPage from "@/features/airdrops/AirdropPage";
import UserProfile from "@/features/user/UserProfile";
import CreatorDashboard from "@/features/creator/CreatorDashboard";

function SplashScreen() {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#0d0e14",
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: "linear-gradient(135deg,#8b5cf6,#06d6f7)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 32,
          marginBottom: 20,
          boxShadow: "0 0 32px rgba(139,92,246,0.5)",
        }}
      >
        🌍
      </div>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: "#e8e9f0", marginBottom: 8 }}>
        Token Market
      </h1>
      <p style={{ fontSize: 13, color: "#888" }}>Connecting to World App...</p>
    </div>
  );
}

function AppShell() {
  const { screen, isCreatorModalOpen, worldAppReady } = useApp();

  if (!worldAppReady) return <SplashScreen />;

  const renderScreen = () => {
    switch (screen) {
      case "discovery": return <DiscoveryPage />;
      case "token": return <TokenPage />;
      case "airdrops": return <AirdropPage />;
      case "profile": return <UserProfile />;
      default: return <DiscoveryPage />;
    }
  };

  return (
    <div
      style={{
        height: "100vh",
        width: "100%",
        background: "#0d0e14",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -120,
          right: -80,
          width: 320,
          height: 320,
          borderRadius: "50%",
          background: "radial-gradient(circle,rgba(139,92,246,0.08) 0%,transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 80,
          left: -100,
          width: 280,
          height: 280,
          borderRadius: "50%",
          background: "radial-gradient(circle,rgba(6,214,247,0.06) 0%,transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div style={{ position: "relative", zIndex: 1, flex: 1, overflow: "hidden" }}>
        {renderScreen()}
      </div>

      <BottomTabBar />

      {isCreatorModalOpen && <CreatorDashboard />}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
