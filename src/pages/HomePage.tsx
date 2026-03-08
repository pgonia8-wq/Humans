import React, { useEffect, useState, useRef, useCallback, useContext } from "react";
import { supabase } from "../supabaseClient";
import FeedPage from './FeedPage';
import { ThemeContext } from "../lib/ThemeContext";
import ProfileModal from "../components/ProfileModal";
import ActionButton from "../components/ActionButton";

const PAGE_SIZE = 8;

const HomePage = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [userTier, setUserTier] = useState<"free" | "basic" | "premium" | "premium+">("free");
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [newPostContent, setNewPostContent] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const { theme } = useContext(ThemeContext);
  const containerRef = useRef<HTMLDivElement>(null);

  const maxChars = userTier === "premium+" ? 10000 : userTier === "premium" ? 4000 : 280;

  // ----------- FETCH POSTS -----------
  const fetchPosts = useCallback(async (reset = false) => {
    if (!hasMore && !reset) return;
    try {
      setLoading(true);
      const from = reset ? 0 : page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      console.log("[HOME] fetchPosts:", { from, to, currentUserId });

      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .order("timestamp", { ascending: false })
        .range(from, to);

      if (error) throw error;

      const newPosts = data || [];
      setPosts((prev) => (reset ? newPosts : [...prev, ...newPosts]));
      setHasMore(newPosts.length === PAGE_SIZE);
      setPage(reset ? 1 : page + 1);
    } catch (err: any) {
      console.error("[HOME] Error fetching posts:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, hasMore, currentUserId]);

  // ----------- FETCH USERID + TIER -----------
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // 1️⃣ Intentamos obtener el último nullifier_hash de world_id_proofs
        const { data: proofs, error: proofError } = await supabase
          .from("world_id_proofs")
          .select("nullifier_hash")
          .order("timestamp", { ascending: false })
          .limit(1)
          .single();

        if (proofError) {
          console.warn("[HOME] No se encontró nullifier_hash, buscando en profiles", proofError);
        }

        const userIdFromProof = proofs?.nullifier_hash || null;
        setCurrentUserId(userIdFromProof);

        if (!userIdFromProof) return;

        // 2️⃣ Obtenemos el tier desde profiles
        const { data: profile, error: tierError } = await supabase
          .from('profiles')
          .select('tier')
          .eq('id', userIdFromProof)
          .single();

        if (tierError) {
          console.error("[HOME] Error al obtener tier:", tierError);
        } else {
          console.log("[HOME] Tier obtenido:", profile?.tier);
          setUserTier(profile?.tier || 'free');
        }

        // 3️⃣ Cargamos posts
        fetchPosts(true);

      } catch (err: any) {
        console.error("[HOME] Error fetchUserData:", err);
      }
    };

    fetchUserData();
  }, []);

  // ----------- SCROLL INFINITO -----------
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 100) {
        fetchPosts();
      }
    };
    containerRef.current?.addEventListener("scroll", handleScroll);
    return () => containerRef.current?.removeEventListener("scroll", handleScroll);
  }, [fetchPosts]);

  // ----------- REFRESH / NUEVO POST -----------
  const handleRefresh = () => fetchPosts(true);

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) {
      alert("Escribe algo antes de publicar");
      return;
    }
    if (!currentUserId) {
      alert("No se encontró tu ID. Verifica con World ID primero o recarga la app.");
      return;
    }

    console.log("[POST] Publicando con currentUserId:", currentUserId);

    try {
      const { data: inserted, error: insertError } = await supabase
        .from('posts')
        .insert({
          user_id: currentUserId,
          content: newPostContent.trim(),
          timestamp: new Date().toISOString(),
          deleted_flag: false,
          visibility_score: 1
        })
        .select();

      console.log("[POST] Resultado insert:", { inserted, insertError });

      if (insertError) throw insertError;

      alert("¡Post publicado correctamente!");
      setShowNewPostModal(false);
      setNewPostContent('');
      fetchPosts(true);

    } catch (err: any) {
      console.error("[POST] Error al publicar:", err);
      alert("Error al publicar: " + (err.message || "Intenta de nuevo"));
    }
  };

  return (
    <div ref={containerRef} className={`min-h-screen overflow-y-auto antialiased ${theme === 'dark' ? 'bg-black text-white' : 'bg-white text-black'}`}>
      
      {/* Header y botones */}
      <header className={`sticky top-0 z-20 w-full px-4 py-3 flex items-center justify-between border-b ${theme === 'dark' ? 'border-white/10 bg-black/90' : 'border-black/10 bg-white/90'} backdrop-blur-xl`}>
        <img src="/logo.png" alt="Logo" className="w-11 h-11 object-contain drop-shadow-md" />
        <div className="flex gap-3">
          <ActionButton label="Post" onClick={() => setShowNewPostModal(true)} />
          <button onClick={() => (window.location.href = '/chat')} className="px-5 py-2 bg-indigo-700 text-white rounded-full">Chat</button>
        </div>
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center font-bold cursor-pointer shadow-md ring-1 ring-white/10" onClick={() => setShowProfileModal(true)}>H</div>
        </div>
      </header>

      {/* Pull to refresh */}
      <div className="text-center py-4 text-gray-400 text-sm flex items-center justify-center gap-2 cursor-pointer" onClick={handleRefresh}>
        ⟳ Tirar para refrescar
      </div>

      {/* Feed */}
      <main className="w-full px-2 py-6 flex justify-center">
        <FeedPage posts={posts} loading={loading} error={error} currentUserId={currentUserId} userTier={userTier} />
      </main>

      {/* Modal Nuevo Post */}
      {showNewPostModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-2">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-lg border border-white/10">
            <h2 className="text-xl font-bold mb-4 text-white">Nuevo Post</h2>
            <textarea
              value={newPostContent}
              onChange={(e) => e.target.value.length <= maxChars && setNewPostContent(e.target.value)}
              className="w-full bg-black border border-gray-700 rounded-xl p-4 min-h-[140px] text-white"
              placeholder="¿Qué estás pensando?"
              maxLength={maxChars}
            />
            <div className="flex justify-between mt-4 text-sm text-gray-400">
              <span>{newPostContent.length} / {maxChars}</span>
              <div className="flex gap-3">
                <button onClick={() => setShowNewPostModal(false)} className="px-5 py-2 bg-gray-800 rounded-full">Cancelar</button>
                <button onClick={handleCreatePost} className="px-6 py-2 bg-purple-600 rounded-full font-medium">Publicar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Perfil */}
      {showProfileModal && <ProfileModal currentUserId={currentUserId} onClose={() => setShowProfileModal(false)} showUpgradeButton={userTier === 'free'} />}
    </div>
  );
};

export default HomePage;
