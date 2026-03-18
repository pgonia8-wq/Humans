import React, { useEffect, useRef, useState } from "react";
import { supabase } from "../../supabaseClient";

interface GlobalChatRoomProps {
  currentUserId: string; // ID de Worldcoin
  roomId?: string;
}

const GlobalChatRoom: React.FC<GlobalChatRoomProps> = ({
  currentUserId,
  roomId = "premium_global_chat",
}) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  console.log("🚀 GlobalChatRoom mounted", { currentUserId, roomId });

  // --- Cargar mensajes iniciales y suscripción ---
  useEffect(() => {
    if (!currentUserId) {
      console.warn("❌ currentUserId no está definido");
      return;
    }

    const loadMessages = async () => {
      try {
        const { data, error } = await supabase
          .from("global_chat_messages")
          .select("*")
          .eq("room_id", roomId)
          .order("created_at", { ascending: true })
          .limit(50);

        if (error) {
          console.error("❌ Error cargando mensajes:", error);
        } else {
          console.log("✅ Mensajes cargados:", data?.length);
          setMessages(data || []);
        }
      } catch (err) {
        console.error("❌ Exception loadMessages:", err);
      }
    };

    loadMessages();

    const channel = supabase.channel(`global-chat-${roomId}`);

    channel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "global_chat_messages",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          console.log("📥 Nuevo mensaje recibido:", payload.new);
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .on("broadcast", { event: "typing" }, (payload) => {
        console.log("✏️ Broadcast typing:", payload);
        if (payload.payload.user !== currentUserId) {
          setTyping(true);
          setTimeout(() => setTyping(false), 2000);
        }
      })
      .subscribe();

    return () => {
      console.log("🧹 Removiendo canal", channel);
      supabase.removeChannel(channel);
    };
  }, [currentUserId, roomId]);

  // --- Scroll automático ---
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendTyping = async () => {
    if (!currentUserId) return;
    try {
      const channel = supabase.channel(`global-chat-${roomId}`);
      channel.send({
        type: "broadcast",
        event: "typing",
        payload: { user: currentUserId },
      });
    } catch (err) {
      console.error("❌ Error sendTyping:", err);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    try {
      const { error } = await supabase.from("global_chat_messages").insert({
        room_id: roomId,
        sender_id: currentUserId,
        content: newMessage.trim(),
      });
      if (error) {
        console.error("❌ Error insertando mensaje:", error);
      } else {
        setNewMessage("");
      }
    } catch (err) {
      console.error("❌ Exception sendMessage:", err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-black text-white border border-gray-800 rounded">
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((m) => (
          <div
            key={m.id || Math.random()} // fallback key
            className={m.sender_id === currentUserId ? "text-right" : "text-left"}
          >
            <span className="inline-block bg-purple-600 text-white px-3 py-1 rounded">
              {m.sender_id?.slice(0, 10)}: {m.content}
            </span>
          </div>
        ))}

        {typing && <div className="text-xs text-gray-400">Alguien está escribiendo...</div>}

        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 p-3 border-t border-gray-800 bg-gray-900">
        <input
          type="text"
          className="flex-1 bg-gray-800 px-3 py-2 rounded text-white outline-none"
          placeholder="Escribe un mensaje..."
          value={newMessage}
          onChange={(e) => {
            setNewMessage(e.target.value);
            sendTyping();
          }}
        />
        <button
          onClick={sendMessage}
          className="bg-purple-600 px-4 py-2 rounded font-medium"
        >
          Enviar
        </button>
      </div>
    </div>
  );
};

export default GlobalChatRoom;
