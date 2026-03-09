import React, { useState, useEffect } from "react";
import PostCard from "../components/PostCard";
import { supabase } from "../supabaseClient";
import { MiniKit, Tokens, tokenToDecimals } from "@worldcoin/minikit-js"; // CORRECCIÓN: Importa Tokens y tokenToDecimals

const RECEIVER = "0xdf4a991bc05945bd0212e773adcff6ea619f4c4b";

interface FeedPageProps {
  posts: any[];
  loading?: boolean;
  error?: string | null;
  currentUserId: string | null;
  userTier: "free" | "basic" | "premium" | "premium+";
}

const FeedPage: React.FC<FeedPageProps> = ({
  posts,
  loading,
  error,
  currentUserId,
  userTier
}) => {

  const [showUpgradeOptions, setShowUpgradeOptions] = useState(false);
  const [selectedTier, setSelectedTier] = useState<"premium" | "premium+" | null>(null);
  const [showSlideModal, setShowSlideModal] = useState(false);
  const [loadingUpgrade, setLoadingUpgrade] = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  const [price, setPrice] = useState(0);

  useEffect(() => {
    if (!selectedTier) return;

    const fetchSlots = async () => {
      const { count } = await supabase
        .from("upgrades")
        .select("*", { count: "exact", head: true })
        .eq("tier", selectedTier);

      const limit = selectedTier === "premium" ? 10000 : 3000;
      const used = count || 0;
      const calculatedPrice = used < limit
        ? selectedTier === "premium" ? 10 : 15
        : selectedTier === "premium" ? 20 : 35;

      setPrice(calculatedPrice);
    };

    fetchSlots();
  }, [selectedTier]);

  const handleUpgrade = () => {
    setShowUpgradeOptions(true);
  };

  const selectTier = (tier: "premium" | "premium+") => {
    setSelectedTier(tier);
    setShowSlideModal(true);
  };

  const cancelUpgrade = () => {
    setShowSlideModal(false);
    setSelectedTier(null);
    setShowUpgradeOptions(false);
  };

  const confirmUpgrade = async () => {
    if (!currentUserId || !selectedTier) {
      setUpgradeError("No se encontró tu ID o tier seleccionado");
      return;
    }

    setLoadingUpgrade(true);
    setUpgradeError(null);

    try {
      if (!MiniKit.isInstalled()) {
        throw new Error("MiniKit no detectado dentro de World App");
      }

      const payRes = await MiniKit.commandsAsync.pay({
        reference: "upgrade-" + Date.now(),
        to: RECEIVER,
        tokens: [
          {
            symbol: Tokens.WLD, // CORRECCIÓN: Usa el enum Tokens.WLD en lugar de "WLD"
            token_amount: tokenToDecimals(price, Tokens.WLD).toString() // CORRECCIÓN: Convierte price (ej. 15) a string con 18 decimales (ej. "15000000000000000000")
          }
        ],
        description: `Upgrade ${selectedTier}`
      });

      console.log("[UPGRADE] pay response:", payRes);

      if (payRes?.finalPayload?.status !== "success") {
        throw new Error(payRes?.finalPayload?.description || "Pago cancelado");
      }

      const transactionId = payRes?.finalPayload?.transaction_id;

      const res = await fetch("/api/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUserId,
          tier: selectedTier,
          transactionId
        })
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || "Error al procesar upgrade");
      }

      alert(`Upgrade ${selectedTier} exitoso`);
      cancelUpgrade();
    } catch (err: any) {
      console.error("[UPGRADE] error:", err);
      setUpgradeError(err.message || "Error en el upgrade");
    } finally {
      setLoadingUpgrade(false);
    }
  };

  return (
    <div className="flex flex-col p-4">
      <div className="mb-6">
        <button
          onClick={handleUpgrade}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold shadow-lg"
        >
          Upgrade
        </button>
      </div>

      {showUpgradeOptions && (
        <div className="space-y-4 mb-6">
          <button
            onClick={() => selectTier("premium")}
            className="w-full py-4 rounded-xl bg-blue-600 text-white font-bold"
          >
            Premium
          </button>
          <button
            onClick={() => selectTier("premium+")}
            className="w-full py-4 rounded-xl bg-purple-600 text-white font-bold"
          >
            Premium+
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-center py-10">Cargando...</p>
      ) : error ? (
        <p className="text-red-500 text-center py-10">{error}</p>
      ) : (
        <div className="space-y-5">
          {posts?.map((post) => (
            <PostCard key={post.id} post={post} currentUserId={currentUserId} />
          ))}
        </div>
      )}

      {upgradeError && (
        <p className="text-red-500 text-center py-4">{upgradeError}</p>
      )}

      {showSlideModal && selectedTier && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
          <div className="w-full max-w-md bg-gray-900 rounded-t-3xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Beneficios de {selectedTier}</h2>
            <p className="text-white text-center mb-4">Precio: {price} WLD</p>
            <div className="flex gap-4">
              <button
                onClick={cancelUpgrade}
                className="flex-1 py-3 bg-gray-700 text-white rounded-2xl"
              >
                Cancelar
              </button>
              <button
                onClick={confirmUpgrade}
                disabled={loadingUpgrade}
                className="flex-1 py-3 bg-yellow-500 text-black rounded-2xl font-bold"
              >
                {loadingUpgrade ? "Procesando..." : "Aceptar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedPage;
