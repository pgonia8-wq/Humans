import { AppProvider, useApp } from "@/context/AppContext";
import { AnimatePresence, motion } from "framer-motion";
import BottomTabBar from "@/components/BottomTabBar";
import DiscoveryPage from "@/features/tokens/DiscoveryPage";
import TokenPage from "@/features/tokens/TokenPage";

import UserProfilePage from "@/features/user/UserProfile";
import CreatorDashboard from "@/features/creator/CreatorDashboard";

function SplashScreen() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center gap-4"
      >
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30 shadow-[0_0_30px_rgba(139,92,246,0.3)]">
          <div className="w-8 h-8 rounded-full bg-primary animate-pulse" />
        </div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Token Market</h1>
        <p className="text-sm text-muted-foreground">Connecting to World App...</p>
      </motion.div>
    </div>
  );
}

function MainApp() {
  const { worldAppReady, screen, isCreatorModalOpen } = useApp();

  if (!worldAppReady) {
    return <SplashScreen />;
  }

  const renderScreen = () => {
    switch (screen) {
      case "discovery": return <DiscoveryPage />;
      case "token": return <TokenPage />;

      case "profile": return <UserProfilePage />;
      default: return <DiscoveryPage />;
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full max-w-md mx-auto bg-background overflow-hidden relative selection:bg-primary/30">
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={screen}
            initial={{ opacity: 0, x: screen === "token" ? 20 : 0 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {renderScreen()}
          </motion.div>
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isCreatorModalOpen && (
          <motion.div
            key="creator-modal"
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute inset-0 z-50 bg-background overflow-y-auto"
          >
            <CreatorDashboard />
          </motion.div>
        )}
      </AnimatePresence>

      <BottomTabBar />
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}

export default App;
