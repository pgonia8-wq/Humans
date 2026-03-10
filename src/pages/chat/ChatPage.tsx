import React,{useState} from "react"
import Inbox from "./Inbox"
import ChatRoom from "./ChatRoom"

const ChatPage = ({currentUserId}) => {

const [conversationId,setConversationId] = useState(null)

const openChat = (id)=>{
setConversationId(id)
}

return(

<div className="h-screen flex flex-col bg-black text-white">

{conversationId ? (

<ChatRoom
conversationId={conversationId}
currentUserId={currentUserId}
/>

):(

<Inbox
currentUserId={currentUserId}
openChat={openChat}
/>

)}

</div>

)

}

export default ChatPage
