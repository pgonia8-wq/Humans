import { AppProvider, useApp } from "@/context/AppContext";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import BottomTabBar from "@/components/BottomTabBar";
import DiscoveryPage from "@/features/tokens/DiscoveryPage";
import TokenPage from "@/features/tokens/TokenPage";

import UserProfilePage from "@/features/user/UserProfile";
import CreatorDashboard from "@/features/creator/CreatorDashboard";
import ScannerPage from "@/features/scanner/ScannerPage";

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

function OrbGateScreen() {
  const { requestOrbVerification } = useApp();
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    setVerifying(true);
    setError(null);
    try {
      const success = await requestOrbVerification();
      if (!success) {
        setError("Orb verification failed. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center gap-6 px-8 max-w-sm text-center"
      >
        <div className="relative w-28 h-28 flex items-center justify-center">
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 bg-primary/30 rounded-full blur-xl"
          />
          <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary to-purple-800 shadow-[0_0_40px_rgba(139,92,246,0.5)] border-2 border-primary/40" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Orb Verification Required</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Token Market is exclusive to Orb-verified humans. Verify with your World ID to access trading.
          </p>
        </div>

        {error && (
          <p className="text-xs text-red-400 bg-red-400/10 px-4 py-2 rounded-lg">{error}</p>
        )}

        <button
          onClick={handleVerify}
          disabled={verifying}
          className="w-full py-3.5 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-semibold text-sm transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] active:scale-[0.98]"
        >
          {verifying ? (
            <span className="flex items-center justify-center gap-2">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
              />
              Verifying...
            </span>
          ) : (
            "Verify with Orb"
          )}
        </button>
      </motion.div>
    </div>
  );
}

function MainApp() {
  const { worldAppReady, screen, isCreatorModalOpen, user } = useApp();

  if (!worldAppReady) {
    return <SplashScreen />;
  }

  if (user?.verificationLevel !== "orb") {
    return <OrbGateScreen />;
  }

  const renderScreen = () => {
    switch (screen) {
      case "discovery": return <DiscoveryPage />;
      case "token": return <TokenPage />;
      case "scanner": return <ScannerPage />;
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
