import React, { useState } from "react";
import Inbox from "./Inbox";
import ChatRoom from "./ChatRoom";

const ChatPage = ({ currentUserId }: { currentUserId: string | null }) => {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [otherUserId, setOtherUserId] = useState<string | null>(null); // <<< FIX INSERTADO

  const openChat = (convId: string, otherId: string) => {
    setConversationId(convId);
    setOtherUserId(otherId); // <<< FIX INSERTADO
  };

  return (
    <div className="h-screen flex flex-col bg-black text-white">
      {conversationId ? (
        <ChatRoom
          conversationId={conversationId}
          currentUserId={currentUserId}
          otherUserId={otherUserId} // <<< FIX INSERTADO
        />
      ) : (
        <Inbox
          currentUserId={currentUserId}
          openChat={openChat} // <<< FIX INSERTADO
        />
      )}
    </div>
  );
};

export default ChatPage;
