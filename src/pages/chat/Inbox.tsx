import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import ChatWindow from "./ChatWindow";

interface InboxProps {
  currentUserId: string | null;
  onClose: () => void;
}

interface Conversation {
  id: string;
  user1_id: string;
  user2_id: string;
  last_message: string | null;
  last_message_time: string | null;
}

interface Profile {
  id: string;
  name: string;
  username: string;
  avatar_url?: string;
}

const Inbox: React.FC<InboxProps> = ({ currentUserId, onClose }) => {

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [profilesCache, setProfilesCache] = useState<Record<string, Profile>>({});
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  const [loading, setLoading] = useState(true);
  const [chatUserId, setChatUserId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);

  const [matchIds, setMatchIds] = useState<string[]>([]);

  /* -------------------------- */

  useEffect(() => {

    if (!currentUserId) return;

    loadConversations();
    loadMatches();

  }, [currentUserId]);

  /* --------------------------
     REALTIME
  -------------------------- */

  useEffect(() => {

    if (!currentUserId) return;

    const channel = supabase
      .channel("inbox-updates")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {

          const msg = payload.new as any;

          if (
            msg.receiver_id === currentUserId ||
            msg.sender_id === currentUserId
          ) {
            loadConversations();
          }

        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };

  }, [currentUserId]);

  /* --------------------------
     CONVERSACIONES
  -------------------------- */

  const loadConversations = async () => {

    if (!currentUserId) return;

    setLoading(true);

    const { data, error } = await supabase
      .from("conversations_with_last_message")
      .select("*")
      .or(`user1_id.eq.${currentUserId},user2_id.eq.${currentUserId}`)
      .order("last_message_time", { ascending: false });

    if (error) {
      console.error("[Inbox]", error.message);
      setLoading(false);
      return;
    }

    const convs = data || [];

    setConversations(convs);

    const otherIds = convs.map(c =>
      c.user1_id === currentUserId ? c.user2_id : c.user1_id
    );

    await loadProfiles(otherIds);
    await loadUnreadCounts();

    setLoading(false);

  };

  /* --------------------------
     CONTADOR NO LEÍDOS
  -------------------------- */

  const loadUnreadCounts = async () => {

    if (!currentUserId) return;

    const { data } = await supabase
      .from("conversation_unread_counts")
      .select("*")
      .eq("receiver_id", currentUserId);

    const counts: Record<string, number> = {};

    data?.forEach((row: any) => {
      counts[row.conversation_id] = row.unread;
    });

    setUnreadCounts(counts);

  };

  /* --------------------------
     MATCHES
  -------------------------- */

  const loadMatches = async () => {

    if (!currentUserId) return;

    const { data: following } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", currentUserId);

    const { data: followers } = await supabase
      .from("follows")
      .select("follower_id")
      .eq("following_id", currentUserId);

    const followingIds = following?.map(f => f.following_id) || [];
    const followerIds = followers?.map(f => f.follower_id) || [];

    const matches = followingIds.filter(id =>
      followerIds.includes(id)
    );

    setMatchIds(matches);

  };

  /* --------------------------
     PROFILES CACHE
  -------------------------- */

  const loadProfiles = async (ids: string[]) => {

    const missing = ids.filter(id => !profilesCache[id]);

    if (missing.length === 0) return;

    const { data } = await supabase
      .from("profiles")
      .select("id,name,username,avatar_url")
      .in("id", missing);

    if (!data) return;

    setProfilesCache(prev => {

      const updated = { ...prev };

      data.forEach(p => {
        updated[p.id] = p;
      });

      return updated;

    });

  };

  /* --------------------------
     SEARCH
  -------------------------- */

  const handleSearch = async (q: string) => {

    setSearchQuery(q);

    if (!q.trim()) {
      setSearchResults([]);
      return;
    }

    const { data } = await supabase
      .from("profiles")
      .select("id,name,username,avatar_url")
      .ilike("username", `%${q}%`)
      .limit(10);

    const filtered = (data || []).filter(u =>
      matchIds.includes(u.id)
    );

    setSearchResults(filtered);

  };

  /* -------------------------- */

  const openChat = (userId: string) => {
    setChatUserId(userId);
  };

  /* -------------------------- */

  const renderProfile = (id: string) => {

    const p = profilesCache[id];

    return (

      <div className="flex items-center gap-2">

        <div className="w-8 h-8 rounded-full bg-gray-600 overflow-hidden flex items-center justify-center text-white">

          {p?.avatar_url ? (
            <img
              src={p.avatar_url}
              className="w-full h-full object-cover"
            />
          ) : (
            p?.username?.[0]
          )}

        </div>

        <span className="text-white text-sm">
          {p?.username || id.slice(0,6)}
        </span>

      </div>

    );

  };

  /* -------------------------- */

  if (chatUserId && currentUserId) {

    return (
      <ChatWindow
        currentUserId={currentUserId}
        otherUserId={chatUserId}
        onBack={() => setChatUserId(null)}
      />
    );

  }

  /* -------------------------- */

  return (

    <div className="w-full h-full flex flex-col overflow-hidden">

      <div className="flex justify-between mb-3">

        <h2 className="text-white font-bold text-lg">
          Mensajes
        </h2>

        <button
          onClick={onClose}
          className="text-gray-400"
        >
          Cerrar
        </button>

      </div>

      <input
        value={searchQuery}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Buscar seguidores..."
        className="p-2 mb-3 rounded bg-gray-800 text-white"
      />

      {searchResults.map(u => (

        <div
          key={u.id}
          onClick={() => openChat(u.id)}
          className="p-2 hover:bg-gray-700 rounded cursor-pointer"
        >
          {renderProfile(u.id)}
        </div>

      ))}

      <div className="flex-1 overflow-y-auto">

        {loading ? (

          <p className="text-gray-400 text-center">
            Cargando...
          </p>

        ) : (

          conversations.map(c => {

            const otherId =
              c.user1_id === currentUserId
                ? c.user2_id
                : c.user1_id;

            const conversationId =
              [c.user1_id, c.user2_id].sort().join("-");

            const unread = unreadCounts[conversationId] || 0;

            return (

              <div
                key={c.id}
                onClick={() => openChat(otherId)}
                className="flex justify-between p-2 bg-gray-800 rounded mb-1 hover:bg-gray-700 cursor-pointer"
              >

                {renderProfile(otherId)}

                {unread > 0 && (
                  <span className="bg-red-600 text-xs px-2 rounded-full">
                    {unread}
                  </span>
                )}

              </div>

            );

          })

        )}

      </div>

    </div>

  );

};

export default Inbox;
