import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

const ChatRoom: React.FC<{ conversationId: string; currentUserId: string }> = ({
  conversationId,
  currentUserId,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    const fetchMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      setMessages(data || []);
    };

    fetchMessages();

    const channel = supabase
      .channel("realtime-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: currentUserId,
      content: newMessage,
    });

    setNewMessage("");
  };

  return (
    <div className="flex flex-col h-full border p-2 rounded bg-white">
      <div className="flex-1 overflow-y-auto mb-2 space-y-1">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`p-2 rounded max-w-xs ${
              m.sender_id === currentUserId
                ? "bg-purple-200 ml-auto"
                : "bg-gray-200"
            }`}
          >
            {m.content}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          className="flex-1 px-2 py-1 border rounded"
          placeholder="Escribe un mensaje"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
        />
        <button
          onClick={sendMessage}
          className="px-4 py-1 bg-purple-500 text-white rounded"
        >
          Enviar
        </button>
      </div>
    </div>
  );
};

export default ChatRoom;
