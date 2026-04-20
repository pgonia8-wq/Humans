/**
   * GlobalChatRoom.tsx — Premium Chat 2026
   * Refactored: Components, hooks, types, and utils in separate files.
   * All bugs fixed: persistence, memory leaks, race conditions, security.
   * 
   * SQL TABLES REQUIRED (run in Supabase):
   * 
   * CREATE TABLE IF NOT EXISTS chat_reactions (
   *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
   *   room_id TEXT NOT NULL,
   *   message_id TEXT NOT NULL,
   *   user_id TEXT NOT NULL,
   *   emoji TEXT NOT NULL,
   *   created_at TIMESTAMPTZ DEFAULT NOW(),
   *   UNIQUE(message_id, user_id, emoji)
   * );
   * 
   * CREATE TABLE IF NOT EXISTS chat_pins (
   *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
   *   room_id TEXT NOT NULL,
   *   message_id TEXT NOT NULL,
   *   pinned_by TEXT NOT NULL,
   *   created_at TIMESTAMPTZ DEFAULT NOW(),
   *   UNIQUE(room_id, message_id)
   * );
   * 
   * ALTER TABLE chat_rooms ADD CONSTRAINT chat_rooms_name_type_unique UNIQUE(name, type);
   */

  import { useState, useEffect, useRef, useCallback } from "react";
  import { motion, AnimatePresence } from "framer-motion";
  import {
    X, Crown, Hash, Search, Plus, Users, MessageSquare, Sparkles, Lock, ChevronUp, Zap, Flame,
  } from "lucide-react";
  import { MiniKit, Tokens, tokenToDecimals } from "@worldcoin/minikit-js";
  import { supabase } from "../../supabaseClient";
  import type { ChatMessage, ChatRoom, RoomType } from "./chatTypes";
  import type { GlobalChatRoomProps } from "./chatTypes";
  import { DEFAULT_ROOM_NAME, FILE_MAX_SIZE } from "./chatTypes";
  import { cx, generatePayReference, fetchWithTimeout, shouldGroupWithPrev, isDifferentDay, dateSeparator } from "./chatUtils";
  import { useSubscriptions, useProfile, useRooms, useMessages, useReactions, usePins, useRealtime } from "./chatHooks";
  import {
    Avatar, Btn, MessageBubble, ChatInput, TypingIndicator, PinnedBar,
    ShareModal, GoldSubscribeModal, ExtraRoomPayModal, CreateRoomModal,
    DateSeparator, UnreadBanner, AnimatedBg, GlassPanel,
  } from "./chatComponents";

  const RECEIVER = import.meta.env.VITE_PAYMENT_RECEIVER || "";

  export default function GlobalChatRoom({ isOpen, onClose, currentUserId }: GlobalChatRoomProps) {
    const [roomType, setRoomType] = useState<RoomType>("classic");
    const [showGoldModal, setShowGoldModal] = useState(false);
    const [goldLoading, setGoldLoading] = useState(false);
    const [showCreateRoom, setShowCreateRoom] = useState(false);
    const [shareMsg, setShareMsg] = useState<ChatMessage | null>(null);
    const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editText, setEditText] = useState("");
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [showExtraRoomModal, setShowExtraRoomModal] = useState(false);
    const [pendingRoomData, setPendingRoomData] = useState<Omit<ChatRoom, "id"> | null>(null);
    const [extraRoomPayLoading, setExtraRoomPayLoading] = useState(false);
    const [errorToast, setErrorToast] = useState<string | null>(null);
    const [showConnectedPanel, setShowConnectedPanel] = useState(false);
    const [showTokenApp, setShowTokenApp] = useState(false);
    const [tokenPreloaded, setTokenPreloaded] = useState(false);
    const [newMsgCount, setNewMsgCount] = useState(0);

    const bottomRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const errorTimerRef = useRef<ReturnType<typeof setTimeout>>();
    const tokenIframeRef = useRef<HTMLIFrameElement>(null);
    const TOKEN_APP_URL: string = (import.meta as any).env?.VITE_TOKEN_APP_URL ?? "";

    const { hasClassicAccess, setHasClassicAccess, hasGoldAccess, setHasGoldAccess, subsLoading } = useSubscriptions(currentUserId, isOpen);
    const { myUsername, myAvatarUrl } = useProfile(currentUserId, isOpen);
    const { rooms, selectedRoomId, setSelectedRoomId, fetchRooms } = useRooms(currentUserId, isOpen, roomType);
    const { messages, hasMore, addMessage, removeTemp, updateMessage, refetchAndMerge, loadMore } = useMessages(selectedRoomId, isOpen);
    const { reactionsPerRoom, toggleReaction } = useReactions(selectedRoomId, isOpen);
    const { pinnedPerRoom, togglePin } = usePins(selectedRoomId, isOpen);
    const { typingUsers, connected, seenMsgIds, emitTyping, emitSeen } = useRealtime(
      isOpen, selectedRoomId, currentUserId, myUsername, myAvatarUrl, addMessage, refetchAndMerge
    );

    const isGold = roomType === "gold" && hasGoldAccess;
    const filteredRooms = rooms.filter((r) => r.type === roomType);
    const selectedRoom = rooms.find((r) => r.id === selectedRoomId);
    const reactions = selectedRoomId ? (reactionsPerRoom.get(selectedRoomId) ?? {}) : {};
    const pinnedIds = selectedRoomId ? (pinnedPerRoom.get(selectedRoomId) ?? []) : [];

    const now = Date.now();
    const allMessages = messages[selectedRoomId] ?? [];
    const activeMessages = allMessages
      .filter((m) => !m.deletedForAll)
      .filter((m) => !m.ephemeral || now - new Date(m.createdAt).getTime() < 24 * 60 * 60 * 1000)
      .filter((m) => !showSearch || !searchQuery || m.content?.toLowerCase().includes(searchQuery.toLowerCase()));
    const pinnedMessages = allMessages.filter((m) => pinnedIds.includes(m.id));

    const extraRoomPrice = hasGoldAccess ? 12 : 18;
    const noAccess = roomType === "gold" ? !hasGoldAccess : !hasClassicAccess;

    useEffect(() => {
      const timer = setTimeout(() => setTokenPreloaded(true), 10000);
      return () => clearTimeout(timer);
    }, []);

    const showError = useCallback((msg: string) => {
      console.error("[Chat]", msg);
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      setErrorToast(msg);
      errorTimerRef.current = setTimeout(() => setErrorToast(null), 4000);
    }, []);

    const scrollToBottom = useCallback((smooth = true) => {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "instant" });
        setNewMsgCount(0);
      }, 100);
    }, []);

    useEffect(() => {
      if (!isOpen || !selectedRoomId) return;
      scrollToBottom(false);
    }, [isOpen, selectedRoomId, scrollToBottom]);

    useEffect(() => {
      const msgs = messages[selectedRoomId] ?? [];
      if (!msgs.length) return;
      const lastMsg = msgs[msgs.length - 1];
      if (lastMsg.userId === currentUserId) { scrollToBottom(); return; }
      const el = scrollRef.current;
      if (!el) return;
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
      if (atBottom) { scrollToBottom(); emitSeen(lastMsg.id); }
      else { setNewMsgCount(c => c + 1); }
    }, [messages, selectedRoomId, currentUserId, scrollToBottom, emitSeen]);

    const switchRoom = useCallback((id: string) => {
      setSelectedRoomId(id);
      setSearchQuery(""); setShowSearch(false); setReplyTo(null); setEditingId(null);
      setNewMsgCount(0);
    }, [setSelectedRoomId]);

    const handleSwitchType = (type: RoomType) => {
      if (type === "gold" && !hasGoldAccess) { setShowGoldModal(true); return; }
      if (type === "classic" && !hasClassicAccess) return;
      setSelectedRoomId("");
      setRoomType(type);
      setSearchQuery(""); setShowSearch(false); setReplyTo(null); setEditingId(null);
    };

    const handleReact = useCallback((msgId: string, emoji: string) => {
      toggleReaction(msgId, emoji, currentUserId, selectedRoomId);
    }, [toggleReaction, currentUserId, selectedRoomId]);

    const handlePin = useCallback((msgId: string) => {
      togglePin(msgId, currentUserId, selectedRoomId);
    }, [togglePin, currentUserId, selectedRoomId]);

    const handleStartEdit = useCallback((msgId: string) => {
      const msg = allMessages.find(m => m.id === msgId);
      if (msg?.content) { setEditingId(msgId); setEditText(msg.content); }
    }, [allMessages]);

    const handleSaveEdit = useCallback(async (msgId: string) => {
      if (!editText.trim()) return;
      try {
        const { error } = await supabase.from("global_chat_messages")
          .update({ content: editText.trim(), edited_at: new Date().toISOString() })
          .eq("id", msgId).eq("sender_id", currentUserId);
        if (error) { showError("Error al editar mensaje"); return; }
        updateMessage(selectedRoomId, msgId, { content: editText.trim(), editedAt: new Date().toISOString() });
      } catch { showError("Error al editar mensaje"); }
      setEditingId(null); setEditText("");
    }, [editText, currentUserId, selectedRoomId, updateMessage, showError]);

    const handleDelete = useCallback(async (msgId: string) => {
      try {
        const { error } = await supabase.from("global_chat_messages")
          .update({ deleted_for_all: true })
          .eq("id", msgId).eq("sender_id", currentUserId);
        if (error) { showError("Error al eliminar"); return; }
        updateMessage(selectedRoomId, msgId, { deletedForAll: true });
      } catch { showError("Error al eliminar"); }
    }, [currentUserId, selectedRoomId, updateMessage, showError]);


  function sanitizeChat(input: string): string {
    return input
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/javascript:/gi, "")
      .replace(/on\w+=/gi, "")
      .slice(0, 2000);
  }
  
    const handleSend = useCallback(async (content: string, file?: File, audioBlob?: Blob, ephemeral?: boolean, replyMsg?: ChatMessage) => {
      if (!content.trim() && !file && !audioBlob) return;
      const username = myUsername || `@${currentUserId.slice(0, 6)}`;
      let fileUrl: string | undefined, fileName: string | undefined, fileType: string | undefined, audioUrl: string | undefined;

      if (file && file.size > FILE_MAX_SIZE) { showError("Archivo muy grande (máx 10 MB)"); return; }

      if (audioBlob) {
        const ext = audioBlob.type.includes("ogg") ? "ogg" : "webm";
        const path = `${currentUserId}/voice-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("chat-files").upload(path, audioBlob, { cacheControl: "3600", contentType: audioBlob.type });
        if (upErr) { showError("Error al subir audio"); return; }
        const { data: urlData } = supabase.storage.from("chat-files").getPublicUrl(path);
        audioUrl = urlData.publicUrl;
      }

      if (file) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_{2,}/g, "_");
        const path = `${currentUserId}/${Date.now()}-${safeName}`;
        const { error: upErr } = await supabase.storage.from("chat-files").upload(path, file, { cacheControl: "3600", contentType: file.type });
        if (upErr) { showError("Error al subir archivo"); return; }
        const { data: urlData } = supabase.storage.from("chat-files").getPublicUrl(path);
        fileUrl = urlData.publicUrl; fileName = file.name; fileType = file.type;
      }

      const tempId = `temp-${Date.now()}`;
      const optimistic: ChatMessage = {
        id: tempId, roomId: selectedRoomId, userId: currentUserId, username,
        avatarUrl: myAvatarUrl, content: content.trim() || undefined,
        fileUrl, fileName, fileType, audioUrl,
        replyToId: replyMsg?.id, replyToContent: replyMsg?.content, replyToUsername: replyMsg?.username,
        ephemeral: ephemeral ?? false, createdAt: new Date().toISOString(), status: "sending",
      };
      addMessage(selectedRoomId, optimistic);
      setReplyTo(null);

      const payload: Record<string, unknown> = {
        room_id: selectedRoomId, sender_id: currentUserId, content: content.trim() ? sanitizeChat(content.trim()) : null,
      };
      if (username) payload.username = username;
      if (myAvatarUrl) payload.avatar_url = myAvatarUrl;
      if (fileUrl) payload.file_url = fileUrl;
      if (fileName) payload.file_name = fileName;
      if (fileType) payload.file_type = fileType;
      if (audioUrl) payload.audio_url = audioUrl;
      if (replyMsg?.id) payload.reply_to_id = replyMsg.id;
      if (replyMsg?.content) payload.reply_to_content = sanitizeChat(replyMsg.content);
      if (replyMsg?.username) payload.reply_to_username = replyMsg.username;
      if (ephemeral) payload.ephemeral = true;

      const { error } = await supabase.from("global_chat_messages").insert(payload);
      if (error) {
        removeTemp(selectedRoomId, tempId);
        showError("Error al enviar mensaje");
      } else {
        await refetchAndMerge(selectedRoomId);
      }
    }, [selectedRoomId, currentUserId, myUsername, myAvatarUrl, addMessage, removeTemp, refetchAndMerge, showError]);

    const handleGoldSubscribe = async () => {
      if (!currentUserId || !MiniKit.isInstalled()) {
        showError("Abre esta app desde World App");
        return;
      }
      setGoldLoading(true);
      try {
        const payRes = await MiniKit.commandsAsync.pay({
          reference: generatePayReference(),
          to: RECEIVER,
          tokens: [{ symbol: Tokens.WLD, token_amount: tokenToDecimals(9.99, Tokens.WLD).toString() }],
          description: "Suscripción Gold Chat",
        });
        if (payRes?.finalPayload?.status !== "success") return;
        const transactionId = payRes.finalPayload.transaction_id;
        try {
          const verifyRes = await fetchWithTimeout("/api/verifyPayment", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ transactionId, userId: currentUserId, action: "chat_gold" }),
          });
          if (!verifyRes.ok) {
            const errData = await verifyRes.json().catch(() => ({}));
            showError((errData as { error?: string }).error ?? "Error en el servidor");
            return;
          }
        } catch (e: unknown) {
          showError(`Error de red: ${e instanceof Error ? e.message : String(e)}`);
          return;
        }
        setHasGoldAccess(true); setHasClassicAccess(true);
        setShowGoldModal(false); setRoomType("gold"); setSelectedRoomId("");
      } catch (e: unknown) {
        showError(`Error en pago: ${e instanceof Error ? e.message : String(e)}`);
      } finally { setGoldLoading(false); }
    };

    const handlePayForExtraRoom = async (amount: number) => {
      if (!pendingRoomData || !MiniKit.isInstalled()) {
        showError("Abre esta app desde World App");
        return;
      }
      setExtraRoomPayLoading(true);
      try {
        const payRes = await MiniKit.commandsAsync.pay({
          reference: generatePayReference(), to: RECEIVER,
          tokens: [{ symbol: Tokens.WLD, token_amount: tokenToDecimals(amount, Tokens.WLD).toString() }],
          description: "Sala adicional",
        });
        if (payRes?.finalPayload?.status !== "success") return;
        try {
          const verifyRes = await fetchWithTimeout("/api/verifyPayment", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ transactionId: payRes.finalPayload.transaction_id, userId: currentUserId, action: "extra_room" }),
          });
          if (!verifyRes.ok) {
            const errData = await verifyRes.json().catch(() => ({}));
            showError((errData as { error?: string }).error ?? "Error del servidor");
            return;
          }
        } catch (e: unknown) {
          showError(`Error de red: ${e instanceof Error ? e.message : String(e)}`);
          return;
        }
        await insertRoom(pendingRoomData);
        setShowExtraRoomModal(false); setPendingRoomData(null);
      } catch (e: unknown) {
        showError(`Error en pago: ${e instanceof Error ? e.message : String(e)}`);
      } finally { setExtraRoomPayLoading(false); }
    };

    const insertRoom = async (data: Omit<ChatRoom, "id">) => {
      try {
        const { data: inserted, error } = await supabase.from("chat_rooms")
          .insert({ name: data.name, type: data.type, is_private: data.isPrivate, description: data.description ?? null, created_by: currentUserId })
          .select("id").maybeSingle();
        if (error) { showError(`Error al crear sala: ${error.message}`); return; }
        if (inserted?.id) { await fetchRooms(); switchRoom(String(inserted.id)); }
      } catch (e: unknown) {
        showError(`Error al crear sala: ${e instanceof Error ? e.message : String(e)}`);
      }
    };

    const handleCreateRoom = async (data: Omit<ChatRoom, "id">) => {
      const enforcedType: RoomType = hasGoldAccess ? "gold" : "classic";
      const roomData = { ...data, type: enforcedType };
      try {
        const { count, error: countError } = await supabase.from("chat_rooms")
          .select("*", { count: "exact", head: true })
          .eq("created_by", currentUserId).eq("type", enforcedType).neq("name", DEFAULT_ROOM_NAME);
        if (countError) console.error("[Chat] count error:", countError.message);
        const userCount = count ?? 0;
        if (hasGoldAccess) {
          if (userCount < 5) await insertRoom(roomData);
          else { setPendingRoomData(roomData); setShowExtraRoomModal(true); }
        } else {
          if (userCount < 2) await insertRoom(roomData);
          else showError("Hazte Gold para crear más salas");
        }
        setShowCreateRoom(false);
      } catch (e: unknown) {
        showError(`Error: ${e instanceof Error ? e.message : String(e)}`);
      }
    };

    const handleScroll = useCallback(() => {
      const el = scrollRef.current;
      if (!el) return;
      if (el.scrollTop < 80 && hasMore[selectedRoomId]) loadMore();
    }, [hasMore, selectedRoomId, loadMore]);

    if (!isOpen) return null;

    return (
      <>
        <AnimatePresence>
          {isOpen && !showTokenApp && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9998]"
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 300 }}
                className="relative flex flex-col w-full h-full overflow-hidden"
                style={isGold ? {
                  background: [
                    "radial-gradient(ellipse at 20% 15%, rgba(180,120,0,0.22) 0%, transparent 52%)",
                    "radial-gradient(ellipse at 80% 80%, rgba(120,80,0,0.18) 0%, transparent 52%)",
                    "#07050a",
                  ].join(","),
                } : {
                  background: [
                    "radial-gradient(ellipse at 15% 20%, rgba(99,102,241,0.22) 0%, transparent 52%)",
                    "radial-gradient(ellipse at 85% 78%, rgba(168,85,247,0.18) 0%, transparent 52%)",
                    "radial-gradient(ellipse at 60% 8%, rgba(6,182,212,0.13) 0%, transparent 44%)",
                    "#06060d",
                  ].join(","),
                }}
              >
                {/* ═══ HEADER ═══ */}
                <div
                  className="flex items-center gap-1.5 px-2 pt-[env(safe-area-inset-top,8px)] pb-2 flex-shrink-0"
                  style={{
                    backdropFilter: "blur(36px)",
                    WebkitBackdropFilter: "blur(36px)",
                    background: "rgba(6,6,13,0.82)",
                    borderBottom: "1px solid rgba(255,255,255,0.08)",
                    boxShadow: "0 4px 24px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)",
                  }}
                >
                  {/* Tabs tipo: Clásico / Gold */}
                  <div className="flex gap-1 flex-shrink-0">
                    {(["classic", "gold"] as RoomType[]).map((t) => {
                      const active = roomType === t;
                      return (
                        <button
                          key={t}
                          onClick={() => handleSwitchType(t)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-black tracking-wide transition-all duration-200 cursor-pointer"
                          style={active ? {
                            background: t === "gold"
                              ? "linear-gradient(160deg, #2a1900 0%, #1a1000 45%, #100900 100%)"
                              : "linear-gradient(160deg, #2c2c2c 0%, #1a1a1a 45%, #0f0f0f 100%)",
                            border: t === "gold"
                              ? "1px solid rgba(245,158,11,0.28)"
                              : "1px solid rgba(255,255,255,0.14)",
                            boxShadow: t === "gold"
                              ? "0 4px 14px rgba(0,0,0,0.65), inset 0 1px 0 rgba(245,158,11,0.22)"
                              : "0 4px 14px rgba(0,0,0,0.70), inset 0 1px 0 rgba(255,255,255,0.22)",
                            color: t === "gold" ? "#fbbf24" : "#ffffff",
                          } : {
                            color: "rgba(255,255,255,0.30)",
                            border: "1px solid transparent",
                          }}
                        >
                          {t === "gold" ? <Crown className="h-3 w-3" /> : <Hash className="h-3 w-3" />}
                          {t === "classic" ? "Clásico" : "Gold"}
                        </button>
                      );
                    })}
                  </div>

                  {/* Tabs de sala */}
                  <div className="flex-1 flex items-center gap-1 overflow-x-auto scrollbar-none min-w-0 mx-0.5">
                    {filteredRooms.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => switchRoom(r.id)}
                        title={r.name}
                        className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all duration-200 cursor-pointer whitespace-nowrap"
                        style={r.id === selectedRoomId ? {
                          background: isGold
                            ? "linear-gradient(160deg, #2a1900 0%, #1a1000 45%, #100900 100%)"
                            : "linear-gradient(160deg, #2c2c2c 0%, #1a1a1a 45%, #0f0f0f 100%)",
                          border: isGold
                            ? "1px solid rgba(245,158,11,0.24)"
                            : "1px solid rgba(255,255,255,0.14)",
                          boxShadow: "0 2px 10px rgba(0,0,0,0.60), inset 0 1px 0 rgba(255,255,255,0.18)",
                          color: isGold ? "#fbbf24" : "#ffffff",
                        } : {
                          color: "rgba(255,255,255,0.30)",
                          border: "1px solid transparent",
                        }}
                      >
                        {r.isPrivate && <Lock className="h-2.5 w-2.5 flex-shrink-0" />}
                        {r.name.length > 12 ? r.name.slice(0, 12) + "…" : r.name}
                      </button>
                    ))}
                  </div>

                  {/* Botones icono */}
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <button
                      onClick={() => setShowSearch(s => !s)}
                      className="p-1.5 rounded-xl transition-all cursor-pointer"
                      style={showSearch ? {
                        background: "linear-gradient(160deg, #2c2c2c 0%, #1a1a1a 45%, #0f0f0f 100%)",
                        color: "#ffffff", border: "1px solid rgba(255,255,255,0.14)",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18)",
                      } : { color: "rgba(255,255,255,0.40)" }}
                    >
                      <Search className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => { if (!hasClassicAccess && !hasGoldAccess) { showError("Necesitas suscripción"); return; } setShowCreateRoom(true); }}
                      className="p-1.5 rounded-xl transition-all cursor-pointer"
                      style={{ color: "rgba(255,255,255,0.40)" }}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setShowConnectedPanel(p => !p)}
                      className="relative p-1.5 rounded-xl transition-all cursor-pointer"
                      style={showConnectedPanel ? {
                        background: "linear-gradient(160deg, #2c2c2c 0%, #1a1a1a 45%, #0f0f0f 100%)",
                        color: "#ffffff", border: "1px solid rgba(255,255,255,0.14)",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18)",
                      } : { color: "rgba(255,255,255,0.40)" }}
                    >
                      <Users className="h-3.5 w-3.5" />
                      {connected.length > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 text-[8px] bg-emerald-500 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center font-black shadow-lg">
                          {connected.length}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => setShowTokenApp(true)}
                      className="p-1.5 rounded-xl transition-all cursor-pointer text-sm leading-none"
                      style={{ color: "rgba(255,255,255,0.40)" }}
                      title="Token Market"
                    >🪙</button>
                    <button
                      onClick={onClose}
                      className="p-1.5 rounded-xl transition-all cursor-pointer"
                      style={{ color: "rgba(255,255,255,0.50)" }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Panel de conectados */}
                <AnimatePresence>
                  {showConnectedPanel && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="relative z-10 px-4 py-3 flex-shrink-0 overflow-hidden"
                      style={{
                        background: "rgba(10,10,18,0.72)",
                        backdropFilter: "blur(24px)",
                        WebkitBackdropFilter: "blur(24px)",
                        borderBottom: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[11px] font-bold" style={{ color: "rgba(255,255,255,0.55)" }}>
                          {connected.length + 1} en esta sala
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <span
                          className="px-2.5 py-1 rounded-xl text-[10px] font-bold"
                          style={{
                            background: "linear-gradient(160deg, #2c2c2c 0%, #1a1a1a 45%, #0f0f0f 100%)",
                            color: "#ffffff", border: "1px solid rgba(255,255,255,0.14)",
                          }}
                        >Tú</span>
                        {connected.map((u) => (
                          <span
                            key={u.userId}
                            className="px-2.5 py-1 rounded-xl text-[10px] font-medium"
                            style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.50)", border: "1px solid rgba(255,255,255,0.06)" }}
                          >
                            {u.username || `@${u.userId.slice(0, 6)}`}
                          </span>
                        ))}
                        {connected.length === 0 && (
                          <span className="text-[10px] italic" style={{ color: "rgba(255,255,255,0.25)" }}>Solo tú en esta sala</span>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Buscador */}
                <AnimatePresence>
                  {showSearch && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="relative z-10 px-4 py-2.5 flex-shrink-0"
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                    >
                      <input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar mensajes…"
                        className="w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none transition-all duration-200 font-medium"
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", caretColor: "#a855f7" }}
                        autoFocus
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Pinned */}
                <AnimatePresence>
                  {pinnedMessages.length > 0 && <PinnedBar messages={pinnedMessages} isGold={isGold} onUnpin={handlePin} />}
                </AnimatePresence>

                {/* ═══ MESSAGES ═══ */}
                <div ref={scrollRef} onScroll={handleScroll}
                  className="relative z-10 flex-1 overflow-y-auto px-3 py-4 scroll-smooth">

                  {hasMore[selectedRoomId] && (
                    <button onClick={loadMore}
                      className="w-full text-center py-2 text-[10px] text-white/35 hover:text-white/60 cursor-pointer transition-colors mb-2">
                      <ChevronUp className="h-3 w-3 mx-auto mb-0.5" />
                      Cargar más
                    </button>
                  )}

                  {subsLoading && (
                    <div className="flex flex-col items-center justify-center h-full gap-5">
                      <div className="relative">
                        <div className={cx("w-14 h-14 rounded-full border-[3px] animate-spin",
                          isGold ? "border-amber-500/10 border-t-amber-400" : "border-violet-500/10 border-t-violet-400")} />
                        <div className={cx("absolute inset-0 w-14 h-14 rounded-full border-[3px] animate-spin",
                          isGold ? "border-transparent border-b-yellow-500/40" : "border-transparent border-b-fuchsia-500/40")}
                          style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
                        <Sparkles className={cx("h-5 w-5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse",
                          isGold ? "text-amber-400" : "text-violet-400")} />
                      </div>
                      <p className={cx("text-sm font-bold tracking-wide", isGold ? "text-amber-300/50" : "text-violet-300/50")}>Cargando chat…</p>
                    </div>
                  )}

                  {!subsLoading && noAccess && (
                    <div className="flex flex-col items-center justify-center h-full gap-5 text-center px-6">
                      {roomType === "gold" ? (
                        <>
                          <div className="p-5 rounded-3xl bg-gradient-to-br from-amber-400/8 to-yellow-500/[0.03] border border-amber-400/8 shadow-[0_0_40px_rgba(245,158,11,0.08)]">
                            <Crown className="h-12 w-12 text-amber-400/70" />
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-yellow-400 mb-1.5">Chat Gold</p>
                            <p className="text-[13px] text-amber-200/50 leading-relaxed max-w-[220px]">Salas exclusivas y funciones premium para la comunidad selecta</p>
                          </div>
                          <Btn variant="gold" onClick={() => setShowGoldModal(true)} className="mt-2">
                            <Zap className="h-4 w-4" /> Obtener Gold
                          </Btn>
                        </>
                      ) : (
                        <>
                          <div className="p-4 rounded-3xl bg-violet-500/5 border border-violet-500/10">
                            <MessageSquare className="h-10 w-10 text-violet-400/60" />
                          </div>
                          <p className="text-sm text-violet-200/50">Necesitas suscripción para acceder al chat</p>
                        </>
                      )}
                    </div>
                  )}

                  {!subsLoading && !noAccess && activeMessages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full gap-5 text-center">
                      <div className={cx("p-5 rounded-3xl border",
                        isGold ? "bg-amber-500/[0.04] border-amber-400/8" : "bg-violet-500/[0.04] border-violet-400/8")}>
                        <MessageSquare className={cx("h-10 w-10", isGold ? "text-amber-400/20" : "text-violet-400/20")} />
                      </div>
                      <div>
                        <p className={cx("text-sm font-black tracking-wide mb-1", isGold ? "text-amber-200/45" : "text-white/40")}>¡Sé el primero en escribir!</p>
                        <p className="text-[11px] text-white/25 font-medium">Los mensajes aparecerán aquí</p>
                      </div>
                    </div>
                  )}

                  {!subsLoading && !noAccess && activeMessages.map((msg, idx) => {
                    const prev = activeMessages[idx - 1];
                    const showDate = !prev || isDifferentDay(prev.createdAt, msg.createdAt);
                    const grouped = false;
                    return (
                      <div key={msg.id}>
                        {showDate && <DateSeparator label={dateSeparator(msg.createdAt)} />}
                        <MessageBubble
                          message={msg} isOwn={msg.userId === currentUserId} isGold={isGold} isGrouped={grouped}
                          currentUserId={currentUserId} reactions={reactions[msg.id] ?? {}} seenByOthers={seenMsgIds.has(msg.id)}
                          editingId={editingId} editText={editText} setEditText={setEditText}
                          onShare={setShareMsg} onReply={setReplyTo} onReact={handleReact}
                          onEdit={handleStartEdit} onDelete={handleDelete} onPin={handlePin}
                          onSaveEdit={handleSaveEdit} onCancelEdit={() => { setEditingId(null); setEditText(""); }}
                        />
                      </div>
                    );
                  })}

                  <AnimatePresence>
                    {typingUsers.length > 0 && <TypingIndicator users={typingUsers} />}
                  </AnimatePresence>
                  <div ref={bottomRef} />
                </div>

                {/* Unread banner */}
                <AnimatePresence>
                  <UnreadBanner count={newMsgCount} onClick={() => scrollToBottom()} />
                </AnimatePresence>

                {/* Error toast */}
                <AnimatePresence>
                  {errorToast && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                      className="absolute bottom-20 left-4 right-4 z-50 flex items-center justify-between gap-3"
                      style={{
                        padding: "12px 16px",
                        borderRadius: "16px",
                        background: "rgba(10,10,18,0.92)",
                        backdropFilter: "blur(24px)",
                        WebkitBackdropFilter: "blur(24px)",
                        border: "1px solid rgba(255,255,255,0.10)",
                        boxShadow: "0 8px 32px rgba(0,0,0,0.70), inset 0 1px 0 rgba(255,255,255,0.07)",
                        color: "#ffffff",
                        fontSize: "13px",
                        fontWeight: 600,
                      }}
                    >
                      <span>{errorToast}</span>
                      <button onClick={() => setErrorToast(null)} className="flex-shrink-0 cursor-pointer" style={{ color: "rgba(255,255,255,0.45)" }}>
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ═══ INPUT ═══ */}
                {!noAccess && (
                  <div className="relative z-10">
                  <ChatInput onSend={handleSend} onTyping={emitTyping} isGold={isGold} hasGoldAccess={hasGoldAccess}
                    disabled={!selectedRoomId} replyTo={replyTo} onCancelReply={() => setReplyTo(null)} onShowToast={showError} />
                  </div>
                )}

                {/* Modals */}
                <AnimatePresence>
                  {showGoldModal && <GoldSubscribeModal onClose={() => setShowGoldModal(false)} onSubscribe={handleGoldSubscribe} loading={goldLoading} />}
                  {showCreateRoom && (
                    <CreateRoomModal onClose={() => setShowCreateRoom(false)} onCreate={handleCreateRoom}
                      canCreateGold={hasGoldAccess} forcedType={hasGoldAccess ? "gold" : "classic"} />
                  )}
                  {showExtraRoomModal && (
                    <ExtraRoomPayModal onClose={() => { setShowExtraRoomModal(false); setPendingRoomData(null); }}
                      onPay={() => handlePayForExtraRoom(extraRoomPrice)} loading={extraRoomPayLoading}
                      amount={extraRoomPrice} isGoldPrice={hasGoldAccess} />
                  )}
                  {shareMsg && <ShareModal message={shareMsg} onClose={() => setShareMsg(null)} />}
                </AnimatePresence>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Token mini-app */}
        <AnimatePresence>
          {showTokenApp && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9999] bg-black">
              <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 300 }} className="w-full h-full flex flex-col">
                <div
                  className="flex items-center justify-between px-3 pt-[env(safe-area-inset-top,8px)] pb-2 flex-shrink-0"
                  style={{
                    backdropFilter: "blur(36px)",
                    WebkitBackdropFilter: "blur(36px)",
                    background: "rgba(6,6,13,0.92)",
                    borderBottom: "1px solid rgba(255,255,255,0.08)",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.55)",
                  }}
                >
                  <span className="text-sm font-black tracking-wide" style={{ color: "rgba(255,255,255,0.80)" }}>Token Market</span>
                  <button
                    onClick={() => setShowTokenApp(false)}
                    className="p-1.5 rounded-xl cursor-pointer transition-all"
                    style={{ color: "rgba(255,255,255,0.40)" }}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <iframe ref={tokenIframeRef} src={TOKEN_APP_URL || undefined}
                  className="flex-1 w-full border-none bg-black" title="Token Market"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {tokenPreloaded && TOKEN_APP_URL && !showTokenApp && (
          <iframe src={TOKEN_APP_URL} className="hidden" title="Token Preload" tabIndex={-1} />
        )}
      </>
    );
  }
  