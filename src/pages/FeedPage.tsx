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

const FeedPage: React.FC<FeedPageProps> = ({ posts, loading, error, currentUserId, userTier }) => {
  const [showUpgradeOptions, setShowUpgradeOptions] = useState(false);
  const [selectedTier, setSelectedTier] = useState<"premium" | "premium+" | null>(null);
  const [showSlideModal, setShowSlideModal] = useState(false);
  const [loadingUpgrade, setLoadingUpgrade] = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  const [price, setPrice] = useState<number>(0);
  const [slotsLeft, setSlotsLeft] = useState<number>(0);

  useEffect(() => {
    if (selectedTier) {
      const fetchPriceAndSlots = async () => {
        const { count } = await supabase
          .from("upgrades")
          .select("*", { count: "exact" })
          .eq("tier", selectedTier);

        const limit = selectedTier === "premium" ? 10000 : 3000;
        setSlotsLeft(limit - (count || 0));
        setPrice(count < limit ? (selectedTier === "premium" ? 10 : 15) : (selectedTier === "premium" ? 20 : 35));
      };
      fetchPriceAndSlots();
    }
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
    console.log("[UPGRADE] Iniciando upgrade para:", selectedTier);

    try {
      // Paso 1: Inicializar en backend (crea intención)
      const initRes = await fetch("/api/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "initiate", userId: currentUserId, tier: selectedTier }),
      });

      if (!initRes.ok) {
        const text = await initRes.text();
        throw new Error(`Error al iniciar: ${text}`);
      }

      const { paymentId } = await initRes.json();
      console.log("[UPGRADE] PaymentId obtenido:", paymentId);

      // Paso 2: Pago real con MiniKit
      const payRes = await MiniKit.commandsAsync.pay({
        amount: price,
        currency: 'WLD',
        recipient: '0x...TU_WALLET_APP',
        reference: paymentId,  // opcional, para correlacionar
      });

      console.log("[UPGRADE] Pago respuesta:", payRes);

      if (payRes.status !== "success") {
        throw new Error("Pago cancelado o fallido");
      }

      const transactionId = payRes.transactionId;

      // Paso 3: Confirmar en backend (verifica tx on chain)
      const confirmRes = await fetch("/api/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm", userId: currentUserId, tier: selectedTier, transactionId }),
      });

      if (!confirmRes.ok) {
        const text = await confirmRes.text();
        throw new Error(`Error al confirmar: ${text}`);
      }

      const data = await confirmRes.json();
      if (!data.success) throw new Error(data.error || "Error al procesar upgrade");

      alert(`¡Upgrade a ${selectedTier} exitoso! Precio: ${price} WLD. Tu referral token: ${data.referralToken}`);
      setUserTier(selectedTier);
      cancelUpgrade();
    } catch (err: any) {
      console.error("[UPGRADE] Error completo:", err);
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

      {/* Opciones */}
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

      {/* Slide Modal */}
      {showSlideModal && selectedTier && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
          <div className="w-full max-w-md bg-gray-900 rounded-t-3xl p-6 animate-slide-up">
            <h2 className="text-xl font-bold text-white mb-4">Beneficios de {selectedTier}</h2>
            <ul className="text-gray-200 mb-6 list-disc list-inside space-y-2">
              {selectedTier === "premium" && (
                <>
                  <li>Tips ilimitados</li>
                  <li>Boost 5 veces por semana (extra Boost pagando 5 WLD ilimitados)</li>
                  <li>1 WLD por cada referido que se registre</li>
                  <li>Posts hasta 4.000 caracteres</li>
                  <li>Badge Premium visible</li>
                  <li>Prioridad media en el feed</li>
                  <li>Invita amigos y gana WLD (comparte tu referral token)</li>
                  <li>Solo premium pueden ver respuestas premium</li>
                  <li>Prueba primera semana gratis (limitada a primeros 100 usuarios)</li>
                  <li>Solo quedan {slotsLeft} slots disponibles</li>
                </>
              )}
              {selectedTier === "premium+" && (
                <>
                  <li>Todo lo de Premium</li>
                  <li>Tips con +10% de bonificación</li>
                  <li>Boost ilimitado (extra Boost pagando 5 WLD ilimitados)</li>
                  <li>Posts hasta 10.000 caracteres</li>
                  <li>Contenido exclusivo (solo premium+)</li>
                  <li>Badge Premium+ dorado</li>
                  <li>Prioridad máxima en el feed</li>
                  <li>Recompensa por engagement (0.5 WLD / 100 likes)</li>
                  <li>Invita amigos y gana WLD (comparte tu referral token)</li>
                  <li>Premium+ pueden ocultar likes</li>
                  <li>Prueba primera semana gratis (limitada a primeros 50 usuarios)</li>
                  <li>Solo quedan {slotsLeft} slots disponibles</li>
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
    </div>
  );
};

export default FeedPage;
