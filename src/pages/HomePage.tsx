import React, { useEffect, useState, useRef, useCallback, useContext } from "react";
import { supabase } from "../supabaseClient";
import FeedPage from './FeedPage';
import { ThemeContext } from "../lib/ThemeContext";
import ProfileModal from "../components/ProfileModal";
import ActionButton from "../components/ActionButton";

const PAGE_SIZE = 8;

const HomePage = ({ userId }: { userId: string | null }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [profile, setProfile] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [newPostContent, setNewPostContent] = useState("");
  const { theme } = useContext(ThemeContext);

  const containerRef = useRef(null);

  const maxChars = profile?.tier === "premium+" ? 10000 : profile?.tier === "premium" ? 4000 : 280;

  const fetchPosts = useCallback(async (reset = false) => {
    if (!hasMore && !reset) return;
    try {
      setLoading(true);
      const from = reset ? 0 : page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .order("timestamp", { ascending: false })
        .range(from, to);

      if (error) throw error;

      const newPosts = data || [];
      setPosts((prev) => (reset ? newPosts : [...prev, ...newPosts]));
      setHasMore(newPosts.length === PAGE_SIZE);
      if (reset) setPage(1);
      else setPage((prev) => prev + 1);
    } catch (err: any) {
      console.error("Error fetching posts:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, hasMore]);

  useEffect(() => {
    console.log("[HOME] userId recibido:", userId);

    if (userId) {
      const fetchProfile = async () => {
        try {
          const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", userId);

          if (error) {
            console.error("[HOME] Error al cargar perfil:", error);
            setError("No se pudo cargar tu perfil");
          } else {
            // data es array → tomamos el primero o null
            const profileData = data?.[0] || null;
            console.log("[HOME] Profile cargado:", profileData);
            setProfile(profileData);
          }
        } catch (err) {
          console.error("[HOME] Excepción en fetchProfile:", err);
          setError("Error al cargar perfil");
        }
      };
      fetchProfile();
    }

    fetchPosts(true);
  }, [userId, fetchPosts]);

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

  const handleRefresh = () => fetchPosts(true);

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) {
      alert("Escribe algo antes de publicar");
      return;
    }

    if (!userId) {
      alert("No se encontró tu ID. Verifica con World ID primero.");
      return;
    }

    console.log("[POST] Publicando con userId:", userId);

    try {
      const { error: insertError } = await supabase
        .from('posts')
        .insert({
          user_id: userId,
          content: newPostContent.trim(),
          timestamp: new Date().toISOString(),
          deleted_flag: false,
          visibility_score: 1
        });

      if (insertError) throw insertError;

      alert("¡Post publicado correctamente!");
      setShowNewPostModal(false);
      setNewPostContent('');
      fetchPosts(true);
    } catch (err: any) {
      console.error("[POST] Error:", err);
      alert("Error al publicar: " + err.message);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`min-h-screen overflow-y-auto antialiased ${theme === 'dark' ? 'bg-black text-white' : 'bg-white text-black'}`}
      style={{ overflowX: "hidden" }}
    >
      {/* Header */}
      <header
        className={`sticky top-0 z-20 w-full px-4 py-3 flex items-center justify-between border-b ${
          theme === 'dark' ? 'border-white/10 bg-black/90' : 'border-black/10 bg-white/90'
        } backdrop-blur-xl`}
      >
        <img
          src="/logo.png"
          alt="Humans"
          className="w-11 h-11 object-contain drop-shadow-md"
        />

        <div className="flex gap-3">
          <ActionButton
            label="Post"
            onClick={() => setShowNewPostModal(true)}
            className={`px-5 py-2 bg-gradient-to-r from-gray-800 to-gray-700 hover:from-gray-700 hover:to-gray-600 rounded-full shadow-lg shadow-black/40 text-sm sm:text-base`}
          />

          <button
            onClick={() => (window.location.href = '/chat')}
            className={`px-5 py-2 bg-gradient-to-r from-indigo-700 to-purple-700 hover:from-indigo-600 hover:to-purple-600 rounded-full shadow-lg shadow-black/40 text-sm sm:text-base font-medium`}
          >
            Chat
          </button>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <div className="relative cursor-pointer">
            <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-lg shadow-inner">
              🔔
            </div>
            <span className="absolute -top-1 -right-1 bg-red-600 text-xs rounded-full px-1.5 py-0.5">3</span>
          </div>
          <div
            className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center font-bold cursor-pointer shadow-md ring-1 ring-white/10"
            onClick={() => setShowProfileModal(true)}
          >
            H
          </div>
        </div>
      </header>

      {/* Pull to refresh */}
      <div
        className="text-center py-4 text-gray-400 text-sm flex items-center justify-center gap-2 cursor-pointer"
        onClick={handleRefresh}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Tirar para refrescar
      </div>

      {/* Feed completo */}
      <main className="w-full px-2 py-6 flex justify-center">
        <FeedPage 
          posts={posts}
          loading={loading}
          error={error}
          currentUserId={userId}
          userTier={profile?.tier || 'free'}
        />
      </main>

      {/* Modal Nuevo Post */}
      {showNewPostModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-2">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-lg border border-white/10">
            <h2 className="text-xl font-bold mb-4 text-white">Nuevo Post</h2>
            <textarea
              value={newPostContent}
              onChange={(e) => e.target.value.length <= maxChars && setNewPostContent(e.target.value)}
              className="w-full bg-black border border-gray-700 rounded-xl p-4 min-h-[140px] text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
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
      {showProfileModal && (
        <ProfileModal
          currentUserId={userId}
          onClose={() => setShowProfileModal(false)}
          showUpgradeButton={profile?.tier === 'free'}
        />
      )}
    </div>
  );
};

export default HomePage;
