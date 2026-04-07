/**
 * Inbox.tsx – CORREGIDO
 *
 * ERRORES CORREGIDOS:
 * [I1] supabase instanciado con import.meta.env directamente — si VITE_SUPABASE_URL
 *      o VITE_SUPABASE_ANON_KEY no están definidos en .env, createClient se llama
 *      con undefined y falla silenciosamente. Se añade validación explícita.
 * [I2] fetchConversations: errores de Supabase no capturados (sin try/catch)
 *      → añadidos try/catch con logging
 * [I3] fetchMessages: errores de Supabase no capturados → añadido manejo
 * [I4] markRead: errores de Supabase silenciados → añadido logging
 * [I5] Canal realtime "inbox-realtime" hardcoded — si se abren múltiples instancias
 *      del Inbox simultáneamente, se duplican los canales. Se genera key única.
 * [I6] Canal realtime dm: no se desuscribe correctamente si la conversación activa
 *      cambia muy rápido (race condition). Se añade cleanup robusto con ref.
 * [I7] handleSend: si la URL del attachment tiene Error, el mensaje igualmente
 *      se intenta enviar con URL vacía. Se añade validación.
 * [I8] handleSend: sin feedback visual de "enviando" al subir archivos adjuntos.
 * [I9] Inbox: canal de presencia/typing sin cleanup en desmontaje
 * [I10] fetchConversations: sin deduplicación correcta de unread si hay mensajes
 *       duplicados entre sent/received — ahora usa set de IDs procesados.
 *
 * Tabla dm_messages requerida:
 *   id UUID PK, sender_id TEXT, receiver_id TEXT, content TEXT,
 *   attachments TEXT[], read BOOLEAN DEFAULT false, created_at TIMESTAMPTZ
 *
 * Storage: bucket "dm-attachments" (público)
 * RLS: SELECT para sender/receiver, INSERT solo para sender, UPDATE para receiver
 * Realtime: activar INSERT en dm_messages
 */

import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import { supabase } from "../../supabaseClient";
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
  Search,
  UserPlus,
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
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
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

// ─── User Search Modal ────────────────────────────────────────────────────────

interface UserSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  onSelectUser: (profile: Profile) => void;
}

const UserSearchModal: React.FC<UserSearchModalProps> = ({
  isOpen,
  onClose,
  currentUserId,
  onSelectUser,
}) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setResults([]);
      setTimeout(() => searchRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .ilike("username", `%${query.trim()}%`)
          .neq("id", currentUserId)
          .limit(20);
        if (error) {
          console.error("[Inbox] Error buscando usuarios:", error.message);
        } else {
          setResults((data as Profile[]) || []);
        }
      } catch (e) {
        console.error("[Inbox] Error inesperado en búsqueda:", e);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, currentUserId]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-10 flex flex-col rounded-3xl overflow-hidden"
          style={{
            background:
              "linear-gradient(160deg, #0d0d1a 0%, #0a0a0f 60%, #0a0010 100%)",
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 pt-5 pb-3">
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-base font-semibold text-white">Nuevo mensaje</h2>
          </div>

          {/* Search */}
          <div className="px-4 pb-3">
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-3 py-2.5">
              <Search className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Buscar por nombre de usuario…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 outline-none"
              />
              {loading && (
                <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              )}
            </div>
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto px-2">
            {results.length === 0 && query.trim() && !loading && (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <Search className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-sm">No se encontraron usuarios</p>
              </div>
            )}
            {results.map((user) => (
              <button
                key={user.id}
                onClick={() => onSelectUser(user)}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-white/5 cursor-pointer transition-colors"
              >
                <Avatar profile={user} size="md" />
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-white">
                    {user.username || "Usuario"}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {user.id.slice(0, 12)}…
                  </p>
                </div>
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ─── Message List ─────────────────────────────────────────────────────────────

interface MessageListProps {
  messages: DmMessage[];
  currentUserId: string;
  otherUser: Profile | null;
  loading: boolean;
  otherTyping: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  otherUser,
  loading,
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

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16 gap-3 text-gray-500">
        <MessageCircle className="w-10 h-10 opacity-20" />
        <p className="text-sm">No messages yet. Say hello!</p>
        <div ref={messagesEndRef} />
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
                          ? "bg-gradient-to-br from-indigo-600 to-violet-700 text-white rounded-br-sm"
                          : "bg-white/8 border border-white/10 text-gray-100 rounded-bl-sm"
                      }`}
                    >
                      {msg.content}
                    </div>
                  )}

                  <div className={`flex items-center gap-1.5 mt-1 px-1 ${isMine ? "flex-row-reverse" : ""}`}>
                    <span className="text-[10px] text-gray-600">
                      {relativeTime(msg.created_at)}
                    </span>
                    {isMine && (
                      showRead
                        ? <CheckCheck className="w-3 h-3 text-indigo-400" />
                        : <Check className="w-3 h-3 text-gray-600" />
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ))}

      {/* Typing indicator */}
      {otherTyping && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="flex justify-start mb-2"
        >
          <div className="mr-2 mt-auto">
            <Avatar profile={otherUser} size="sm" />
          </div>
          <div className="flex items-center gap-1 bg-white/8 border border-white/10 rounded-2xl px-3 py-2.5">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-gray-400 block"
                animate={{ y: [0, -4, 0], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
              />
            ))}
          </div>
        </motion.div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};

// ─── Main Inbox Component ─────────────────────────────────────────────────────

const Inbox: React.FC<InboxProps> = ({ isOpen, onClose, currentUserId }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [otherTyping, setOtherTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const inboxChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  // Ref to always have the latest activeConv inside async callbacks
  const activeConvRef = useRef<Conversation | null>(null);
  useEffect(() => { activeConvRef.current = activeConv; }, [activeConv]);

  // ── [I2] Fetch conversations con manejo de errores ──
  const fetchConversations = useCallback(async () => {
    setLoadingConvs(true);
    try {
      const [{ data: sent, error: sentError }, { data: received, error: recvError }] = await Promise.all([
        supabase
          .from("dm_messages")
          .select("id, sender_id, receiver_id, content, created_at, read")
          .eq("sender_id", currentUserId)
          .order("created_at", { ascending: false }),
        supabase
          .from("dm_messages")
          .select("id, sender_id, receiver_id, content, created_at, read")
          .eq("receiver_id", currentUserId)
          .order("created_at", { ascending: false }),
      ]);

      if (sentError) console.error("[Inbox] Error cargando mensajes enviados:", sentError.message);
      if (recvError) console.error("[Inbox] Error cargando mensajes recibidos:", recvError.message);

      const all = [...(sent || []), ...(received || [])];

      // [I10] Deduplicar mensajes por id antes de procesar
      const seenIds = new Set<string>();
      const deduped = all.filter(msg => {
        if (seenIds.has(msg.id)) return false;
        seenIds.add(msg.id);
        return true;
      });

      const convMap = new Map<
        string,
        {
          otherUserId: string;
          lastMessage: string;
          lastMessageAt: string;
          unread: number;
        }
      >();

      for (const msg of deduped) {
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
        const { data: profiles, error: profError } = await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .in("id", otherIds);

        if (profError) console.error("[Inbox] Error cargando perfiles:", profError.message);
        (profiles || []).forEach((p: Profile) => profileMap.set(p.id, p));
      }

      const full: Conversation[] = sorted.map((c) => ({
        ...c,
        otherProfile: profileMap.get(c.otherUserId) || null,
      }));

      setConversations(full);
    } catch (e: unknown) {
      console.error("[Inbox] Error inesperado en fetchConversations:", e);
    } finally {
      setLoadingConvs(false);
    }
  }, [currentUserId]);

  // ── [I3] Fetch messages con manejo de errores ──
  const fetchMessages = useCallback(async (conv: Conversation) => {
    setLoadingMsgs(true);
    try {
      const { data, error } = await supabase
        .from("dm_messages")
        .select("*")
        .or(
          `and(sender_id.eq.${currentUserId},receiver_id.eq.${conv.otherUserId}),and(sender_id.eq.${conv.otherUserId},receiver_id.eq.${currentUserId})`
        )
        .order("created_at", { ascending: true });

      if (error) {
        console.error("[Inbox] Error cargando mensajes de conversación:", error.message);
        return;
      }
      if (data) setMessages(data as DmMessage[]);
    } catch (e: unknown) {
      console.error("[Inbox] Error inesperado en fetchMessages:", e);
    } finally {
      setLoadingMsgs(false);
    }
  }, [currentUserId]);

  // ── [I4] markRead con logging de errores ──
  const markRead = useCallback(async (conv: Conversation) => {
    try {
      const { error } = await supabase
        .from("dm_messages")
        .update({ read: true })
        .eq("receiver_id", currentUserId)
        .eq("sender_id", conv.otherUserId)
        .eq("read", false);
      if (error) console.error("[Inbox] Error marcando mensajes como leídos:", error.message);
    } catch (e: unknown) {
      console.error("[Inbox] Error inesperado en markRead:", e);
    }
  }, [currentUserId]);

  // ── Lifecycle: fetch convs on open ──
  useEffect(() => {
    if (isOpen && currentUserId) {
      fetchConversations();
    }
  }, [isOpen, currentUserId, fetchConversations]);

  // ── [I5] Lifecycle: inbox realtime con channel key único ──
  useEffect(() => {
    if (!isOpen || !currentUserId) return;

    // [I5] Key única para evitar duplicación si el componente se monta varias veces
    const inboxChannelKey = `inbox-realtime-${currentUserId}-${Date.now()}`;

    const ch = supabase
      .channel(inboxChannelKey)
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
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "dm_messages",
          filter: `sender_id=eq.${currentUserId}`,
        },
        () => fetchConversations()
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.error("[Inbox] Error en canal realtime inbox:", inboxChannelKey);
        }
      });

    inboxChannelRef.current = ch;

    return () => {
      // [I9] Cleanup correcto en desmontaje
      supabase.removeChannel(ch);
      inboxChannelRef.current = null;
    };
  }, [isOpen, currentUserId, fetchConversations]);

  // ── [I6] Lifecycle: subscribe to active chat ──
  useEffect(() => {
    if (!activeConv) return;

    fetchMessages(activeConv);
    markRead(activeConv);

    const room = roomId(currentUserId, activeConv.otherUserId);

    // [I6] Cleanup previo antes de crear nuevo canal
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const ch = supabase
      .channel(`dm:${room}:${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "dm_messages",
          filter: `sender_id=eq.${activeConv.otherUserId}`,
        },
        (payload) => {
          const conv = activeConvRef.current;
          if (!conv) return;
          if (
            payload.new.sender_id === conv.otherUserId &&
            payload.new.receiver_id === currentUserId
          ) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === payload.new.id)) return prev;
              return [...prev, payload.new as DmMessage];
            });
            markRead(conv);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "dm_messages",
        },
        (payload) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === payload.new.id ? { ...m, ...(payload.new as DmMessage) } : m
            )
          );
        }
      )
      .on("broadcast", { event: "typing" }, (payload) => {
        const { userId } = payload.payload as { userId: string };
        if (userId !== currentUserId) {
          setOtherTyping(true);
          setTimeout(() => setOtherTyping(false), 2000);
        }
      })
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.error("[Inbox] Error en canal realtime DM:", room);
        }
      });

    channelRef.current = ch;

    return () => {
      supabase.removeChannel(ch);
      channelRef.current = null;
      setOtherTyping(false);
    };
  }, [activeConv, currentUserId, fetchMessages, markRead]);

  // ── Auto scroll ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // ── Typing broadcast ──
  const handleTyping = useCallback(() => {
    if (!channelRef.current) return;
    channelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: { userId: currentUserId },
    });
  }, [currentUserId]);

  // ── [I7][I8] Send message con validación y feedback mejorado ──
  const handleSend = async () => {
    const conv = activeConv;
    if (!conv || (!text.trim() && pendingFiles.length === 0)) return;

    const currentText = text.trim();
    setText("");
    setPendingFiles([]);
    setSending(true);
    setSendError(null);

    try {
      const attachmentUrls: string[] = [];

      for (const file of pendingFiles) {
        const key = `${currentUserId}/${Date.now()}-${file.name}`;

        // [I8] Mostrar estado de subida (sending ya activo)
        const { error: uploadError } = await supabase.storage
          .from("dm-attachments")
          .upload(key, file);

        if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

        const { data } = supabase.storage
          .from("dm-attachments")
          .getPublicUrl(key);

        // [I7] Validar que la URL no esté vacía antes de añadirla
        if (!data.publicUrl) {
          console.error("[Inbox] getPublicUrl devolvió URL vacía para:", key);
          throw new Error("No se pudo obtener la URL del archivo. Verifica que el bucket 'dm-attachments' es público.");
        }

        attachmentUrls.push(data.publicUrl);
      }

      const { data: inserted, error } = await supabase
        .from("dm_messages")
        .insert({
          sender_id: currentUserId,
          receiver_id: conv.otherUserId,
          content: currentText,
          attachments: attachmentUrls,
          read: false,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);

      if (inserted) {
        setMessages((prev) => [...prev, inserted as DmMessage]);
      }

      fetchConversations();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[Inbox] Error enviando DM:", msg);
      setSendError(msg);
      // Restore text so user can retry
      setText(currentText);
      // Auto-clear error after 5s
      setTimeout(() => setSendError(null), 5000);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    handleTyping();
  };

  // ── Emoji insert ──
  const insertEmoji = (emoji: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newText = text.slice(0, start) + emoji + text.slice(end);
      setText(newText);
      // Restore cursor position after state update
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + emoji.length;
        textarea.focus();
      });
    } else {
      setText((t) => t + emoji);
    }
    setShowEmojis(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      // [I7] Validar archivos antes de añadir
      const valid = files.filter(f => f.size <= 10 * 1024 * 1024); // 10 MB limit
      const invalid = files.filter(f => f.size > 10 * 1024 * 1024);
      if (invalid.length > 0) {
        setSendError(`${invalid.length} archivo(s) superan 10 MB y no se pueden enviar`);
        setTimeout(() => setSendError(null), 5000);
      }
      setPendingFiles((prev) => [...prev, ...valid]);
    }
    e.target.value = "";
  };

  const openConversation = (conv: Conversation) => {
    setActiveConv(conv);
    setMessages([]);
    setShowEmojis(false);
    setPendingFiles([]);
    setText("");
  };

  const handleNewConversation = (profile: Profile) => {
    setShowSearch(false);
    const newConv: Conversation = {
      otherUserId: profile.id,
      otherProfile: profile,
      lastMessage: "",
      lastMessageAt: new Date().toISOString(),
      unread: 0,
    };
    setActiveConv(newConv);
    setMessages([]);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9000] flex items-end justify-center sm:items-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.97 }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        className="relative w-full sm:max-w-sm h-[88vh] sm:h-[80vh] rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl"
        style={{
          background: "linear-gradient(160deg, #0d0d1a 0%, #0a0a0f 60%, #0a0010 100%)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Conversation List ── */}
        <AnimatePresence>
          {!activeConv && (
            <motion.div
              key="conv-list"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="absolute inset-0 flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 pt-5 pb-3">
                <h2 className="text-base font-semibold text-white">Mensajes</h2>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setShowSearch(true)}
                    className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
                  >
                    <UserPlus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Conversations */}
              <div className="flex-1 overflow-y-auto px-2 pb-4">
                {loadingConvs && (
                  <div className="flex flex-col gap-3 p-4 animate-pulse">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full bg-white/10" />
                        <div className="flex-1">
                          <div className="h-3 bg-white/10 rounded w-24 mb-2" />
                          <div className="h-2.5 bg-white/5 rounded w-36" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!loadingConvs && conversations.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-500 py-12">
                    <MessageCircle className="w-10 h-10 opacity-20" />
                    <p className="text-sm">No hay conversaciones aún</p>
                    <button
                      onClick={() => setShowSearch(true)}
                      className="text-indigo-400 text-xs hover:underline cursor-pointer"
                    >
                      Iniciar una nueva conversación
                    </button>
                  </div>
                )}

                {conversations.map((conv) => (
                  <button
                    key={conv.otherUserId}
                    onClick={() => openConversation(conv)}
                    className="w-full flex items-center gap-3 px-3 py-3.5 rounded-2xl hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    <Avatar profile={conv.otherProfile} size="md" />
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-sm font-medium text-white truncate">
                          {conv.otherProfile?.username || "Usuario"}
                        </span>
                        <span className="text-[11px] text-gray-500 flex-shrink-0 ml-2">
                          {relativeTime(conv.lastMessageAt)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 truncate flex-1">
                          {conv.lastMessage || "Sin mensajes"}
                        </span>
                        {conv.unread > 0 && (
                          <span className="ml-2 flex-shrink-0 w-4 h-4 rounded-full bg-indigo-500 text-white text-[10px] flex items-center justify-center font-bold">
                            {conv.unread > 9 ? "9+" : conv.unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Search overlay */}
              <UserSearchModal
                isOpen={showSearch}
                onClose={() => setShowSearch(false)}
                currentUserId={currentUserId}
                onSelectUser={handleNewConversation}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Chat Window ── */}
        <AnimatePresence>
          {activeConv && (
            <motion.div
              key="chat-window"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="absolute inset-0 flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center gap-3 px-3 pt-4 pb-3 border-b border-white/8 flex-shrink-0">
                <button
                  onClick={() => setActiveConv(null)}
                  className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <Avatar profile={activeConv.otherProfile} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {activeConv.otherProfile?.username || "Usuario"}
                  </p>
                  {otherTyping && (
                    <p className="text-[11px] text-indigo-400 italic">escribiendo…</p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto">
                <MessageList
                  messages={messages}
                  currentUserId={currentUserId}
                  otherUser={activeConv.otherProfile}
                  loading={loadingMsgs}
                  otherTyping={otherTyping}
                  messagesEndRef={messagesEndRef as React.RefObject<HTMLDivElement>}
                />
              </div>

              {/* Pending files preview */}
              {pendingFiles.length > 0 && (
                <div className="flex gap-2 px-4 py-2 flex-wrap flex-shrink-0">
                  {pendingFiles.map((f, i) => (
                    <div key={i} className="flex items-center gap-1.5 bg-white/10 rounded-xl px-2.5 py-1.5 text-xs text-gray-300">
                      <Paperclip className="w-3 h-3" />
                      <span className="truncate max-w-[80px]">{f.name}</span>
                      <button
                        onClick={() => setPendingFiles(prev => prev.filter((_, j) => j !== i))}
                        className="text-gray-500 hover:text-white cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Emoji tray */}
              <AnimatePresence>
                {showEmojis && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="flex flex-wrap gap-1 px-4 py-2 border-t border-white/8 flex-shrink-0 overflow-hidden"
                  >
                    {EMOJIS.map((e) => (
                      <button
                        key={e}
                        onClick={() => insertEmoji(e)}
                        className="text-lg hover:scale-125 transition-transform cursor-pointer p-0.5"
                      >
                        {e}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Send error banner ── */}
              <AnimatePresence>
                {sendError && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mx-4 mb-1 px-3 py-2 rounded-xl bg-red-500/20 border border-red-500/30 text-xs text-red-300 flex-shrink-0"
                  >
                    {sendError}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Input */}
              <div className="flex items-end gap-2 px-3 pb-4 pt-2 flex-shrink-0 border-t border-white/8">
                {/* File inputs */}
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileSelect}
                  multiple
                />
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                  multiple
                />

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 rounded-xl text-gray-500 hover:text-gray-300 hover:bg-white/10 cursor-pointer transition-colors flex-shrink-0"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                <button
                  onClick={() => imageInputRef.current?.click()}
                  className="p-2 rounded-xl text-gray-500 hover:text-gray-300 hover:bg-white/10 cursor-pointer transition-colors flex-shrink-0"
                >
                  <ImageIcon className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setShowEmojis((e) => !e)}
                  className={`p-2 rounded-xl transition-colors cursor-pointer flex-shrink-0 ${
                    showEmojis
                      ? "text-indigo-400 bg-indigo-400/15"
                      : "text-gray-500 hover:text-gray-300 hover:bg-white/10"
                  }`}
                >
                  <Smile className="w-4 h-4" />
                </button>

                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Escribe un mensaje…"
                  rows={1}
                  className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-3 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-indigo-500/40 transition-colors resize-none max-h-28 overflow-y-auto"
                />

                <button
                  onClick={handleSend}
                  disabled={sending || (!text.trim() && pendingFiles.length === 0)}
                  className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white shadow-lg shadow-indigo-500/25 cursor-pointer transition-all hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                >
                  {sending ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default Inbox;

/*
═══════════════════════════════════════════════════════════════════════════════
INSTRUCCIONES DE INTEGRACIÓN
═══════════════════════════════════════════════════════════════════════════════

1. IMPORTAR EN HomePage.tsx
─────────────────────────────
  import Inbox from "./chat/Inbox";

2. USAR CON showInbox / setShowInbox
─────────────────────────────────────
  {userId && (
    <Inbox
      isOpen={showInbox}
      onClose={() => setShowInbox(false)}
      currentUserId={userId}
    />
  )}

3. TABLA SUPABASE dm_messages
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

  Storage: bucket PÚBLICO llamado "dm-attachments".
  Realtime: activar INSERT+UPDATE en dm_messages desde el Dashboard de Supabase.

4. VARIABLES DE ENTORNO (.env.local)
─────────────────────────────────────
  VITE_SUPABASE_URL=<tu-url-de-supabase>
  VITE_SUPABASE_ANON_KEY=<tu-anon-key>

5. DEPENDENCIAS
────────────────
  npm install framer-motion lucide-react @supabase/supabase-js

═══════════════════════════════════════════════════════════════════════════════
*/
