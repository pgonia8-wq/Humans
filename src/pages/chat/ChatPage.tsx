import React, { useState } from "react";
import Inbox from "./Inbox";
import ChatRoom from "./ChatRoom";

const ChatPage = ({ currentUserId }) => {

  const [conversationId, setConversationId] = useState(null);

  return (

    <div className="h-screen flex flex-col">

      {conversationId ? (

        <ChatRoom
          conversationId={conversationId}
          currentUserId={currentUserId}
        />

      ) : (

        <Inbox
          currentUserId={currentUserId}
          openChat={setConversationId}
        />

      )}

    </div>
  );
};

export default ChatPage;
