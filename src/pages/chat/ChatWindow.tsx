import React, { useEffect, useState, useRef } from "react";
import { supabase } from "../../supabaseClient";

interface ChatWindowProps {
  currentUserId: string;
  otherUserId: string;
  onBack: () => void;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  currentUserId,
  otherUserId,
  onBack
}) => {

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");

  const bottomRef = useRef<HTMLDivElement | null>(null);

  const conversationId =
    [currentUserId, otherUserId].sort().join("-");

  /* --------------------------------
     Scroll automático
  -------------------------------- */

  const scrollBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  /* --------------------------------
     Cargar mensajes iniciales
  -------------------------------- */

  useEffect(() => {

    loadMessages();

  }, []);

  const loadMessages = async () => {

    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (data) {

      setMessages(data);
      setTimeout(scrollBottom, 100);

    }
  };

  /* --------------------------------
     Realtime subscription
  -------------------------------- */

  useEffect(() => {

    const channel = supabase
      .channel("chat-" + conversationId)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {

          const msg = payload.new as Message;

          setMessages(prev => [...prev, msg]);

          setTimeout(scrollBottom, 100);

        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };

  }, []);

  /* --------------------------------
     Enviar mensaje
  -------------------------------- */

  const sendMessage = async () => {

    if (!newMessage.trim()) return;

    await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        receiver_id: otherUserId,
        content: newMessage
      });

    setNewMessage("");

  };

  /* --------------------------------
     Marcar como leído
  -------------------------------- */

  useEffect(() => {

    supabase
      .from("messages")
      .update({ read_flag: true })
      .eq("conversation_id", conversationId)
      .eq("receiver_id", currentUserId)
      .eq("read_flag", false);

  }, []);

  /* --------------------------------
     UI
  -------------------------------- */

  return (

    <div className="flex flex-col h-full">

      {/* Header */}

      <div className="flex justify-between items-center mb-3">

        <button
          onClick={onBack}
          className="text-gray-400 hover:text-white"
        >
          ← Volver
        </button>

        <div className="text-white font-semibold">
          Chat
        </div>

        <div></div>

      </div>

      {/* Mensajes */}

      <div className="flex-1 overflow-y-auto space-y-2 mb-3">

        {messages.map(msg => (

          <div
            key={msg.id}
            className={`flex ${
              msg.sender_id === currentUserId
                ? "justify-end"
                : "justify-start"
            }`}
          >

            <div
              className={`px-3 py-2 rounded-xl max-w-[70%] text-sm ${
                msg.sender_id === currentUserId
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-white"
              }`}
            >
              {msg.content}
            </div>

          </div>

        ))}

        <div ref={bottomRef} />

      </div>

      {/* Input */}

      <div className="flex gap-2">

        <input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Escribe un mensaje..."
          className="flex-1 p-2 rounded bg-gray-800 text-white focus:outline-none"
        />

        <button
          onClick={sendMessage}
          className="bg-blue-600 px-4 rounded text-white"
        >
          Enviar
        </button>

      </div>

    </div>

  );
};

export default ChatWindow;
