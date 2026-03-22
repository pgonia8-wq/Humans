import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import { createClient } from "@supabase/supabase-js";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  X,
  Send,
  Paperclip,
  Image as ImageIcon,
  Check,
  CheckCheck,
  MessageCircle,
  Smile,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Profile {
  id: string;
  username?: string;
  avatar_url?: string;
}

interface Conversation {
  otherUserId: string;
  otherProfile: Profile | null;
  lastMessage: string;
  lastMessageAt: string;
  unread: number;
}

interface DmMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  attachments?: string[];
  created_at: string;
  read: boolean;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface InboxProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
}

// ─── Supabase client ──────────────────────────────────────────────────────────
// Si ya tienes un singleton, reemplaza estas 3 líneas con:
//   import { supabase } from "../supabaseClient";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const roomId = (a: string, b: string): string =>
  [a, b].sort().join("_");

const relativeTime = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
};

const avatarGradient = (id: string): string => {
  const gradients = [
    "from-indigo-500 to-violet-600",
    "from-violet-500 to-pink-600",
    "from-blue-500 to-indigo-600",
    "from-amber-500 to-orange-600",
    "from-emerald-500 to-teal-600",
    "from-rose-500 to-pink-600",
  ];
  const idx = id.charCodeAt(0) % gradients.length;
  return gradients[idx];
};

// ─── Emoji list ───────────────────────────────────────────────────────────────

const EMOJIS = [
  "😀","😂","😍","🥰","😎","🤔","😭","🔥","❤️","👍",
  "🙌","🎉","✨","💯","😅","🤣","😊","🥹","😏","🤩",
  "😢","😡","🤯","😴","🥳","🤗","😱","🫡","💀","🙏",
  "👏","💪","🫶","🤝","✌️","🖤","💜","💙","💚","💛",
  "🍕","🍔","🍦","🎮","🎵","🏆","🌙","⭐","🌈","🦋",
];

// ─── Avatar ───────────────────────────────────────────────────────────────────

const Avatar: React.FC<{ profile: Profile | null; size?: "sm" | "md" | "lg" }> = ({
  profile,
  size = "md",
}) => {
  const sizeClass =
    size === "sm"
      ? "w-9 h-9 text-sm"
      : size === "lg"
      ? "w-14 h-14 text-xl"
      : "w-11 h-11 text-base";

  const initials = profile?.username
    ? profile.username.slice(0, 2).toUpperCase()
    : "?";

  if (profile?.avatar_url) {
    return (
      <img
        src={profile.avatar_url}
        alt={profile.username || "user"}
        className={`${sizeClass} rounded-full object-cover ring-2 ring-white/10 flex-shrink-0`}
      />
    );
  }

  const gradient = avatarGradient(profile?.id || "?");
  return (
    <div
      className={`${sizeClass} rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center font-bold text-white flex-shrink-0 ring-2 ring-white/10`}
    >
      {initials}
    </div>
  );
};

// ─── Conversation List ────────────────────────────────────────────────────────

interface ConversationListProps {
  conversations: Conversation[];
  loading: boolean;
  onSelect: (conv: Conversation) => void;
}

const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  loading,
  onSelect,
}) => {
  if (loading) {
    return (
      <div className="flex flex-col gap-3 p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 animate-pulse">
            <div className="w-11 h-11 rounded-full bg-white/10" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-white/10 rounded w-1/3" />
              <div className="h-3 bg-white/10 rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 py-16 text-gray-500">
        <MessageCircle className="w-12 h-12 opacity-30" />
        <p className="text-sm">No conversations yet</p>
        <p className="text-xs opacity-60">
          Send a message to start a conversation
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-white/5">
      {conversations.map((conv, idx) => (
        <motion.button
          key={conv.otherUserId}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.04 }}
          onClick={() => onSelect(conv)}
          className="flex items-center gap-3 px-4 py-3.5 w-full text-left hover:bg-white/5 active:bg-white/10 transition-colors"
        >
          <div className="relative">
            <Avatar profile={conv.otherProfile} size="md" />
            {conv.unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-indigo-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                {conv.unread > 99 ? "99+" : conv.unread}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <span
                className={`text-sm truncate ${
                  conv.unread > 0
                    ? "font-semibold text-white"
                    : "font-medium text-gray-200"
                }`}
              >
                {conv.otherProfile?.username || conv.otherUserId.slice(0, 8)}
              </span>
              <span className="text-[11px] text-gray-500 flex-shrink-0">
                {relativeTime(conv.lastMessageAt)}
              </span>
            </div>
            <p
              className={`text-xs truncate mt-0.5 ${
                conv.unread > 0 ? "text-gray-300" : "text-gray-500"
              }`}
            >
              {conv.lastMessage || "📎 Attachment"}
            </p>
          </div>
        </motion.button>
      ))}
    </div>
  );
};

// ─── Chat Messages (display only, no header/input) ───────────────────────────

interface ChatMessagesProps {
  messages: DmMessage[];
  loading: boolean;
  currentUserId: string;
  otherUser: Profile | null;
  otherTyping: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

const ChatMessages: React.FC<ChatMessagesProps> = ({
  messages,
  loading,
  currentUserId,
  otherUser,
  otherTyping,
  messagesEndRef,
}) => {
  const groupedMessages = messages.reduce<{ date: string; msgs: DmMessage[] }[]>(
    (groups, msg) => {
      const date = new Date(msg.created_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      const last = groups[groups.length - 1];
      if (last?.date === date) {
        last.msgs.push(msg);
      } else {
        groups.push({ date, msgs: [msg] });
      }
      return groups;
    },
    []
  );

  if (loading) {
    return (
      <div className="flex flex-col gap-3 p-4 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`h-9 rounded-2xl ${
                i % 2 === 0 ? "bg-indigo-900/40 w-32" : "bg-white/10 w-44"
              }`}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col px-4 py-3 space-y-4">
      {groupedMessages.map(({ date, msgs }) => (
        <div key={date}>
          <div className="flex items-center gap-2 my-3">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-[11px] text-gray-500">{date}</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>
          {msgs.map((msg, idx) => {
            const isMine = msg.sender_id === currentUserId;
            const isLast = idx === msgs.length - 1;
            const showRead = isMine && isLast && msg.read;

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", damping: 20, stiffness: 300 }}
                className={`flex mb-2 ${isMine ? "justify-end" : "justify-start"}`}
              >
                {!isMine && (
                  <div className="mr-2 mt-auto">
                    <Avatar profile={otherUser} size="sm" />
                  </div>
                )}
                <div className={`flex flex-col ${isMine ? "items-end" : "items-start"} max-w-[75%]`}>
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-1">
                      {msg.attachments.map((url, ai) => (
                        <a
                          key={ai}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                            <img
                              src={url}
                              alt="attachment"
                              className="max-w-[200px] rounded-xl border border-white/10 cursor-zoom-in"
                            />
                          ) : (
                            <div className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-xl text-xs text-gray-300 border border-white/10">
                              <Paperclip className="w-3.5 h-3.5" />
                              File
                            </div>
                          )}
                        </a>
                      ))}
                    </div>
                  )}

                  {msg.content && (
                    <div
                      className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                        isMine
                          ? "bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-br-md shadow-lg shadow-indigo-900/30"
                          : "bg-white/10 text-gray-100 rounded-bl-md"
                      }`}
                    >
                      {msg.content}
                    </div>
                  )}

                  <div className="flex items-center gap-1 mt-1 px-1">
                    <span className="text-[10px] text-gray-600">
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {isMine && (
                      <span className="text-gray-500">
                        {showRead ? (
                          <CheckCheck className="w-3 h-3 text-indigo-400" />
                        ) : (
                          <Check className="w-3 h-3" />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ))}

      <AnimatePresence>
        {otherTyping && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            className="flex items-end gap-2"
          >
            <Avatar profile={otherUser} size="sm" />
            <div className="bg-white/10 rounded-2xl rounded-bl-md px-4 py-3 flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="w-2 h-2 bg-gray-400 rounded-full"
                  animate={{ y: [0, -4, 0] }}
                  transition={{
                    repeat: Infinity,
                    duration: 0.8,
                    delay: i * 0.15,
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div ref={messagesEndRef} />
    </div>
  );
};

// ─── Main Inbox Component ─────────────────────────────────────────────────────

const Inbox: React.FC<InboxProps> = ({ isOpen, onClose, currentUserId }) => {
  // ── Conversation list state ──
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);

  // ── Chat messages state ──
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);

  // ── Input state (always visible) ──
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ── Fetch conversations ──
  const fetchConversations = useCallback(async () => {
    setLoadingConvs(true);

    const { data: sent } = await supabase
      .from("dm_messages")
      .select("sender_id, receiver_id, content, created_at, read")
      .eq("sender_id", currentUserId)
      .order("created_at", { ascending: false });

    const { data: received } = await supabase
      .from("dm_messages")
      .select("sender_id, receiver_id, content, created_at, read")
      .eq("receiver_id", currentUserId)
      .order("created_at", { ascending: false });

    const all = [...(sent || []), ...(received || [])];

    const convMap = new Map<
      string,
      {
        otherUserId: string;
        lastMessage: string;
        lastMessageAt: string;
        unread: number;
      }
    >();

    for (const msg of all) {
      const otherId =
        msg.sender_id === currentUserId ? msg.receiver_id : msg.sender_id;
      const existing = convMap.get(otherId);
      const isNewer =
        !existing ||
        new Date(msg.created_at) > new Date(existing.lastMessageAt);
      const unreadDelta =
        msg.receiver_id === currentUserId && !msg.read ? 1 : 0;

      if (!existing) {
        convMap.set(otherId, {
          otherUserId: otherId,
          lastMessage: msg.content,
          lastMessageAt: msg.created_at,
          unread: unreadDelta,
        });
      } else {
        convMap.set(otherId, {
          ...existing,
          lastMessage: isNewer ? msg.content : existing.lastMessage,
          lastMessageAt: isNewer ? msg.created_at : existing.lastMessageAt,
          unread: existing.unread + unreadDelta,
        });
      }
    }

    const sorted = Array.from(convMap.values()).sort(
      (a, b) =>
        new Date(b.lastMessageAt).getTime() -
        new Date(a.lastMessageAt).getTime()
    );

    const otherIds = sorted.map((c) => c.otherUserId);
    const profileMap = new Map<string, Profile>();

    if (otherIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", otherIds);

      (profiles || []).forEach((p: Profile) => profileMap.set(p.id, p));
    }

    const full: Conversation[] = sorted.map((c) => ({
      ...c,
      otherProfile: profileMap.get(c.otherUserId) || null,
    }));

    setConversations(full);
    setLoadingConvs(false);
  }, [currentUserId]);

  // ── Fetch messages for active conversation ──
  const fetchMessages = useCallback(async (conv: Conversation) => {
    setLoadingMsgs(true);
    const { data } = await supabase
      .from("dm_messages")
      .select("*")
      .or(
        `and(sender_id.eq.${currentUserId},receiver_id.eq.${conv.otherUserId}),and(sender_id.eq.${conv.otherUserId},receiver_id.eq.${currentUserId})`
      )
      .order("created_at", { ascending: true });

    if (data) setMessages(data as DmMessage[]);
    setLoadingMsgs(false);
  }, [currentUserId]);

  const markRead = useCallback(async (conv: Conversation) => {
    await supabase
      .from("dm_messages")
      .update({ read: true })
      .eq("receiver_id", currentUserId)
      .eq("sender_id", conv.otherUserId)
      .eq("read", false);
  }, [currentUserId]);

  // ── Lifecycle: fetch convs on open ──
  useEffect(() => {
    if (isOpen && currentUserId) {
      fetchConversations();
    }
  }, [isOpen, currentUserId, fetchConversations]);

  // ── Lifecycle: inbox realtime ──
  useEffect(() => {
    if (!isOpen || !currentUserId) return;

    const ch = supabase
      .channel("inbox-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "dm_messages",
          filter: `receiver_id=eq.${currentUserId}`,
        },
        () => fetchConversations()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [isOpen, currentUserId, fetchConversations]);

  // ── Lifecycle: subscribe to active chat ──
  useEffect(() => {
    if (!activeConv) return;

    fetchMessages(activeConv);
    markRead(activeConv);

    const room = roomId(currentUserId, activeConv.otherUserId);

    const ch = supabase
      .channel(`dm:${room}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "dm_messages",
          filter: `receiver_id=eq.${currentUserId}`,
        },
        (payload) => {
          const msg = payload.new as DmMessage;
          if (msg.sender_id !== activeConv.otherUserId) return;
          setMessages((prev) => [...prev, msg]);
          markRead(activeConv);
        }
      )
      .on("broadcast", { event: "typing" }, (payload) => {
        if (payload.payload?.userId === activeConv.otherUserId) {
          setOtherTyping(true);
          setTimeout(() => setOtherTyping(false), 3000);
        }
      })
      .subscribe();

    channelRef.current = ch;

    return () => {
      supabase.removeChannel(ch);
      channelRef.current = null;
    };
  }, [activeConv, currentUserId, fetchMessages, markRead]);

  // ── Scroll to bottom on new messages ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, otherTyping]);

  // ── Select conversation ──
  const handleSelectConv = (conv: Conversation) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.otherUserId === conv.otherUserId ? { ...c, unread: 0 } : c
      )
    );
    setMessages([]);
    setActiveConv(conv);
  };

  // ── Go back to list ──
  const handleBack = () => {
    setActiveConv(null);
    setMessages([]);
    setOtherTyping(false);
    setText("");
    setAttachments([]);
    setPreviews([]);
    setShowEmojiPicker(false);
  };

  // ── Typing broadcast ──
  const broadcastTyping = useCallback(() => {
    if (!channelRef.current) return;
    channelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: { userId: currentUserId },
    });
    if (typingTimeout) clearTimeout(typingTimeout);
    const t = setTimeout(() => {}, 2500);
    setTypingTimeout(t);
  }, [currentUserId, typingTimeout]);

  // ── File handling ──
  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files);
    setAttachments((prev) => [...prev, ...arr]);
    arr.forEach((f) => {
      if (f.type.startsWith("image/")) {
        const url = URL.createObjectURL(f);
        setPreviews((prev) => [...prev, url]);
      } else {
        setPreviews((prev) => [...prev, ""]);
      }
    });
  };

  const removeAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
    setPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  // ── Send message ──
  const handleSend = async () => {
    if (!activeConv) return;
    if (!text.trim() && attachments.length === 0) return;
    setSending(true);
    setShowEmojiPicker(false);

    const room = roomId(currentUserId, activeConv.otherUserId);

    try {
      let attachmentUrls: string[] = [];

      for (const file of attachments) {
        const key = `dm/${room}/${currentUserId}-${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("dm-attachments")
          .upload(key, file);
        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from("dm-attachments")
          .getPublicUrl(key);
        attachmentUrls.push(data.publicUrl);
      }

      const { data: inserted, error } = await supabase
        .from("dm_messages")
        .insert({
          sender_id: currentUserId,
          receiver_id: activeConv.otherUserId,
          content: text.trim(),
          attachments: attachmentUrls,
          read: false,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      setMessages((prev) => [...prev, inserted as DmMessage]);
      setText("");
      setAttachments([]);
      setPreviews([]);
    } catch (err) {
      console.error("Error sending DM:", err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Emoji insert ──
  const insertEmoji = (emoji: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setText((prev) => prev + emoji);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newText = text.slice(0, start) + emoji + text.slice(end);
    setText(newText);
    setTimeout(() => {
      textarea.selectionStart = start + emoji.length;
      textarea.selectionEnd = start + emoji.length;
      textarea.focus();
    }, 0);
  };

  const canSend = !!activeConv && (text.trim().length > 0 || attachments.length > 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.97 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="w-full max-w-md h-[85vh] max-h-[700px] flex flex-col rounded-3xl overflow-hidden border border-white/8 shadow-2xl shadow-black/80"
            style={{
              background:
                "linear-gradient(160deg, #0d0d1a 0%, #0a0a0f 60%, #0a0010 100%)",
            }}
          >
            {/* ── Header ── */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 flex-shrink-0">
              <div className="flex items-center gap-2">
                <AnimatePresence mode="wait">
                  {activeConv && (
                    <motion.button
                      key="back"
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      onClick={handleBack}
                      className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors mr-1"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </motion.button>
                  )}
                </AnimatePresence>

                <AnimatePresence mode="wait">
                  {activeConv ? (
                    <motion.div
                      key="chat-header"
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8 }}
                      className="flex items-center gap-2"
                    >
                      <Avatar profile={activeConv.otherProfile} size="sm" />
                      <div>
                        <h2 className="text-base font-bold text-white leading-tight">
                          {activeConv.otherProfile?.username ||
                            activeConv.otherUserId.slice(0, 10) + "…"}
                        </h2>
                        <AnimatePresence>
                          {otherTyping && (
                            <motion.p
                              initial={{ opacity: 0, y: 2 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0 }}
                              className="text-[11px] text-indigo-400"
                            >
                              typing…
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.h2
                      key="inbox-title"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-lg font-bold text-white tracking-tight"
                    >
                      Messages
                    </motion.h2>
                  )}
                </AnimatePresence>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* ── Content area (list or chat messages) ── */}
            <div className="flex-1 overflow-hidden">
              <AnimatePresence mode="wait">
                {activeConv ? (
                  <motion.div
                    key="chat"
                    initial={{ x: "100%", opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: "100%", opacity: 0 }}
                    transition={{ type: "spring", damping: 30, stiffness: 300 }}
                    className="h-full overflow-y-auto"
                  >
                    <ChatMessages
                      messages={messages}
                      loading={loadingMsgs}
                      currentUserId={currentUserId}
                      otherUser={activeConv.otherProfile}
                      otherTyping={otherTyping}
                      messagesEndRef={messagesEndRef}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="list"
                    initial={{ x: "-100%", opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: "-100%", opacity: 0 }}
                    transition={{ type: "spring", damping: 30, stiffness: 300 }}
                    className="h-full overflow-y-auto"
                  >
                    <ConversationList
                      conversations={conversations}
                      loading={loadingConvs}
                      onSelect={handleSelectConv}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── Attachment previews ── */}
            <AnimatePresence>
              {attachments.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex gap-2 px-4 pb-2 overflow-x-auto flex-shrink-0"
                >
                  {attachments.map((file, idx) => (
                    <div key={idx} className="relative flex-shrink-0">
                      {previews[idx] ? (
                        <img
                          src={previews[idx]}
                          alt="preview"
                          className="w-14 h-14 object-cover rounded-xl border border-white/20"
                        />
                      ) : (
                        <div className="w-14 h-14 bg-white/10 rounded-xl flex flex-col items-center justify-center gap-1 border border-white/20">
                          <Paperclip className="w-4 h-4 text-gray-400" />
                          <span className="text-[9px] text-gray-500 truncate w-full text-center px-1">
                            {file.name.slice(0, 8)}
                          </span>
                        </div>
                      )}
                      <button
                        onClick={() => removeAttachment(idx)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-800 border border-white/20 rounded-full flex items-center justify-center"
                      >
                        <X className="w-3 h-3 text-gray-300" />
                      </button>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Emoji picker ── */}
            <AnimatePresence>
              {showEmojiPicker && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="px-3 pb-2 flex-shrink-0"
                >
                  <div className="bg-[#15151f] border border-white/10 rounded-2xl p-3 flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                    {EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => insertEmoji(emoji)}
                        className="text-xl w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/10 active:scale-90 transition-all"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Input bar — always visible ── */}
            <div className="px-3 pb-4 pt-2 border-t border-white/10 flex-shrink-0">
              {!activeConv && (
                <p className="text-[11px] text-gray-600 text-center mb-2">
                  Select a conversation to send a message
                </p>
              )}
              <div className="flex items-end gap-2">
                {/* Attach file */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!activeConv}
                  className="flex-shrink-0 p-2.5 rounded-full bg-white/8 hover:bg-white/15 text-gray-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Attach file"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*,.pdf,.doc,.docx,.txt"
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />

                {/* Attach image */}
                <button
                  disabled={!activeConv}
                  onClick={() => {
                    if (!activeConv) return;
                    const inp = document.createElement("input");
                    inp.type = "file";
                    inp.accept = "image/*";
                    inp.multiple = true;
                    inp.onchange = (e) =>
                      handleFiles((e.target as HTMLInputElement).files);
                    inp.click();
                  }}
                  className="flex-shrink-0 p-2.5 rounded-full bg-white/8 hover:bg-white/15 text-gray-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Attach image"
                >
                  <ImageIcon className="w-5 h-5" />
                </button>

                {/* Emoji toggle */}
                <button
                  disabled={!activeConv}
                  onClick={() => setShowEmojiPicker((prev) => !prev)}
                  className={`flex-shrink-0 p-2.5 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                    showEmojiPicker
                      ? "bg-indigo-600/40 text-indigo-300"
                      : "bg-white/8 hover:bg-white/15 text-gray-400 hover:text-white"
                  }`}
                  title="Emoji"
                >
                  <Smile className="w-5 h-5" />
                </button>

                {/* Textarea */}
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    if (activeConv) broadcastTyping();
                  }}
                  onKeyDown={handleKeyDown}
                  disabled={!activeConv}
                  placeholder={activeConv ? "Message…" : "Select a conversation…"}
                  rows={1}
                  className="flex-1 resize-none bg-white/10 text-white placeholder-gray-500 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 max-h-32 overflow-y-auto leading-relaxed disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ scrollbarWidth: "none" }}
                />

                {/* Send */}
                <motion.button
                  whileTap={{ scale: canSend ? 0.9 : 1 }}
                  onClick={handleSend}
                  disabled={!canSend || sending}
                  className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-900/40 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
                  title="Send"
                >
                  <Send className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Inbox;

/*
═══════════════════════════════════════════════════════════════════════════════
  📬  INBOX.TSX — GUÍA DE INTEGRACIÓN
═══════════════════════════════════════════════════════════════════════════════

1. IMPORTAR EN HomePage.tsx
─────────────────────────────
  import Inbox from "./chat/Inbox";

2. USAR CON showInbox / setShowInbox
─────────────────────────────────────
  // En tu JSX (al fondo del return):
  {userId && (
    <Inbox
      isOpen={showInbox}
      onClose={() => setShowInbox(false)}
      currentUserId={userId}
    />
  )}

  // Tu botón ✉️ ya tiene: onClick={() => { setShowInbox(true); setUnreadMessages(0); }}
  // No necesitas cambiarlo.

3. ABRIR UNA CONVERSACIÓN ESPECÍFICA (otherUserId)
────────────────────────────────────────────────────
  Agrega el prop opcional initialOtherUserId?: string a InboxProps y
  un useEffect que llame setActiveConv con ese usuario al abrirse.

4. TABLA SUPABASE dm_messages
──────────────────────────────
  CREATE TABLE IF NOT EXISTS dm_messages (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id   TEXT NOT NULL,
    receiver_id TEXT NOT NULL,
    content     TEXT NOT NULL DEFAULT '',
    attachments TEXT[] DEFAULT '{}',
    read        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX idx_dm_sender   ON dm_messages (sender_id, created_at DESC);
  CREATE INDEX idx_dm_receiver ON dm_messages (receiver_id, created_at DESC);

  RLS: habilita SELECT para sender/receiver, INSERT solo para sender,
       UPDATE solo para receiver (marcar como leído).

  Storage: bucket público llamado "dm-attachments".
  Realtime: activar INSERT en dm_messages desde el Dashboard de Supabase.

5. DEPENDENCIAS
────────────────
  npm install framer-motion lucide-react @supabase/supabase-js

═══════════════════════════════════════════════════════════════════════════════
*/
