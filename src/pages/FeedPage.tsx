import React, { useState, useEffect } from "react";
import PostCard from "../components/PostCard";
import { supabase } from "../supabaseClient";
import { MiniKit } from "@worldcoin/minikit-js";

const PAGE_SIZE = 8;

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
  const [price, setPrice] = useState<number>(0);
  const [slotsLeft, setSlotsLeft] = useState<number>(0);
  const [showInsufficientFunds, setShowInsufficientFunds] = useState(false);

  useEffect(() => {
    if (!selectedTier) return;

    const fetchPriceAndSlots = async () => {
      const { count, error } = await supabase
        .from("upgrades")
        .select("*", { count: "exact", head: true })
        .eq("tier", selectedTier);

      if (error) {
        console.error("[UPGRADE] Error slots:", error);
        return;
      }

      const limit = selectedTier === "premium" ? 10000 : 3000;
      const used = count || 0;

      setSlotsLeft(limit - used);

      setPrice(
        used < limit
          ? selectedTier === "premium"
            ? 10
            : 15
          : selectedTier === "premium"
          ? 20
          : 35
      );
    };

    fetchPriceAndSlots();
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
      setUpgradeError("No se encontró tu ID o tier seleccionado.");
      return;
    }

    setLoadingUpgrade(true);
    setUpgradeError(null);
    setShowInsufficientFunds(false);

    console.log("[UPGRADE] Iniciando pago para tier:", selectedTier, "precio:", price);

    try {
      if (!MiniKit.isInstalled()) {
        throw new Error("MiniKit no instalado o World App no detectada");
      }

      const payRes = await MiniKit.commandsAsync.pay({
        reference: "upgrade-" + Date.now(),
        to: "0x4df4a99b05945b0594db02127ad3cdffea619f4cb",
        tokens: [
          {
            token: "WLD",   // FIX AQUÍ
            amount: price.toString()
          }
        ],
        description: `Upgrade ${selectedTier}`
      });

      console.log("[UPGRADE] pay response:", payRes);

      if (payRes?.finalPayload?.status !== "success") {
        const errorMsg = payRes?.finalPayload?.error || "";

        if (
          errorMsg.includes("insufficient") ||
          errorMsg.includes("funds") ||
          errorMsg.includes("balance")
        ) {
          setShowInsufficientFunds(true);
          throw new Error("Fondos insuficientes en tu wallet");
        }

        throw new Error("Pago cancelado");
      }

      const transactionId = payRes?.finalPayload?.transaction_id;

      console.log("[UPGRADE] txId:", transactionId);

      const res = await fetch("/api/upgrade", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          userId: currentUserId,
          tier: selectedTier,
          transactionId
        })
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Error ${res.status}: ${text}`);
      }

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || "Error al procesar upgrade");
      }

      alert(`¡Upgrade a ${selectedTier} exitoso!`);

      cancelUpgrade();
    } catch (err: any) {
      console.error("[UPGRADE] error:", err);
      setUpgradeError(err.message || "Error al procesar el upgrade");
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
            className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-md"
          >
            Premium
          </button>

          <button
            onClick={() => selectTier("premium+")}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold shadow-md"
          >
            Premium+
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-center py-10 text-gray-400">Cargando...</p>
      ) : error ? (
        <p className="text-red-500 text-center py-10">{error}</p>
      ) : !posts || posts.length === 0 ? (
        <p className="text-gray-500 text-center py-10">No hay posts todavía.</p>
      ) : (
        <div className="space-y-5">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} currentUserId={currentUserId} />
          ))}
        </div>
      )}

      {upgradeError && (
        <p className="text-red-500 text-center py-4">{upgradeError}</p>
      )}

      {showSlideModal && selectedTier && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
          <div className="w-full max-w-md bg-gray-900 rounded-t-3xl p-6 animate-slide-up">
            <h2 className="text-xl font-bold text-white mb-4">
              Beneficios de {selectedTier}
            </h2>

            <ul className="text-gray-200 mb-6 list-disc list-inside space-y-2">
              {selectedTier === "premium" && (
                <>
                  <li>Tips ilimitados</li>
                  <li>Boost 5 veces por semana</li>
                  <li>1 WLD por referido</li>
                  <li>Posts hasta 4.000 caracteres</li>
                  <li>Badge Premium</li>
                  <li>Prioridad media en el feed</li>
                  <li>Solo quedan {slotsLeft} slots disponibles</li>
                </>
              )}

              {selectedTier === "premium+" && (
                <>
                  <li>Todo lo de Premium</li>
                  <li>Tips con +10%</li>
                  <li>Boost ilimitado</li>
                  <li>Posts hasta 10.000 caracteres</li>
                  <li>Contenido exclusivo</li>
                  <li>Badge Premium+ dorado</li>
                  <li>Prioridad máxima en el feed</li>
                  <li>Solo quedan {slotsLeft} slots disponibles</li>
                </>
              )}
            </ul>

            <p className="text-white text-center mb-4">
              Precio: {price} WLD
            </p>

            <div className="flex gap-4">
              <button
                onClick={cancelUpgrade}
                className="flex-1 py-3 bg-gray-700 text-white rounded-2xl font-bold"
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
