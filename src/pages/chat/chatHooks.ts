
  import { useState, useEffect, useRef, useCallback } from "react";
  import { supabase } from "../../supabaseClient";
  import type { ChatRoom, ChatMessage, ChatReaction, ChatPin, TypingUser, ConnectedUser, RoomType } from "./chatTypes";
  import { DEFAULT_ROOM_NAME, MESSAGES_PER_PAGE } from "./chatTypes";
  import { rowToMessage } from "./chatUtils";

  export function useSubscriptions(currentUserId: string, isOpen: boolean) {
    const [hasClassicAccess, setHasClassicAccess] = useState(false);
    const [hasGoldAccess, setHasGoldAccess] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      if (!currentUserId || !isOpen) return;
      let cancelled = false;
      const check = async () => {
        try {
          setLoading(true);
          const { data, error } = await supabase.from("subscriptions").select("product")
            .eq("user_id", currentUserId).in("product", ["chat_classic", "chat_gold"]);
          if (error || cancelled) return;
          const products = (data ?? []).map((r: { product: string }) => r.product);
          const classic = products.includes("chat_classic");
          const gold = products.includes("chat_gold");
          setHasClassicAccess(classic || gold);
          setHasGoldAccess(gold);
        } catch (e) {
          console.error("[Chat] Error subscriptions:", e);
        } finally {
          if (!cancelled) setLoading(false);
        }
      };
      check();
      return () => { cancelled = true; };
    }, [currentUserId, isOpen]);

    return { hasClassicAccess, setHasClassicAccess, hasGoldAccess, setHasGoldAccess, subsLoading: loading };
  }

  export function useProfile(currentUserId: string, isOpen: boolean) {
    const [myUsername, setMyUsername] = useState("");
    const [myAvatarUrl, setMyAvatarUrl] = useState<string | undefined>(undefined);

    useEffect(() => {
      if (!currentUserId || !isOpen) return;
      let cancelled = false;
      const fetchProfile = async () => {
        try {
          const { data } = await supabase.from("profiles")
            .select("username, avatar_url")
            .eq("id", currentUserId)
            .maybeSingle();
          if (cancelled) return;
          if (data?.username) setMyUsername(String(data.username));
          if (data?.avatar_url) setMyAvatarUrl(String(data.avatar_url));
        } catch (e) {
          console.error("[Chat] Error profile:", e);
        }
      };
      fetchProfile();
      return () => { cancelled = true; };
    }, [currentUserId, isOpen]);

    return { myUsername, myAvatarUrl };
  }

  export function useRooms(currentUserId: string, isOpen: boolean, roomType: RoomType) {
    const [rooms, setRooms] = useState<ChatRoom[]>([]);
    const [selectedRoomId, setSelectedRoomId] = useState("");

    const ensureDefaultRooms = useCallback(async (parsed: ChatRoom[]) => {
      let result = [...parsed];
      const types: Array<{ type: RoomType; desc: string }> = [
        { type: "classic", desc: "Sala general de bienvenida" },
        { type: "gold", desc: "Sala general Gold exclusiva" },
      ];
      for (const { type, desc } of types) {
        if (result.some(r => r.name === DEFAULT_ROOM_NAME && r.type === type)) continue;
        try {
          const { data: inserted } = await supabase.from("chat_rooms")
            .upsert(
              { name: DEFAULT_ROOM_NAME, type, is_private: false, description: desc, created_by: currentUserId },
              { onConflict: "name,type", ignoreDuplicates: true }
            )
            .select("id, name, type, is_private, description, created_by")
            .maybeSingle();
          if (inserted) {
            result.push({
              id: String(inserted.id), name: String(inserted.name), type,
              isPrivate: false,
              description: inserted.description ? String(inserted.description) : undefined,
              createdBy: inserted.created_by ? String(inserted.created_by) : undefined,
            });
          }
        } catch (e) {
          console.error("[Chat] Error ensureDefaultRooms:", type, e);
        }
      }
      return result;
    }, [currentUserId]);

    const fetchRooms = useCallback(async () => {
      try {
        const { data, error } = await supabase.from("chat_rooms")
          .select("id, name, type, is_private, description, created_by")
          .order("created_at", { ascending: true });
        if (error) { console.error("[Chat] Error rooms:", error.message); return; }
        let parsed: ChatRoom[] = (data ?? []).map((r: Record<string, unknown>) => ({
          id: String(r.id), name: String(r.name), type: String(r.type) as RoomType,
          isPrivate: Boolean(r.is_private),
          description: r.description ? String(r.description) : undefined,
          createdBy: r.created_by ? String(r.created_by) : undefined,
        }));
        parsed = await ensureDefaultRooms(parsed);
        setRooms(parsed);
        setSelectedRoomId((cur) => {
          if (cur && parsed.some(r => r.id === cur)) return cur;
          const def = parsed.find(r => r.type === roomType);
          return def?.id || "";
        });
      } catch (e) {
        console.error("[Chat] Error fetchRooms:", e);
      }
    }, [roomType, ensureDefaultRooms]);

    useEffect(() => {
      if (!isOpen || !currentUserId) return;
      fetchRooms();
    }, [isOpen, currentUserId, fetchRooms]);

    return { rooms, selectedRoomId, setSelectedRoomId, fetchRooms };
  }

  export function useMessages(selectedRoomId: string, isOpen: boolean) {
    const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
    const [hasMore, setHasMore] = useState<Record<string, boolean>>({});

    const fetchMessages = useCallback(async (roomId: string, before?: string) => {
      if (!roomId) return;
      try {
        let data: Record<string, unknown>[] | null = null;
        let error: { message: string } | null = null;

        try {
          let q = supabase
            .from("global_chat_messages")
            .select("*, profiles:sender_id(username, avatar_url)")
            .eq("room_id", roomId)
            .order("created_at", { ascending: false })
            .limit(MESSAGES_PER_PAGE);
          if (before) q = q.lt("created_at", before);
          const res = await q;
          data = res.data as Record<string, unknown>[] | null;
          error = res.error;
        } catch {}

        if (error) {
          let q2 = supabase
            .from("global_chat_messages")
            .select("*")
            .eq("room_id", roomId)
            .order("created_at", { ascending: false })
            .limit(MESSAGES_PER_PAGE);
          if (before) q2 = q2.lt("created_at", before);
          const res2 = await q2;
          data = res2.data as Record<string, unknown>[] | null;
          if (res2.error) { console.error("[Chat] Error messages:", res2.error.message); return; }
        }

        const parsed = (data ?? []).map((r) => rowToMessage(r as Record<string, unknown>)).reverse();
        setHasMore(prev => ({ ...prev, [roomId]: (data?.length ?? 0) >= MESSAGES_PER_PAGE }));

        if (before) {
          setMessages(prev => ({
            ...prev,
            [roomId]: [...parsed, ...(prev[roomId] ?? [])],
          }));
        } else {
          setMessages(prev => ({ ...prev, [roomId]: parsed }));
        }
      } catch (e) {
        console.error("[Chat] Error fetchMessages:", e);
      }
    }, []);

    useEffect(() => {
      if (!isOpen || !selectedRoomId) return;
      fetchMessages(selectedRoomId);
    }, [isOpen, selectedRoomId, fetchMessages]);

    const loadMore = useCallback(async () => {
      const msgs = messages[selectedRoomId];
      if (!msgs?.length || !hasMore[selectedRoomId]) return;
      await fetchMessages(selectedRoomId, msgs[0].createdAt);
    }, [selectedRoomId, messages, hasMore, fetchMessages]);

    const addMessage = useCallback((roomId: string, msg: ChatMessage) => {
      setMessages(prev => {
        const existing = prev[roomId] ?? [];
        if (existing.some(m => m.id === msg.id)) return prev;
        return { ...prev, [roomId]: [...existing, msg] };
      });
    }, []);

    const removeTemp = useCallback((roomId: string, tempId: string) => {
      setMessages(prev => ({
        ...prev,
        [roomId]: (prev[roomId] ?? []).filter(m => m.id !== tempId),
      }));
    }, []);

    const updateMessage = useCallback((roomId: string, msgId: string, updates: Partial<ChatMessage>) => {
      setMessages(prev => ({
        ...prev,
        [roomId]: (prev[roomId] ?? []).map(m => m.id === msgId ? { ...m, ...updates } : m),
      }));
    }, []);

    const refetchAndMerge = useCallback(async (roomId: string) => {
      if (!roomId) return;
      try {
        let data: Record<string, unknown>[] | null = null;
        const res1 = await supabase
          .from("global_chat_messages")
          .select("*, profiles:sender_id(username, avatar_url)")
          .eq("room_id", roomId)
          .order("created_at", { ascending: false })
          .limit(MESSAGES_PER_PAGE);
        if (res1.error) {
          const res2 = await supabase
            .from("global_chat_messages")
            .select("*")
            .eq("room_id", roomId)
            .order("created_at", { ascending: false })
            .limit(MESSAGES_PER_PAGE);
          if (res2.error) return;
          data = res2.data as Record<string, unknown>[] | null;
        } else {
          data = res1.data as Record<string, unknown>[] | null;
        }
        const fresh = (data ?? []).map(r => rowToMessage(r as Record<string, unknown>)).reverse();
        const freshIds = new Set(fresh.map(m => m.id));
        setMessages(prev => {
          const existing = prev[roomId] ?? [];
          const merged = [
            ...existing.filter(m => !m.id.startsWith("temp-") && !freshIds.has(m.id)),
            ...fresh,
          ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          return { ...prev, [roomId]: merged };
        });
      } catch (e) {
        console.error("[Chat] Error refetch:", e);
      }
    }, []);

    return { messages, hasMore, addMessage, removeTemp, updateMessage, refetchAndMerge, loadMore, setMessages };
  }

  export function useReactions(selectedRoomId: string, isOpen: boolean) {
    const [reactionsPerRoom, setReactionsPerRoom] = useState<Map<string, Record<string, Record<string, string[]>>>>(new Map());

    useEffect(() => {
      if (!isOpen || !selectedRoomId) return;
      let cancelled = false;
      const load = async () => {
        try {
          const { data, error } = await supabase.from("chat_reactions")
            .select("message_id, user_id, emoji")
            .eq("room_id", selectedRoomId);
          if (error || cancelled) {
            if (error?.code === "42P01") return;
            return;
          }
          const map: Record<string, Record<string, string[]>> = {};
          for (const r of (data ?? [])) {
            const msgId = String(r.message_id);
            const emoji = String(r.emoji);
            const userId = String(r.user_id);
            if (!map[msgId]) map[msgId] = {};
            if (!map[msgId][emoji]) map[msgId][emoji] = [];
            if (!map[msgId][emoji].includes(userId)) map[msgId][emoji].push(userId);
          }
          setReactionsPerRoom(prev => new Map(prev).set(selectedRoomId, map));
        } catch { }
      };
      load();
      return () => { cancelled = true; };
    }, [isOpen, selectedRoomId]);

    const toggleReaction = useCallback(async (messageId: string, emoji: string, userId: string, roomId: string) => {
      setReactionsPerRoom(prev => {
        const next = new Map(prev);
        const room = { ...(next.get(roomId) ?? {}) };
        const msgReactions = { ...(room[messageId] ?? {}) };
        const users = [...(msgReactions[emoji] ?? [])];
        const idx = users.indexOf(userId);
        if (idx >= 0) users.splice(idx, 1); else users.push(userId);
        if (users.length === 0) delete msgReactions[emoji]; else msgReactions[emoji] = users;
        room[messageId] = msgReactions;
        next.set(roomId, room);
        return next;
      });

      try {
        const { data: existing } = await supabase.from("chat_reactions")
          .select("id").eq("message_id", messageId).eq("user_id", userId).eq("emoji", emoji).maybeSingle();
        if (existing) {
          await supabase.from("chat_reactions").delete().eq("id", existing.id);
        } else {
          await supabase.from("chat_reactions").insert({ message_id: messageId, user_id: userId, emoji, room_id: roomId });
        }
      } catch (e) {
        console.error("[Chat] Error toggling reaction:", e);
      }
    }, []);

    return { reactionsPerRoom, toggleReaction };
  }

  export function usePins(selectedRoomId: string, isOpen: boolean) {
    const [pinnedPerRoom, setPinnedPerRoom] = useState<Map<string, string[]>>(new Map());

    useEffect(() => {
      if (!isOpen || !selectedRoomId) return;
      let cancelled = false;
      const load = async () => {
        try {
          const { data, error } = await supabase.from("chat_pins")
            .select("message_id").eq("room_id", selectedRoomId);
          if (error || cancelled) {
            if (error?.code === "42P01") return;
            return;
          }
          const ids = (data ?? []).map(r => String(r.message_id));
          setPinnedPerRoom(prev => new Map(prev).set(selectedRoomId, ids));
        } catch { }
      };
      load();
      return () => { cancelled = true; };
    }, [isOpen, selectedRoomId]);

    const togglePin = useCallback(async (messageId: string, userId: string, roomId: string) => {
      setPinnedPerRoom(prev => {
        const next = new Map(prev);
        const pins = [...(next.get(roomId) ?? [])];
        const idx = pins.indexOf(messageId);
        if (idx >= 0) pins.splice(idx, 1); else pins.push(messageId);
        next.set(roomId, pins);
        return next;
      });

      try {
        const { data: existing } = await supabase.from("chat_pins")
          .select("id").eq("room_id", roomId).eq("message_id", messageId).maybeSingle();
        if (existing) {
          await supabase.from("chat_pins").delete().eq("id", existing.id);
        } else {
          await supabase.from("chat_pins").insert({ room_id: roomId, message_id: messageId, pinned_by: userId });
        }
      } catch (e) {
        console.error("[Chat] Error toggling pin:", e);
      }
    }, []);

    return { pinnedPerRoom, togglePin };
  }

  export function useRealtime(
    isOpen: boolean,
    selectedRoomId: string,
    currentUserId: string,
    myUsername: string,
    myAvatarUrl: string | undefined,
    addMessage: (roomId: string, msg: ChatMessage) => void,
    refetchAndMerge: (roomId: string) => Promise<void>,
  ) {
    const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
    const [connected, setConnected] = useState<ConnectedUser[]>([]);
    const [seenMsgIds, setSeenMsgIds] = useState<Set<string>>(new Set());
    const realtimeRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
    const typingTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

    useEffect(() => {
      return () => {
        Object.values(typingTimeouts.current).forEach(clearTimeout);
      };
    }, []);

    useEffect(() => {
      if (!isOpen || !selectedRoomId) return;
      if (realtimeRef.current) { supabase.removeChannel(realtimeRef.current); realtimeRef.current = null; }

      const channel = supabase
        .channel(`globalchat-${selectedRoomId}`, {
          config: { broadcast: { self: false }, presence: { key: currentUserId } },
        })
        .on("postgres_changes", {
          event: "INSERT",
          schema: "public",
          table: "global_chat_messages",
          filter: `room_id=eq.${selectedRoomId}`,
        }, (payload) => {
            const row = payload.new as Record<string, unknown>;
            const rawMsg = rowToMessage(row);
            const isOwnMsg = rawMsg.userId === currentUserId;
            const msg: ChatMessage = isOwnMsg
              ? {
                  ...rawMsg,
                  username: rawMsg.username.startsWith("@") ? (myUsername || rawMsg.username) : rawMsg.username,
                  avatarUrl: rawMsg.avatarUrl ?? myAvatarUrl,
                }
              : rawMsg;
            if (!msg.avatarUrl || !msg.username || msg.username.startsWith("@")) {
              refetchAndMerge(selectedRoomId);
            } else {
              addMessage(selectedRoomId, msg);
            }
          })
        .on("postgres_changes", {
          event: "UPDATE",
          schema: "public",
          table: "global_chat_messages",
          filter: `room_id=eq.${selectedRoomId}`,
        }, () => {
          refetchAndMerge(selectedRoomId);
        })
        .on("broadcast", { event: "typing" }, ({ payload }: { payload: { userId: string; username: string } }) => {
          if (payload.userId === currentUserId) return;
          setTypingUsers(prev => {
            if (prev.some(u => u.userId === payload.userId)) return prev;
            return [...prev, { userId: payload.userId, username: payload.username }];
          });
          if (typingTimeouts.current[payload.userId]) clearTimeout(typingTimeouts.current[payload.userId]);
          typingTimeouts.current[payload.userId] = setTimeout(() => {
            setTypingUsers(prev => prev.filter(u => u.userId !== payload.userId));
            delete typingTimeouts.current[payload.userId];
          }, 4000);
        })
        .on("broadcast", { event: "seen" }, ({ payload }: { payload: { msgId: string } }) => {
          setSeenMsgIds(prev => new Set(prev).add(payload.msgId));
        })
        .on("presence", { event: "sync" }, () => {
          const state = channel.presenceState();
          const users: ConnectedUser[] = [];
          for (const [key, presences] of Object.entries(state)) {
            if (key === currentUserId) continue;
            const p = (presences as Array<Record<string, unknown>>)[0];
            users.push({
              userId: key,
              username: p?.username ? String(p.username) : `@${key.slice(0, 6)}`,
              avatarUrl: p?.avatarUrl ? String(p.avatarUrl) : undefined,
            });
          }
          setConnected(users);
        });

      channel.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ username: myUsername || `@${currentUserId.slice(0, 6)}`, avatarUrl: myAvatarUrl });
        }
      });

      realtimeRef.current = channel;

      return () => {
        if (realtimeRef.current) {
          supabase.removeChannel(realtimeRef.current);
          realtimeRef.current = null;
        }
      };
    }, [isOpen, selectedRoomId, currentUserId, myUsername, myAvatarUrl, addMessage, refetchAndMerge]);

    const emitTyping = useCallback(() => {
      realtimeRef.current?.send({ type: "broadcast", event: "typing", payload: { userId: currentUserId, username: myUsername } });
    }, [currentUserId, myUsername]);

    const emitSeen = useCallback((msgId: string) => {
      realtimeRef.current?.send({ type: "broadcast", event: "seen", payload: { msgId } });
    }, []);

    return { typingUsers, connected, seenMsgIds, emitTyping, emitSeen };
  }
  