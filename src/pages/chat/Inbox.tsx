import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";

interface InboxProps {
  currentUserId: string | null;
  openChat: (conversationId: string, otherUserId: string) => void;
}

const Inbox: React.FC<InboxProps> = ({ currentUserId, openChat }) => {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUserId) return; // <<< FIX: no fetch si no hay ID
    load();
  }, [currentUserId]);

  const load = async () => {
    if (!currentUserId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("conversations_with_last_message")
        .select("*")
        .or(`user1_id.eq.${currentUserId},user2_id.eq.${currentUserId}`)
        .order("last_message_time", { ascending: false });

      if (error) throw error;

      setConversations(data || []);
    } catch (err: any) {
      console.error("[INBOX] Error cargando conversaciones:", err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-400">Cargando conversaciones...</p>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-400">No hay conversaciones aún</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-2">
      {conversations.map((c) => {
        const otherId = c.user1_id === currentUserId ? c.user2_id : c.user1_id;

        return (
          <div
            key={c.id}
            onClick={() => openChat(c.id, otherId)} // <<< FIX INSERTADO
            className="flex items-center justify-between p-3 bg-gray-900 rounded cursor-pointer hover:bg-gray-800"
          >
            <div>
              <div className="font-bold">{otherId.slice(0, 10)}</div>
              <div className="text-sm text-gray-400">{c.last_message}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Inbox;
