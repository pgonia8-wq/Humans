import { useApp } from "@/context/AppContext";
import type { Screen } from "@/context/AppContext";

interface Tab {
  id: Screen;
  label: string;
  icon: string;
}

const TABS: Tab[] = [
  { id: "discovery", label: "Explore", icon: "🔭" },
  { id: "airdrops", label: "Airdrops", icon: "🎁" },
  { id: "profile", label: "Portfolio", icon: "👤" },
];

export default function BottomTabBar() {
  const { screen, navigate } = useApp();
  const activeScreen = ["discovery", "token"].includes(screen) ? "discovery" : screen;

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: 64,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
        background: "rgba(13,14,20,0.92)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        zIndex: 100,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {TABS.map((tab) => {
        const isActive = activeScreen === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => navigate(tab.id)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "6px 16px",
              borderRadius: 12,
              transition: "opacity 0.15s",
              opacity: isActive ? 1 : 0.5,
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <span style={{ fontSize: 22 }}>{tab.icon}</span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.05em",
                color: isActive ? "#8b5cf6" : "#888",
                textTransform: "uppercase",
              }}
            >
              {tab.label}
            </span>
            {isActive && (
              <span
                style={{
                  position: "absolute",
                  bottom: 0,
                  width: 32,
                  height: 2,
                  background: "linear-gradient(90deg,#8b5cf6,#06d6f7)",
                  borderRadius: 2,
                }}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}
