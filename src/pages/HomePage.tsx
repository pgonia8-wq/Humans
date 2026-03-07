Dame el Postcard corregido completo,
Acá tienes el HomePage para modificar .orden....
import React, { useEffect, useState, useRef, useCallback, useContext } from "react";
import { supabase } from "../supabaseClient";
import PostCard from "../components/PostCard.tsx";
import ActionButton from "../components/ActionButton";
import { ThemeContext } from "../lib/ThemeContext";
import ProfileModal from "../components/ProfileModal.tsx";
import { useUserBalance } from "../lib/useUserBalance";

interface Post {
id: string;
content?: string;
timestamp: string;
profile?: {
username?: string;
avatar_url?: string;
is_premium?: boolean;
tier?: 'free' | 'basic' | 'premium' | 'premium+';
};
user_id?: string;
likes?: number;
comments?: number;
reposts?: number;
edited_at?: string;
is_exclusive?: boolean;
[key: string]: any;
}

const PAGE_SIZE = 5;

const HomePage = (props: { userId: string | null }) => {
const { userId } = props;

const [posts, setPosts] = useState<Post[]>([]);
const [loading, setLoading] = useState<boolean>(true);
const [error, setError] = useState<string | null>(null);

const [page, setPage] = useState<number>(0);
const [hasMore, setHasMore] = useState<boolean>(true);

const [userTier, setUserTier] = useState<'free' | 'basic' | 'premium' | 'premium+'>('free');

const [showNewPostModal, setShowNewPostModal] = useState(false);
const [newPostContent, setNewPostContent] = useState('');

const [showProfileModal, setShowProfileModal] = useState(false);

const { theme } = useContext(ThemeContext);

const containerRef = useRef<HTMLDivElement>(null);

const currentUserId = userId;

const maxChars =
userTier === 'premium+'
? 10000
: userTier === 'premium'
? 4000
: 280;

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

console.log("[HOME] userId recibido desde App.tsx:", userId);  

if (userId) {  

  const fetchTier = async () => {  

    const { data: profile } = await supabase  
      .from('profiles')  
      .select('tier')  
      .eq('id', userId)  
      .single();  

    setUserTier(profile?.tier || 'free');  

  };  

  fetchTier();  

}  

fetchPosts(true);

}, [fetchPosts, userId]);

useEffect(() => {

const handleScroll = () => {  

  if (!containerRef.current) return;  

  const { scrollTop, scrollHeight, clientHeight } = containerRef.current;  

  if (scrollTop + clientHeight >= scrollHeight - 100) {  

    fetchPosts();  

  }  

};  

containerRef.current?.addEventListener("scroll", handleScroll);  

return () =>  
  containerRef.current?.removeEventListener("scroll", handleScroll);

}, [fetchPosts]);

const handleRefresh = () => fetchPosts(true);

const handleCreatePost = async () => {

if (!newPostContent.trim()) {  

  alert("Escribe algo antes de publicar");  
  return;  

}  

if (!currentUserId) {  

  alert("No se encontró tu ID (nullifier_hash). Verifica con World ID primero o recarga la app.");  
  return;  

}  

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

<div  
  ref={containerRef}  
  className={`min-h-screen overflow-y-auto antialiased ${  
    theme === 'dark'  
      ? 'bg-black text-white'  
      : 'bg-white text-black'  
  }`}  
  style={{ overflowX: "hidden" }}  
>  

  {/* HEADER */}  

  <header  
    className={`sticky top-0 z-20 w-full px-4 py-3 flex items-center justify-between border-b shadow-lg ${  
      theme === 'dark'  
        ? 'border-white/10 bg-black/80 shadow-black/40'  
        : 'border-black/10 bg-white/80 shadow-black/10'  
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
        className="px-5 py-2 bg-gradient-to-r from-gray-800 to-gray-700 hover:from-gray-700 hover:to-gray-600 rounded-full shadow-md shadow-black/30 text-sm sm:text-base"  
      />  

      <button  
        onClick={() => (window.location.href = '/chat')}  
        className="px-5 py-2 bg-gradient-to-r from-indigo-700 to-purple-700 hover:from-indigo-600 hover:to-purple-600 rounded-full shadow-md shadow-black/30 text-sm sm:text-base font-medium"  
      >  
        Chat  
      </button>  

    </div>  

    <div className="flex items-center gap-3 sm:gap-4">  

      <div className="relative cursor-pointer">  

        <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-lg shadow-inner">  
          🔔  
        </div>  

        <span className="absolute -top-1 -right-1 bg-red-600 text-xs rounded-full px-1.5 py-0.5">  
          3  
        </span>  

      </div>  

      <div  
        className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center font-bold cursor-pointer shadow-md ring-1 ring-white/10"  
        onClick={() => setShowProfileModal(true)}  
      >  
        H  
      </div>  

    </div>  

  </header>  

  {/* REFRESH */}  

  <div  
    className="text-center py-4 text-gray-400 text-sm flex items-center justify-center gap-2 cursor-pointer"  
    onClick={handleRefresh}  
  >  
    Tirar para refrescar  
  </div>  

  {/* MODAL NUEVO POST */}  

  {showNewPostModal && (  

    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 px-3">  

      <div className="bg-gray-900/95 backdrop-blur-xl rounded-3xl p-6 w-full max-w-lg border border-white/10 shadow-2xl shadow-black/60">  

        <h2 className="text-xl font-bold mb-4 text-white">  
          Nuevo Post  
        </h2>  

        <textarea  
          value={newPostContent}  
          onChange={(e) =>  
            e.target.value.length <= maxChars &&  
            setNewPostContent(e.target.value)  
          }  
          className="w-full bg-black border border-gray-700 rounded-xl p-4 min-h-[140px] text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"  
          placeholder="¿Qué estás pensando?"  
          maxLength={maxChars}  
        />  

        <div className="flex justify-between mt-4 text-sm text-gray-400">  

          <span>  
            {newPostContent.length} / {maxChars}  
          </span>  

          <div className="flex gap-3">  

            <button  
              onClick={() => setShowNewPostModal(false)}  
              className="px-5 py-2 bg-gray-800 rounded-full shadow-md shadow-black/30"  
            >  
              Cancelar  
            </button>  

            <button  
              onClick={handleCreatePost}  
              className="px-6 py-2 bg-purple-600 rounded-full font-medium shadow-md shadow-black/30"  
            >  
              Publicar  
            </button>  

          </div>  

        </div>  

      </div>  

    </div>  

  )}  

  {/* PROFILE MODAL */}  

  {showProfileModal && (  

    <ProfileModal  
      currentUserId={currentUserId}  
      onClose={() => setShowProfileModal(false)}  
      showUpgradeButton={userTier === 'free'}  
    />  

  )}  

  {/* FEED */}  

  <main className="w-full px-2 py-6 flex justify-center">  

    <div className="w-full max-w-3xl border border-white/10 rounded-3xl overflow-hidden space-y-5 p-4 bg-black/20 backdrop-blur-md">  

      {loading && posts.length === 0 ? (  

        <div className="space-y-5">  

          {Array.from({ length: PAGE_SIZE }).map((_, i) => (  

            <div  
              key={i}  
              className="bg-gray-800/60 backdrop-blur-md rounded-2xl p-4 animate-pulse space-y-4 border border-white/10"  
            >  

              <div className="flex items-center gap-3">  

                <div className="w-10 h-10 rounded-full bg-gray-700/70" />  

                <div className="space-y-2 flex-1">  

                  <div className="h-4 bg-gray-700/70 rounded w-3/4" />  

                  <div className="h-3 bg-gray-700/70 rounded w-1/2" />  

                </div>  

              </div>  

              <div className="space-y-2">  

                <div className="h-4 bg-gray-700/70 rounded w-full" />  

                <div className="h-4 bg-gray-700/70 rounded w-5/6" />  

              </div>  

            </div>  

          ))}  

        </div>  

      ) : error ? (  

        <p className="text-red-500 text-center py-10 px-2">  
          {error}  
        </p>  

      ) : posts.length === 0 ? (  

        <p className="text-gray-500 text-center py-10 px-2">  
          No hay posts todavía.  
        </p>  

      ) : (  

        <div className="space-y-5">  

          {posts.map((post) => (  
            <PostCard  
              key={post.id}  
              post={post}  
              currentUserId={currentUserId}  
            />  
          ))}  

        </div>  

      )}  

      {loading && posts.length > 0 && (  

        <p className="text-gray-500 text-center py-6 mt-4">  
          Cargando más...  
        </p>  

      )}  

    </div>  

  </main>  

</div>

);

};

export default HomePage;
