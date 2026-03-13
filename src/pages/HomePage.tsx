import React, { useEffect, useState, useRef, useCallback, useContext } from "react";
import { supabase } from "../supabaseClient";
import FeedPage from "./FeedPage";
import { ThemeContext } from "../lib/ThemeContext";
import ProfileModal from "../components/ProfileModal";
import ActionButton from "../components/ActionButton";
import Inbox from "./chat/Inbox";

const [newPostImage, setNewPostImage] = useState<File | null>(null);
const [imagePreview, setImagePreview] = useState<string | null>(null);

const PAGE_SIZE = 8;

const HomePage = ({ userId }: { userId: string | null }) => {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showNewPostModal, setShowNewPostModal] = useState(false);

  const [showInbox, setShowInbox] = useState(false);

  const [newPostContent, setNewPostContent] = useState("");

  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [newMessage, setNewMessage] = useState("");
  const [newMessageAttachments, setNewMessageAttachments] = useState<string[]>([]);

  // FUNCIONES DE MENSAJES
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // lógica de subir archivos va aquí
    console.log("Archivos seleccionados:", e.target.files);
  };

  const sendMessage = async () => {
    // lógica de crear mensaje en supabase + adjuntos va aquí
    console.log("Enviar mensaje con adjuntos:", newMessageAttachments);
  };

  const { theme, toggleTheme } = useContext(ThemeContext);

  const containerRef = useRef<HTMLDivElement>(null);

  const maxChars =
    profile?.tier === "premium+"
      ? 10000
      : profile?.tier === "premium"
      ? 4000
      : 280;

  /* -------------------------------------------------- */
  /* FETCH POSTS */
  /* -------------------------------------------------- */
  const fetchPosts = useCallback(async (reset = false) => {
    if (!hasMore && !reset) return;
    try {
      setLoading(true);
      const from = reset ? 0 : page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from("posts")
        .select(`
          *,
          profiles (
            id,
            username,
            avatar_url
          )
        `)
        .order("timestamp", { ascending: false })
        .range(from, to);

      if (error) throw error;

      const newPosts = data || [];
      setPosts(prev => (reset ? newPosts : [...prev, ...newPosts]));
      setHasMore(newPosts.length === PAGE_SIZE);

      if (reset) setPage(1);
      else setPage(prev => prev + 1);

    } catch (err: any) {
      console.error("Error fetching posts:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, hasMore]);

  /* -------------------------------------------------- */
  /* PROFILE */
  /* -------------------------------------------------- */
  const fetchOrCreateProfile = useCallback(async (uid: string) => {
    if (!uid) return;
    setProfileLoading(true);
    try {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", uid)
        .maybeSingle();

      if (data) {
        setProfile(data);
        setProfileLoading(false);
        return;
      }

      const res = await fetch("/api/createProfile.mjs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: uid })
      });

      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      setProfile(result.profile);

    } catch (err: any) {
      console.error("[HOME] profile error:", err);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  /* -------------------------------------------------- */
  /* INIT */
  /* -------------------------------------------------- */
  useEffect(() => {
    if (!userId) return;
    fetchOrCreateProfile(userId);
    fetchPosts(true);
  }, [userId, fetchOrCreateProfile, fetchPosts]);

  /* -------------------------------------------------- */
  /* REALTIME POSTS */
  /* -------------------------------------------------- */
  useEffect(() => {
    const channel = supabase
      .channel("realtime-posts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        payload => setPosts(prev => [payload.new, ...prev])
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "posts" },
        payload => setPosts(prev =>
          prev.map(p => (p.id === payload.new.id ? payload.new : p))
        )
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  /* -------------------------------------------------- */
  /* SCROLL INFINITO */
  /* -------------------------------------------------- */
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 150) fetchPosts();
    };

    const el = containerRef.current;
    el?.addEventListener("scroll", handleScroll);
    return () => el?.removeEventListener("scroll", handleScroll);
  }, [fetchPosts]);

  /* -------------------------------------------------- */
  /* UNREAD MESSAGES */
  /* -------------------------------------------------- */
  const loadUnread = async () => {
    if (!userId) return;

    const { data } = await supabase
      .from("conversation_unread_counts")
      .select("unread")
      .eq("receiver_id", userId);

    const total = data?.reduce((sum, r) => sum + r.unread, 0) || 0;

    setUnreadMessages(total);
    setUnreadTotal(total);
  };

  /* -------------------------------------------------- */
  /* REALTIME MENSAJES */
  /* -------------------------------------------------- */
  useEffect(() => {
    if (!userId) return;
    loadUnread();

    const channel = supabase
      .channel("messages-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${userId}`
        },
        () => setUnreadMessages(prev => prev + 1)
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [userId]);

  /* -------------------------------------------------- */
  /* CREAR POST */
  /* -------------------------------------------------- */
  const handleCreatePost = async () => {

  if (!newPostContent.trim()) {
    alert("Escribe algo antes de publicar");
    return;
  }

  if (!userId) return;

  let imageUrl = null;

  try {

    if (newPostImage) {

      const fileExt = newPostImage.name.split(".").pop();

      const fileName = `${userId}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("post-images")
        .upload(fileName, newPostImage);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("post-images")
        .getPublicUrl(fileName);

      imageUrl = data.publicUrl;
    }

    const { error } = await supabase
      .from("posts")
      .insert({
        user_id: userId,
        content: newPostContent,
        image_url: imageUrl,
        timestamp: new Date().toISOString(),
        deleted_flag: false,
        visibility_score: 1
      });

    if (error) throw error;

    setShowNewPostModal(false);
    setNewPostContent("");
    setNewPostImage(null);
    setImagePreview(null);

    fetchPosts(true);

  } catch (err:any) {

    console.error("Error creando post", err);
    alert(err.message);

  }
};
  

  /* -------------------------------------------------- */
  /* UI */
  /* -------------------------------------------------- */
  return (
  <div
    ref={containerRef}
    className={`min-h-screen overflow-y-auto ${
      theme === "dark" ? "bg-black text-white" : "bg-white text-black"
    }`}
  >
    {/* HEADER */}
    <header className="sticky top-0 z-20 w-full px-4 py-3 flex items-center justify-between border-b border-white/10 backdrop-blur-xl">
      <img src="/logo.png" className="w-11 h-11 object-contain" alt="Logo" />

      <div className="flex gap-3">
        {/* POST BUTTON */}
        <ActionButton
          label="Post"
          onClick={() => setShowNewPostModal(true)}
          className="px-5 py-2 bg-gray-800 rounded-full"
        />

        {/* MESSAGES BUTTON */}
        <div className="relative">
          <button
            onClick={() => {
              setShowInbox(true);
              setUnreadMessages(0);
            }}
            className="px-5 py-2 bg-indigo-700 rounded-full text-white"
          >
            Mensajes
          </button>
          {unreadTotal > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-600 text-xs px-1 rounded-full">
              {unreadTotal}
            </span>
          )}
        </div>

        {/* THEME */}
        <button
          onClick={toggleTheme}
          className="px-4 py-2 bg-gray-700 rounded-full"
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
      </div>

      {/* PROFILE */}
      <div
        className="w-10 h-10 rounded-full overflow-hidden bg-gray-800 cursor-pointer"
        onClick={() => setShowProfileModal(true)}
      >
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">H</div>
        )}
      </div>
    </header>

    {/* FEED */}
    <main className="w-full px-2 py-6 flex justify-center">
      <FeedPage
        posts={posts}
        loading={loading}
        error={error}
        currentUserId={userId}
        userTier={profile?.tier || "free"}
        onUpgradeSuccess={() => fetchOrCreateProfile(userId || "")}
      />
    </main>

    {/* MODAL INBOX */}
    {showInbox && userId && (
      <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center px-4">
        <div className="bg-gray-900 rounded-2xl w-full max-w-md h-[80vh] flex flex-col border border-white/10 shadow-lg">
          {/* HEADER */}
          <div className="flex items-center justify-between p-4 border-b border-white/20">
            <h2 className="text-white font-bold text-lg">Mensajes</h2>
            <button
              onClick={() => setShowInbox(false)}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          {/* MENSAJES */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <Inbox currentUserId={userId} />
          </div>

          {/* NUEVO MENSAJE / ADJUNTOS */}
          <div className="p-4 border-t border-white/20 flex flex-col gap-2">
            <textarea
              value={newMessage}
              onChange={(e) => {
                const maxChars =
                  profile?.tier === "premium+"
                    ? 10000
                    : profile?.tier === "premium"
                    ? 3000
                    : 1000; // free
                if (e.target.value.length <= maxChars) setNewMessage(e.target.value);
              }}
              className="w-full p-2 bg-gray-800 text-white rounded resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[80px]"
              placeholder="Escribe tu mensaje..."
            />
            <div className="flex items-center justify-between mt-2">
              {/* Input para adjuntos */}
              <input
              type="file"
              accept="image/*"
              onChange={(e) => {
              if (!e.target.files || !e.target.files[0]) return;

              const file = e.target.files[0];

              setNewPostImage(file);
              setImagePreview(URL.createObjectURL(file));
               }}
              />
              <span className="text-gray-400 text-sm">
                {newMessage.length} / {profile?.tier === "premium+" ? 10000 : profile?.tier === "premium" ? 3000 : 1000}
              </span>
              <button
                onClick={sendMessage}
                className="px-4 py-1 bg-purple-600 rounded-full text-white font-medium"
              >
                Enviar
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* PERFIL */}
    {showProfileModal && (
      <ProfileModal
        id={userId}
        currentUserId={userId}
        onClose={() => setShowProfileModal(false)}
        showUpgradeButton={profile?.tier === "free"}
      />
    )}

    {/* MODAL NUEVO POST */}
{showNewPostModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
    <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-3xl p-6 w-full max-w-lg border border-white/20 shadow-xl flex flex-col gap-4">
      
      {/* HEADER */}
      <h2 className="text-2xl font-bold text-white">Nuevo Post</h2>

      {/* TEXTO DEL POST */}
      <textarea
  value={newPostContent}
  onChange={(e) => {
    if (e.target.value.length <= maxChars) {
      setNewPostContent(e.target.value);
    }
  }}
  className={`w-full border rounded-xl p-4 resize-none min-h-[140px] focus:outline-none focus:ring-2 focus:ring-purple-500 ${
    theme === "dark"
      ? "bg-gray-800 border-gray-700 text-white placeholder-gray-400"
      : "bg-white border-gray-300 text-black placeholder-gray-500"
  }`}
  placeholder="¿Qué estás pensando?"
  maxLength={maxChars}
/>

      {/* SUBIDA DE IMAGEN */}
      <div className="flex flex-col gap-2">
        {newMessageAttachments[0] ? (
          <div className="relative w-40 h-40">
            <img
              src={newMessageAttachments[0]}
              alt="Preview"
              className="w-full h-full object-cover rounded-xl border border-gray-700"
            />
            <button
              onClick={() => setNewMessageAttachments([])}
              className="absolute -top-2 -right-2 bg-red-600 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold hover:bg-red-700 transition-colors"
              title="Eliminar imagen"
            >
              ✕
            </button>
          </div>
        ) : (
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                const file = e.target.files[0];
                // Guardamos en state para enviar a backend + preview
                setNewMessageAttachments([URL.createObjectURL(file)]);
              }
            }}
            className="text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700"
          />
        )}
      </div>

      {/* PIE DEL MODAL */}
      <div className="flex justify-between items-center text-sm text-gray-400">
        <span>{newPostContent.length} / {maxChars}</span>
        <div className="flex gap-3">
          <button
            onClick={() => { 
              setShowNewPostModal(false); 
              setNewPostContent("");
              setNewMessageAttachments([]);
            }}
            className="px-5 py-2 bg-gray-700 rounded-full hover:bg-gray-600 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleCreatePost}
            className="px-6 py-2 bg-purple-600 rounded-full font-medium hover:bg-purple-700 transition-colors"
          >
            Publicar
          </button>
        </div>
      </div>
    </div>
  </div>
 )}
  </div>
);
};  
  export default HomePage;
      
