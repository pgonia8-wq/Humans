import { useApp } from "@/context/AppContext";
import type { Screen } from "@/context/AppContext";
import { Compass, User, Plus, ScanSearch } from "lucide-react";
import { motion } from "framer-motion";

const tabs: { key: Screen; icon: typeof Compass; label: string }[] = [
  { key: "discovery", icon: Compass, label: "Explore" },
  { key: "scanner", icon: ScanSearch, label: "Scanner" },
  { key: "profile", icon: User, label: "Profile" },
];

export default function BottomTabBar() {
  const { screen, navigate, openCreatorDashboard, isCreatorModalOpen } = useApp();

  if (isCreatorModalOpen) return null;
  if (screen === "token") return null;

  return (
    <div className="relative flex items-center justify-around px-2 pb-[env(safe-area-inset-bottom)] bg-card/80 backdrop-blur-xl border-t border-border/50" data-testid="bottom-tab-bar">
      {tabs.map((tab, i) => {
        const isActive = screen === tab.key;
        const Icon = tab.icon;

        if (i === 0) {
          return (
            <div key="explore-group" className="flex items-center gap-0">
              <TabButton isActive={isActive} onClick={() => navigate(tab.key)} icon={Icon} label={tab.label} testId={`tab-${tab.key}`} />
              <button
                onClick={openCreatorDashboard}
                data-testid="button-create-token"
                className="relative -mt-6 mx-3 w-14 h-14 rounded-full bg-gradient-to-br from-green-500 to-emerald-400 flex items-center justify-center shadow-[0_0_24px_rgba(34,197,94,0.4)] active:scale-95 transition-transform"
              >
                <Plus className="w-7 h-7 text-white" strokeWidth={2.5} />
              </button>
            </div>
          );
        }

        return <TabButton key={tab.key} isActive={isActive} onClick={() => navigate(tab.key)} icon={Icon} label={tab.label} testId={`tab-${tab.key}`} />;
      })}
    </div>
  );
}

function TabButton({ isActive, onClick, icon: Icon, label, testId }: { isActive: boolean; onClick: () => void; icon: typeof Compass; label: string; testId: string }) {
  return (
    <button onClick={onClick} data-testid={testId} className="relative flex flex-col items-center gap-1 py-3 px-5 group">
      <div className="relative">
        <Icon className={`w-5 h-5 transition-colors ${isActive ? "text-green-400" : "text-muted-foreground group-active:text-foreground"}`} />
        {isActive && (
          <motion.div
            layoutId="tab-glow"
            className="absolute -inset-2 rounded-full bg-green-500/15 blur-md"
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />
        )}
      </div>
      <span className={`text-[10px] font-medium transition-colors ${isActive ? "text-green-400" : "text-muted-foreground"}`}>{label}</span>
    </button>
  );
}
