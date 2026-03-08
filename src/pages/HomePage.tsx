import React, { useState, useEffect } from 'react';
import PostCard from '../components/PostCard';
import { supabase } from '../supabaseClient';
import { MiniKit } from '@worldcoin/minikit-js';

const PAGE_SIZE = 8;

interface Post {
  id: string;
  content?: string;
  timestamp: string;
  profile?: {
    username?: string;
  }; : any;
}

interface FeedPageProps {
  posts: Post[];
  loading?: boolean;
  error?: string | null;
  currentUserId: string | null;
  userTier: "free" | "basic" | "premium" | "premium+";
}

const FeedPage: React.FC<FeedPageProps> = ({ posts, loading, error, currentUserId, userTier }) => {
  const = useState(false);
  const = useState<"premium" | "premium+" | null>(null);
  const = useState(false);
  const = useState(false);
  const = useState<string | null>(null);
  const = useState<number>(0);
  const = useState<number>(0);
  const = useState(false);

  useEffect(() => {
    if (selectedTier) {
      const fetchPriceAndSlots = async () => {
        try {
          const { count, error: countError } = await supabase
            .from("upgrades")
            .select("*", { count: "exact" })
            .eq("tier", selectedTier);

          if (countError) console.error("Error contando upgrades:", countError);

          const limit = selectedTier === "premium" ? 10000 : 3000;
          setSlotsLeft(limit - (count || 0));
          setPrice(count < limit ? (selectedTier === "premium" ? 10 : 15) : (selectedTier === "premium" ? 20 : 35));
        } catch (err) {
          console.error("Error en fetchPriceAndSlots:", err);
        }
      };
      fetchPriceAndSlots();
    }
  }, );

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
    console.log(" Iniciando pago para tier:", selectedTier, "precio:", price, "userId:", currentUserId);

    try {
      if (!MiniKit.isInstalled()) {
        throw new Error("MiniKit no instalado o World App no detectada");
      }

      // Quitamos el chequeo forzado — dejamos que pay intente y maneje el error si falla
      // (World App debería pedir permisos al primer pay si no están)

      const payRes = await MiniKit.commandsAsync.pay({
        amount: price,
        currency: 'WLD',
        recipient: '0x4df4a99b05945b0594db02127ad3cdffea619f4cb',
      });

      console.log(" Pago respuesta:", payRes);

      if (payRes.status !== "success") {
        if (payRes.error?.includes("insufficient") || payRes.error?.includes("funds")) {
          setShowInsufficientFunds(true);
          throw new Error("Fondos insuficientes en tu wallet");
        }
        throw new Error("Pago cancelado o fallido: " + (payRes.error || "Desconocido"));
      }

      const transactionId = payRes.transactionId;
      console.log(" txId obtenido:", transactionId);

      const res = await fetch("/api/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId, tier: selectedTier, transactionId }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Error ${res.status}: ${text}`);
      }

      const data = await res.json();
      console.log(" Backend respuesta:", data);

      if (!data.success) throw new Error(data.error || "Error al procesar upgrade");

      alert(`¡Upgrade a ${selectedTier} exitoso! Precio: ${price} WLD. Tu referral token: ${data.referralToken}`);
      // No hay setUserTier aquí — si quieres actualizarlo, hazlo desde HomePage después
      cancelUpgrade();
    } catch (err: any) {
      console.error(" Error completo:", err);
      setUpgradeError(err.message || "Error al procesar el upgrade");
    } finally {
      setLoadingUpgrade(false);
    }
  };

  return (
    <div className="flex flex-col p-4">
      {/* Botón Upgrade */}
      <div className="mb-6">
        <button
          onClick={handleUpgrade}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold shadow-lg"
        >
          Upgrade
        </button>
      </div>

      {/* Opciones de tiers */}
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

      {/* Feed */}
      {loading ? (
        <div className="space-y-5">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <div key={i} className="bg-gray-900/60 backdrop-blur-sm rounded-2xl p-4 animate-pulse space-y-4 border border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-700" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-gray-700 rounded w-3/4" />
                  <div className="h-3 bg-gray-700 rounded w-1/2" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-700 rounded w-full" />
                <div className="h-4 bg-gray-700 rounded w-5/6" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <p className="text-red-500 text-center py-10 px-2">{error}</p>
      ) : posts.length === 0 ? (
        <p className="text-gray-500 text-center py-10 px-2">No hay posts todavía.</p>
      ) : (
        <div className="space-y-5">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} currentUserId={currentUserId} />
          ))}
        </div>
      )}

      {upgradeError && <p className="text-red-500 text-center py-4 mt-4">{upgradeError}</p>}

      {/* Slide Modal de beneficios */}
      {showSlideModal && selectedTier && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
          <div className="w-full max-w-md bg-gray-900 rounded-t-3xl p-6 animate-slide-up">
            <h2 className="text-xl font-bold text-white mb-4">Beneficios de {selectedTier}</h2>
            <ul className="text-gray-200 mb-6 list-disc list-inside space-y-2">
              {selectedTier === "premium" && (
                <>
                  <li>Tips ilimitados</li>
                  <li>Boost 5 veces por semana</li>
                  <li>1 WLD por cada referido</li>
                  <li>Posts hasta 4.000 caracteres</li>
                  <li>Badge Premium</li>
                  <li>Solo quedan {slotsLeft} slots</li>
                </>
              )}
              {selectedTier === "premium+" && (
                <>
                  <li>Todo lo de Premium</li>
                  <li>Boost ilimitado</li>
                  <li>Posts hasta 10.000 caracteres</li>
                  <li>Badge Premium+ dorado</li>
                  <li>Solo quedan {slotsLeft} slots</li>
                </>
              )}
            </ul>
            <p className="text-white text-center mb-4">Precio: {price} WLD</p>
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

      {/* Alerta fondos insuficientes */}
      {showInsufficientFunds && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70">
          <div className="bg-gray-900 rounded-2xl p-8 w-full max-w-sm border border-white/10 text-center">
            <div className="text-5xl mb-4">💸</div>
            <h3 className="text-xl font-bold text-white mb-3">Fondos insuficientes</h3>
            <p className="text-gray-300 mb-6">
              No tienes suficientes WLD ({price} WLD requeridos).
            </p>
            <button
              onClick={() => setShowInsufficientFunds(false)}
              className="w-full py-3 bg-purple-600 text-white rounded-xl font-medium"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedPage;
