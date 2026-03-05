import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';

const ChatRoom: React.FC<{ roomId: string }> = ({ roomId }) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });

      setMessages(data || []);
    };

    fetchMessages();

    const channel = supabase
      .channel('realtime-chat')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          if (payload.new.room_id === roomId) {
            setMessages((prev) => [...prev, payload.new]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  const sendMessage = async () => {
    const { data } = await supabase.auth.getUser();
    const user = data.user;

    if (!newMessage || !user) return;

    await supabase.from('chat_messages').insert({
      room_id: roomId,
      user_id: user.id,
      content: newMessage,
    });

    setNewMessage('');
  };

  return (
    <div className="flex flex-col h-96 border p-2 rounded bg-white">
      <div className="flex-1 overflow-y-auto mb-2 space-y-1">
        {messages.map((m) => (
          <div key={m.id} className="p-1 rounded bg-gray-100">
            <strong>{m.user_id}:</strong> {m.content}
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
