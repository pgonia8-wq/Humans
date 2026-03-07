import React, { useState } from 'react';
import PostCard from '../components/PostCard';

interface Post {
  id: string;
  content?: string;
  timestamp: string;
  profile?: {
    username?: string;
  };
  [key: string]: any;
}

interface FeedPageProps {
  posts: Post[];
  loading?: boolean;
  error?: string | null;
  currentUserId: string | null;
  userTier: "free" | "premium" | "premium+";
}

const FeedPage: React.FC<FeedPageProps> = ({ posts, loading, error, currentUserId, userTier }) => {
  const [showUpgradeOptions, setShowUpgradeOptions] = useState(false);
  const [selectedTier, setSelectedTier] = useState<"premium" | "premium+" | null>(null);
  const [loadingUpgrade, setLoadingUpgrade] = useState(false);

  const handleUpgrade = async (tier: "premium" | "premium+") => {
    if (!currentUserId) return alert("No se encontró tu ID.");

    setLoadingUpgrade(true);
    try {
      const transactionId = crypto.randomUUID(); // MiniKit Wallet manejará la transacción real
      const res = await fetch("/api/upgrade.mjs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId, tier, transactionId }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Error al procesar upgrade");

      alert(`¡Upgrade a ${tier} exitoso! Precio: ${data.price} USD`);
      setSelectedTier(null);
      setShowUpgradeOptions(false);
    } catch (err: any) {
      console.error("Upgrade error:", err);
      alert("Error al procesar upgrade: " + (err.message || "Intenta de nuevo"));
    } finally {
      setLoadingUpgrade(false);
    }
  };

  // Beneficios según tier
  const tierBenefits = {
    premium: [
      "Boost 5 veces por semana",
      "Recibir tips",
      "1 WLD por referido registrado",
    ],
    "premium+": [
      "Boost ilimitado",
      "Recibir tips",
      "Mayor visibilidad de posts",
      "Bonificaciones extra por engagement",
    ],
  };

  // Modal tipo slice
  const renderBenefitsModal = () => {
    if (!selectedTier) return null;
    return (
      <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
        <div className="bg-gray-900 w-full max-w-md p-6 rounded-t-2xl">
          <h2 className="text-xl font-bold mb-4 text-center">{selectedTier === "premium" ? "Premium" : "Premium+"}</h2>
          <ul className="list-disc list-inside space-y-2 mb-6">
            {tierBenefits[selectedTier].map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
          <div className="flex gap-4">
            <button
              onClick={() => handleUpgrade(selectedTier)}
              disabled={loadingUpgrade}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl"
            >
              {loadingUpgrade ? "Procesando..." : "Confirmar"}
            </button>
            <button
              onClick={() => setSelectedTier(null)}
              disabled={loadingUpgrade}
              className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-2xl"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Banner de upgrade solo para free y premium
  const renderUpgradeBanner = () => {
    if (userTier === "premium+") return null;
    return (
      <div className="w-full max-w-2xl px-4">
        {!showUpgradeOptions ? (
          <button
            onClick={() => setShowUpgradeOptions(true)}
            className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-2xl shadow-md mt-2"
          >
            Upgrade
          </button>
        ) : (
          <div className="flex gap-4 mt-2">
            <button
              onClick={() => setSelectedTier("premium")}
              className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-2xl shadow-md flex items-center justify-center"
            >
              Premium
            </button>
            <button
              onClick={() => setSelectedTier("premium+")}
              className="flex-1 py-3 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-500 hover:to-teal-500 text-white font-bold rounded-2xl shadow-md flex items-center justify-center"
            >
              Premium+
            </button>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="w-full max-w-2xl space-y-6 px-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="bg-gray-900/60 backdrop-blur-sm rounded-2xl p-5 animate-pulse space-y-4 border border-gray-800/50"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-gray-800" />
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-gray-800 rounded w-3/4" />
                <div className="h-3 bg-gray-800 rounded w-1/2" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-800 rounded w-full" />
              <div className="h-4 bg-gray-800 rounded w-5/6" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) return <p className="text-red-500 text-center py-6">{error}</p>;
  if (posts.length === 0) return <p className="text-gray-500 text-center py-10">No hay posts todavía.</p>;

  return (
    <div className="w-full max-w-2xl flex flex-col gap-6 px-4">
      {renderUpgradeBanner()}
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
      {renderBenefitsModal()}
    </div>
  );
};

export default FeedPage;
