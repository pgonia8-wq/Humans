
  import { useState, useRef, useEffect } from "react";
  import { motion, AnimatePresence } from "framer-motion";
  import {
    X, Send, Crown, Paperclip, Plus, Share2,
    Lock, Globe, Hash, ChevronDown,
    Star, Mic, MicOff, Search, Pin, Edit2, Trash2,
    CornerUpLeft, Check, Image, FileText, Play, Pause,
    Sparkles, Users, MessageSquare,
  } from "lucide-react";
  import type { ChatMessage, ChatRoom, RoomType, TypingUser, UserRole } from "./chatTypes";
  import { cx, timeStr, timeAgo, initials, canEditMsg, isImageFile } from "./chatUtils";
  import { EMOJI_LIST, FILE_ACCEPT, FILE_MAX_SIZE } from "./chatTypes";

  export function Overlay({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
    return (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md"
        onClick={onClick}
      >
        {children}
      </motion.div>
    );
  }

  export function CloseBtn({ onClick, testId }: { onClick: () => void; testId?: string }) {
    return (
      <button onClick={onClick} data-testid={testId}
        className="absolute top-3 right-3 p-1.5 rounded-xl text-white/30 hover:text-white/70 hover:bg-white/10 transition-all cursor-pointer z-10">
        <X className="h-4 w-4" />
      </button>
    );
  }

  export function ModalInput({ label, value, onChange, placeholder, maxLength, testId }: {
    label: string; value: string; onChange: (v: string) => void;
    placeholder?: string; maxLength?: number; testId?: string;
  }) {
    return (
      <div>
        <label className="mb-1.5 block text-[11px] font-semibold text-violet-300/80 uppercase tracking-wider">{label}</label>
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} maxLength={maxLength} data-testid={testId}
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-violet-400/50 focus:bg-white/8 focus:ring-1 focus:ring-violet-500/20 transition-all" />
      </div>
    );
  }

  export function Btn({ children, onClick, disabled, variant = "primary", className, testId }: {
    children: React.ReactNode; onClick?: () => void; disabled?: boolean;
    variant?: "primary" | "ghost" | "outline" | "gold" | "danger"; className?: string; testId?: string;
  }) {
    const base = "inline-flex items-center justify-center gap-2 rounded-2xl text-sm font-bold transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50";
    const v: Record<string, string> = {
      primary: "bg-gradient-to-r from-violet-600 via-fuchsia-600 to-purple-600 text-white px-5 py-2.5 shadow-lg shadow-violet-600/25 hover:shadow-violet-600/40 hover:brightness-110",
      ghost:   "text-white/50 hover:text-white hover:bg-white/8 px-3 py-2",
      outline: "border border-white/15 text-white/60 hover:border-white/30 hover:text-white hover:bg-white/5 px-4 py-2",
      gold:    "bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-500 text-black font-black px-5 py-2.5 shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 hover:brightness-110",
      danger:  "text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-2",
    };
    return (
      <button className={cx(base, v[variant], className)} onClick={onClick} disabled={disabled} data-testid={testId}>
        {children}
      </button>
    );
  }

  export function RoleBadge({ role }: { role: UserRole }) {
    if (role === "admin") return (
      <span className="text-[9px] px-2 py-0.5 rounded-full bg-gradient-to-r from-violet-500/20 to-purple-500/20 text-violet-300 border border-violet-400/20 font-bold tracking-wide">
        ADMIN
      </span>
    );
    if (role === "gold") return (
      <span className="text-[9px] px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 border border-amber-400/20 font-bold tracking-wide">
        GOLD ✦
      </span>
    );
    return null;
  }

  export function Avatar({ src, name, size = "md", ring = false, gold = false, online = false }: {
    src?: string; name: string; size?: "xs" | "sm" | "md" | "lg"; ring?: boolean; gold?: boolean; online?: boolean;
  }) {
    const sz = { xs: "h-6 w-6 text-[8px]", sm: "h-8 w-8 text-[10px]", md: "h-10 w-10 text-xs", lg: "h-12 w-12 text-sm" }[size];
    const rg = ring ? (gold ? "ring-2 ring-amber-400/60" : "ring-2 ring-violet-400/60") : "";
    return (
      <div className="relative flex-shrink-0">
        {src ? (
          <img src={src} alt={name} className={cx(sz, "rounded-2xl object-cover", rg)} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        ) : (
          <div className={cx(sz, "rounded-2xl flex items-center justify-center font-bold", rg,
            gold ? "bg-gradient-to-br from-amber-700/60 to-yellow-900/60 text-amber-300"
                 : "bg-gradient-to-br from-violet-700/60 to-fuchsia-800/60 text-violet-200")}>
            {initials(name) || "?"}
          </div>
        )}
        {online && (
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-gray-950 shadow-lg shadow-emerald-400/50" />
        )}
      </div>
    );
  }

  export function TypingIndicator({ users }: { users: TypingUser[] }) {
    if (!users.length) return null;
    const label = users.length === 1
      ? `${users[0].username} está escribiendo`
      : `${users.map((u) => u.username).join(", ")} están escribiendo`;
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
        className="flex items-center gap-3 px-4 py-2">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.span key={i}
              animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15 }}
              className="w-1.5 h-1.5 rounded-full bg-violet-400"
            />
          ))}
        </div>
        <span className="text-[11px] text-white/30 italic">{label}</span>
      </motion.div>
    );
  }

  export function DateSeparator({ label }: { label: string }) {
    return (
      <div className="flex items-center gap-3 py-3">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <span className="text-[10px] font-semibold text-white/25 uppercase tracking-widest">{label}</span>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>
    );
  }

  export function PinnedBar({ messages, isGold, onUnpin }: {
    messages: ChatMessage[]; isGold: boolean; onUnpin: (id: string) => void;
  }) {
    const [expanded, setExpanded] = useState(false);
    return (
      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
        className={cx("border-b flex-shrink-0 overflow-hidden",
          isGold ? "border-amber-500/10 bg-amber-950/20" : "border-violet-500/10 bg-violet-950/15")}>
        <button onClick={() => setExpanded(e => !e)}
          className="w-full flex items-center gap-2 px-4 py-2 text-left cursor-pointer hover:bg-white/3 transition-colors">
          <Pin className={cx("h-3 w-3 flex-shrink-0", isGold ? "text-amber-400" : "text-violet-400")} />
          <span className="text-[11px] font-semibold text-white/50 flex-1">
            {messages.length} mensaje{messages.length > 1 ? "s" : ""} fijado{messages.length > 1 ? "s" : ""}
          </span>
          <ChevronDown className={cx("h-3 w-3 text-white/30 transition-transform", expanded && "rotate-180")} />
        </button>
        <AnimatePresence>
          {expanded && (
            <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
              <div className="px-4 pb-2 space-y-1.5 max-h-32 overflow-y-auto">
                {messages.map((m) => (
                  <div key={m.id} className="flex items-start gap-2 group">
                    <p className="text-[11px] text-white/40 flex-1 line-clamp-2">
                      <span className="font-semibold text-white/60">{m.username}:</span> {m.content}
                    </p>
                    <button onClick={() => onUnpin(m.id)}
                      className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400 transition-all cursor-pointer p-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  export function ReactionBadges({ reactions, currentUserId, onToggle }: {
    reactions: Record<string, string[]>; currentUserId: string; onToggle: (emoji: string) => void;
  }) {
    const entries = Object.entries(reactions).filter(([, users]) => users.length > 0);
    if (!entries.length) return null;
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {entries.map(([emoji, users]) => {
          const isMine = users.includes(currentUserId);
          return (
            <motion.button key={emoji} whileTap={{ scale: 0.85 }}
              onClick={() => onToggle(emoji)}
              className={cx("flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[11px] border transition-all cursor-pointer",
                isMine
                  ? "bg-violet-500/20 border-violet-400/30 text-violet-300"
                  : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10")}>
              <span className="text-xs">{emoji}</span>
              <span className="font-semibold">{users.length}</span>
            </motion.button>
          );
        })}
      </div>
    );
  }

  interface MessageBubbleProps {
    message: ChatMessage;
    isOwn: boolean;
    isGold: boolean;
    isGrouped: boolean;
    currentUserId: string;
    reactions: Record<string, string[]>;
    seenByOthers: boolean;
    editingId: string | null;
    editText: string;
    setEditText: (t: string) => void;
    onShare: (m: ChatMessage) => void;
    onReply: (m: ChatMessage) => void;
    onReact: (msgId: string, emoji: string) => void;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
    onPin: (id: string) => void;
    onSaveEdit: (id: string) => void;
    onCancelEdit: () => void;
  }

  export function MessageBubble({
    message, isOwn, isGold, isGrouped, currentUserId, reactions, seenByOthers,
    editingId, editText, setEditText,
    onShare, onReply, onReact, onEdit, onDelete, onPin, onSaveEdit, onCancelEdit,
  }: MessageBubbleProps) {
    const [showActions, setShowActions] = useState(false);
    const [showEmojis, setShowEmojis] = useState(false);
    const isEditing = editingId === message.id;
    const isTemp = message.id.startsWith("temp-");
    const isDeleted = message.deletedForAll;

    if (isDeleted) {
      return (
        <div className={cx("flex", isOwn ? "justify-end" : "justify-start")}>
          <div className="px-4 py-2 rounded-2xl bg-white/3 border border-white/5">
            <span className="text-[11px] text-white/20 italic">Mensaje eliminado</span>
          </div>
        </div>
      );
    }

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 6, scale: 0.98 }}
        animate={{ opacity: isTemp ? 0.6 : 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2 }}
        className={cx("flex gap-2.5 group", isOwn ? "flex-row-reverse" : "flex-row", !isGrouped && "mt-3")}
        onPointerEnter={() => setShowActions(true)}
        onPointerLeave={() => { setShowActions(false); setShowEmojis(false); }}
      >
        {!isGrouped ? (
          <Avatar src={message.avatarUrl} name={message.username} size="sm" gold={isGold && !isOwn} />
        ) : (
          <div className="w-8" />
        )}

        <div className={cx("flex flex-col max-w-[75%] min-w-0", isOwn ? "items-end" : "items-start")}>
          {!isGrouped && (
            <div className={cx("flex items-center gap-2 mb-0.5", isOwn && "flex-row-reverse")}>
              <span className={cx("text-[11px] font-bold", isOwn ? "text-violet-300/80" : "text-white/50")}>{message.username}</span>
              <span className="text-[10px] text-white/20">{timeAgo(message.createdAt)}</span>
            </div>
          )}

          {message.replyToContent && (
            <div className={cx("flex items-center gap-1.5 mb-1 px-3 py-1 rounded-xl text-[10px] border-l-2",
              isGold ? "bg-amber-900/20 border-amber-400/30 text-amber-300/60" : "bg-violet-900/20 border-violet-400/30 text-violet-300/60")}>
              <CornerUpLeft className="h-2.5 w-2.5 flex-shrink-0" />
              <span className="font-semibold">{message.replyToUsername}</span>
              <span className="truncate opacity-70">{message.replyToContent}</span>
            </div>
          )}

          <div className={cx("relative rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed break-words",
            isOwn
              ? isGold
                ? "bg-gradient-to-br from-amber-600/40 to-yellow-700/30 text-amber-50 border border-amber-500/15"
                : "bg-gradient-to-br from-violet-600/40 to-fuchsia-700/30 text-violet-50 border border-violet-500/15"
              : "bg-white/[0.06] text-white/85 border border-white/[0.06]",
            isGrouped ? (isOwn ? "rounded-tr-lg" : "rounded-tl-lg") : ""
          )}>
            {isEditing ? (
              <div className="flex flex-col gap-2">
                <input value={editText} onChange={(e) => setEditText(e.target.value)} autoFocus
                  className="bg-transparent border-b border-white/20 text-sm text-white outline-none py-1"
                  onKeyDown={(e) => { if (e.key === "Enter") onSaveEdit(message.id); if (e.key === "Escape") onCancelEdit(); }}
                />
                <div className="flex gap-2 justify-end">
                  <button onClick={onCancelEdit} className="text-[10px] text-white/30 hover:text-white/60 cursor-pointer">Cancelar</button>
                  <button onClick={() => onSaveEdit(message.id)} className="text-[10px] text-violet-400 font-semibold cursor-pointer">Guardar</button>
                </div>
              </div>
            ) : (
              <>
                {message.content && <p className="whitespace-pre-wrap">{message.content}</p>}

                {message.fileUrl && isImageFile(message.fileType) && (
                  <a href={message.fileUrl} target="_blank" rel="noreferrer" className="block mt-2">
                    <img src={message.fileUrl} alt={message.fileName} className="max-w-full max-h-60 rounded-xl object-cover border border-white/10" />
                  </a>
                )}
                {message.fileUrl && !isImageFile(message.fileType) && (
                  <a href={message.fileUrl} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 mt-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                    <FileText className="h-4 w-4 text-violet-400 flex-shrink-0" />
                    <span className="text-[11px] text-white/60 truncate">{message.fileName || "Archivo"}</span>
                  </a>
                )}
                {message.audioUrl && (
                  <AudioPlayer src={message.audioUrl} isGold={isGold} />
                )}
                {message.editedAt && <span className="text-[9px] text-white/20 ml-1">(editado)</span>}
              </>
            )}

            {isOwn && message.status === "sent" && (
              <div className="flex justify-end mt-0.5">
                <Check className={cx("h-3 w-3", seenByOthers ? "text-violet-400" : "text-white/20")} />
              </div>
            )}
          </div>

          <ReactionBadges reactions={reactions} currentUserId={currentUserId} onToggle={(emoji) => onReact(message.id, emoji)} />

          <AnimatePresence>
            {showActions && !isEditing && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -2 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -2 }}
                transition={{ duration: 0.1 }}
                className={cx("flex items-center gap-0.5 mt-1 px-1.5 py-1 rounded-2xl bg-gray-900/95 border border-white/10 shadow-2xl backdrop-blur-md",
                  isOwn ? "self-end" : "self-start")}>
                {showEmojis ? (
                  <div className="flex gap-0.5 items-center">
                    {EMOJI_LIST.map((e) => (
                      <motion.button key={e} whileTap={{ scale: 1.3 }}
                        onClick={() => { onReact(message.id, e); setShowEmojis(false); }}
                        className="text-sm hover:scale-110 transition-transform cursor-pointer px-0.5">{e}</motion.button>
                    ))}
                    <button onClick={() => setShowEmojis(false)} className="text-white/30 hover:text-white/60 cursor-pointer ml-1">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <>
                    {[
                      { icon: Star, title: "Reaccionar", action: () => setShowEmojis(true) },
                      { icon: CornerUpLeft, title: "Responder", action: () => onReply(message) },
                      { icon: Share2, title: "Compartir", action: () => onShare(message) },
                      { icon: Pin, title: "Fijar", action: () => onPin(message.id) },
                    ].map(({ icon: Icon, title, action }) => (
                      <button key={title} onClick={action} title={title}
                        className="text-white/30 hover:text-white/70 cursor-pointer p-1 rounded-lg hover:bg-white/10 transition-all">
                        <Icon className="h-3 w-3" />
                      </button>
                    ))}
                    {isOwn && canEditMsg(message.createdAt) && (
                      <button onClick={() => onEdit(message.id)} title="Editar"
                        className="text-white/30 hover:text-white/70 cursor-pointer p-1 rounded-lg hover:bg-white/10 transition-all">
                        <Edit2 className="h-3 w-3" />
                      </button>
                    )}
                    {isOwn && (
                      <button onClick={() => onDelete(message.id)} title="Eliminar"
                        className="text-red-400/40 hover:text-red-400 cursor-pointer p-1 rounded-lg hover:bg-red-400/10 transition-all">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    );
  }

  function AudioPlayer({ src, isGold }: { src: string; isGold: boolean }) {
    const [playing, setPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
      const audio = new Audio(src);
      audioRef.current = audio;
      audio.addEventListener("timeupdate", () => {
        if (audio.duration) setProgress((audio.currentTime / audio.duration) * 100);
      });
      audio.addEventListener("ended", () => { setPlaying(false); setProgress(0); });
      return () => { audio.pause(); audio.remove(); };
    }, [src]);

    const toggle = () => {
      if (!audioRef.current) return;
      if (playing) { audioRef.current.pause(); } else { audioRef.current.play(); }
      setPlaying(!playing);
    };

    return (
      <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
        <button onClick={toggle} className={cx("p-1.5 rounded-full cursor-pointer", isGold ? "bg-amber-500/20 text-amber-400" : "bg-violet-500/20 text-violet-400")}>
          {playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
        </button>
        <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
          <motion.div className={cx("h-full rounded-full", isGold ? "bg-amber-400" : "bg-violet-400")}
            style={{ width: `${progress}%` }} />
        </div>
        <div className="flex gap-px">
          {Array.from({ length: 20 }, (_, i) => (
            <div key={i} className={cx("w-0.5 rounded-full transition-all",
              isGold ? "bg-amber-400/40" : "bg-violet-400/40")}
              style={{ height: `${4 + Math.sin(i * 0.8) * 4 + Math.random() * 3}px` }} />
          ))}
        </div>
      </div>
    );
  }

  export function ShareModal({ message, onClose }: { message: ChatMessage; onClose: () => void }) {
    const text = encodeURIComponent(message.content ?? "");
    return (
      <Overlay onClick={onClose}>
        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="w-[88%] max-w-xs bg-gray-900/95 border border-white/10 rounded-3xl p-6 shadow-2xl backdrop-blur-xl"
          onClick={(e) => e.stopPropagation()}>
          <h3 className="text-sm font-bold text-white mb-5 text-center">Compartir mensaje</h3>
          <div className="flex gap-4 justify-center">
            <a href={`https://twitter.com/intent/tweet?text=${text}`} target="_blank" rel="noreferrer"
              className="flex flex-col items-center gap-2 text-[11px] text-sky-400 hover:text-sky-300 transition-colors group">
              <div className="p-3 rounded-2xl bg-sky-400/10 group-hover:bg-sky-400/20 transition-colors">
                <span className="text-xl">𝕏</span>
              </div>
              Twitter
            </a>
            <a href={`https://wa.me/?text=${text}`} target="_blank" rel="noreferrer"
              className="flex flex-col items-center gap-2 text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors group">
              <div className="p-3 rounded-2xl bg-emerald-400/10 group-hover:bg-emerald-400/20 transition-colors">
                <span className="text-xl">💬</span>
              </div>
              WhatsApp
            </a>
            <button onClick={() => { navigator.clipboard?.writeText(message.content ?? ""); onClose(); }}
              className="flex flex-col items-center gap-2 text-[11px] text-white/40 hover:text-white/70 cursor-pointer transition-colors group">
              <div className="p-3 rounded-2xl bg-white/5 group-hover:bg-white/10 transition-colors">
                <span className="text-xl">📋</span>
              </div>
              Copiar
            </button>
          </div>
          <button onClick={onClose} className="mt-5 w-full text-xs text-white/20 hover:text-white/50 cursor-pointer transition-colors">Cerrar</button>
        </motion.div>
      </Overlay>
    );
  }

  export function GoldSubscribeModal({ onClose, onSubscribe, loading }: {
    onClose: () => void; onSubscribe: () => void; loading: boolean;
  }) {
    return (
      <Overlay>
        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="w-[90%] max-w-xs relative overflow-hidden rounded-3xl shadow-2xl border border-amber-500/20"
          onClick={(e) => e.stopPropagation()}>
          <div className="absolute inset-0 bg-gradient-to-br from-amber-950 via-yellow-950 to-orange-950" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-400/10 via-transparent to-transparent" />
          <div className="relative p-6">
            <CloseBtn onClick={onClose} testId="button-close-gold-modal" />
            <div className="flex flex-col items-center gap-3 mb-6">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-400/20 to-yellow-500/10 border border-amber-400/20">
                <Crown className="h-8 w-8 text-amber-400" />
              </div>
              <h2 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-yellow-400">Chat Gold</h2>
              <p className="text-sm text-amber-200/50 text-center leading-relaxed">Salas exclusivas con funciones premium y comunidad selecta.</p>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-400">9.99</span>
                <span className="text-sm text-amber-400/60 font-medium">WLD/mes</span>
              </div>
            </div>
            <div className="space-y-2 mb-6">
              {["Hasta 5 salas privadas", "Audio y archivos premium", "Badge Gold exclusivo"].map((f) => (
                <div key={f} className="flex items-center gap-2.5 text-[12px] text-amber-200/60">
                  <Sparkles className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
                  {f}
                </div>
              ))}
            </div>
            <Btn variant="gold" onClick={onSubscribe} disabled={loading} className="w-full" testId="button-subscribe-gold">
              {loading ? "Procesando..." : "Suscribirse con WLD"}
            </Btn>
            <button onClick={onClose} data-testid="button-cancel-gold"
              className="mt-3 w-full text-xs text-amber-200/20 hover:text-amber-200/50 cursor-pointer transition-colors">
              Ahora no
            </button>
          </div>
        </motion.div>
      </Overlay>
    );
  }

  export function ExtraRoomPayModal({ onClose, onPay, loading, amount, isGoldPrice }: {
    onClose: () => void; onPay: () => void; loading: boolean; amount: number; isGoldPrice: boolean;
  }) {
    return (
      <Overlay>
        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="w-[90%] max-w-xs bg-gray-900/95 border border-white/10 rounded-3xl p-6 shadow-2xl backdrop-blur-xl relative"
          onClick={(e) => e.stopPropagation()}>
          <CloseBtn onClick={onClose} />
          <div className="flex items-center gap-3 mb-4">
            <div className={cx("p-2.5 rounded-2xl", isGoldPrice ? "bg-amber-500/10" : "bg-violet-500/10")}>
              <Plus className={cx("h-5 w-5", isGoldPrice ? "text-amber-400" : "text-violet-400")} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Sala adicional</h2>
              <p className="text-[11px] text-white/40">Has alcanzado el límite</p>
            </div>
          </div>
          <p className="text-sm text-white/50 mb-5 leading-relaxed">
            Crea una sala extra por{" "}
            <span className={cx("font-black", isGoldPrice ? "text-amber-400" : "text-violet-400")}>{amount} WLD</span>
          </p>
          <Btn variant="primary" onClick={onPay} disabled={loading} className="w-full" testId="button-pay-extra-room">
            {loading ? "Procesando..." : `Pagar ${amount} WLD`}
          </Btn>
          <button onClick={onClose} className="mt-3 w-full text-xs text-white/20 hover:text-white/50 cursor-pointer transition-colors">Cancelar</button>
        </motion.div>
      </Overlay>
    );
  }

  export function CreateRoomModal({ onClose, onCreate, forcedType }: {
    onClose: () => void;
    onCreate: (data: Omit<ChatRoom, "id">) => void;
    canCreateGold: boolean;
    forcedType: RoomType;
  }) {
    const [name, setName] = useState("");
    const [isPrivate, setIsPrivate] = useState(false);
    const [description, setDescription] = useState("");
    const isGoldRoom = forcedType === "gold";

    return (
      <Overlay>
        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="w-[92%] max-w-sm bg-gray-900/95 border border-white/10 rounded-3xl p-5 shadow-2xl backdrop-blur-xl relative"
          onClick={(e) => e.stopPropagation()}>
          <CloseBtn onClick={onClose} />
          <h2 className="text-base font-bold text-white mb-4">Crear sala</h2>

          <div className={cx("flex items-center gap-2 px-3 py-2 rounded-2xl mb-4 border",
            isGoldRoom
              ? "bg-amber-400/10 border-amber-400/20 text-amber-300"
              : "bg-violet-400/10 border-violet-400/20 text-violet-300")}>
            {isGoldRoom ? <Crown className="h-3.5 w-3.5" /> : <Hash className="h-3.5 w-3.5" />}
            <span className="text-xs font-bold">{isGoldRoom ? "Sala Gold" : "Sala Clásica"}</span>
          </div>

          <ModalInput label="Nombre" value={name} onChange={setName} placeholder="mi-sala-genial" maxLength={40} testId="input-room-name" />
          <div className="mt-3">
            <ModalInput label="Descripción" value={description} onChange={setDescription} placeholder="Para hablar de…" maxLength={120} />
          </div>

          <button onClick={() => setIsPrivate(p => !p)}
            className="mt-4 flex items-center gap-2.5 text-sm text-white/40 hover:text-white/70 cursor-pointer transition-all group">
            <div className={cx("p-1.5 rounded-xl transition-colors",
              isPrivate ? "bg-violet-500/15 text-violet-400" : "bg-white/5 text-white/30")}>
              {isPrivate ? <Lock className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
            </div>
            <span className="text-[12px] font-medium">{isPrivate ? "Sala privada" : "Sala pública"}</span>
          </button>

          <Btn variant="primary" disabled={!name.trim()} className="w-full mt-5" testId="button-confirm-create-room"
            onClick={() => onCreate({ name: name.trim(), type: forcedType, isPrivate, description: description.trim() || undefined })}>
            Crear sala
          </Btn>
        </motion.div>
      </Overlay>
    );
  }

  export function ChatInput({ onSend, onTyping, isGold, hasGoldAccess, disabled, replyTo, onCancelReply, onShowToast }: {
    onSend: (content: string, file?: File, audioBlob?: Blob, ephemeral?: boolean, replyMsg?: ChatMessage) => void;
    onTyping: () => void;
    isGold: boolean;
    hasGoldAccess: boolean;
    disabled: boolean;
    replyTo: ChatMessage | null;
    onCancelReply: () => void;
    onShowToast: (msg: string) => void;
  }) {
    const [text, setText] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [recording, setRecording] = useState(false);
    const [ephemeral, setEphemeral] = useState(false);
    const mediaRecRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const fileRef = useRef<HTMLInputElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = () => {
      if (!text.trim() && !file) return;
      onSend(text, file ?? undefined, undefined, ephemeral, replyTo ?? undefined);
      setText("");
      setFile(null);
      setEphemeral(false);
      inputRef.current?.focus();
    };

    const startRec = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mr = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
        chunksRef.current = [];
        mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
        mr.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          stream.getTracks().forEach(t => t.stop());
          if (blob.size > 0) onSend("", undefined, blob, ephemeral, replyTo ?? undefined);
          setRecording(false);
        };
        mr.start();
        mediaRecRef.current = mr;
        setRecording(true);
      } catch { onShowToast("No se pudo acceder al micrófono"); }
    };

    const stopRec = () => { mediaRecRef.current?.stop(); };

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f) return;
      if (f.size > FILE_MAX_SIZE) { onShowToast("Archivo muy grande (máx 10 MB)"); return; }
      setFile(f);
    };

    return (
      <div className={cx("flex-shrink-0 border-t px-3 py-2 pb-[env(safe-area-inset-bottom,8px)]",
        isGold ? "border-amber-500/10 bg-amber-950/20" : "border-white/5 bg-black/40")}>

        <AnimatePresence>
          {replyTo && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="flex items-center gap-2 mb-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/8 overflow-hidden">
              <CornerUpLeft className="h-3 w-3 text-violet-400 flex-shrink-0" />
              <span className="text-[11px] text-white/40 truncate flex-1">
                <b className="text-white/60">{replyTo.username}:</b> {replyTo.content}
              </span>
              <button onClick={onCancelReply} className="text-white/20 hover:text-white/50 cursor-pointer flex-shrink-0">
                <X className="h-3 w-3" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {file && (
          <div className="flex items-center gap-2 mb-2 px-3 py-1.5 rounded-xl bg-violet-500/10 border border-violet-500/20">
            {isImageFile(file.type) ? <Image className="h-3.5 w-3.5 text-violet-400" /> : <FileText className="h-3.5 w-3.5 text-violet-400" />}
            <span className="text-[11px] text-violet-300 truncate flex-1">{file.name}</span>
            <button onClick={() => setFile(null)} className="text-white/30 hover:text-white/60 cursor-pointer">
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <input ref={fileRef} type="file" accept={FILE_ACCEPT} onChange={handleFile} className="hidden" />
          <button onClick={() => fileRef.current?.click()} disabled={disabled}
            className={cx("p-2 rounded-xl transition-all cursor-pointer", isGold ? "text-amber-400/40 hover:text-amber-400 hover:bg-amber-400/10" : "text-white/25 hover:text-white/60 hover:bg-white/8")}>
            <Paperclip className="h-4 w-4" />
          </button>

          <div className="flex-1 relative">
            <input ref={inputRef} value={text}
              onChange={(e) => { setText(e.target.value); onTyping(); }}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
              placeholder={recording ? "Grabando audio…" : "Escribe un mensaje…"}
              disabled={disabled || recording}
              className={cx("w-full rounded-2xl border px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none transition-all",
                isGold
                  ? "bg-amber-900/20 border-amber-500/15 focus:border-amber-400/40 focus:bg-amber-900/30 focus:ring-1 focus:ring-amber-500/15"
                  : "bg-white/[0.04] border-white/8 focus:border-violet-400/40 focus:bg-white/[0.06] focus:ring-1 focus:ring-violet-500/15")} />
          </div>

          <button onClick={() => setEphemeral(e => !e)} title="Mensaje efímero (24h)"
            className={cx("p-2 rounded-xl transition-all cursor-pointer text-[11px]",
              ephemeral ? (isGold ? "text-amber-400 bg-amber-400/15" : "text-violet-400 bg-violet-400/15") : "text-white/20 hover:text-white/40 hover:bg-white/5")}>
            👻
          </button>

          {text.trim() || file ? (
            <motion.button whileTap={{ scale: 0.9 }} onClick={handleSubmit} disabled={disabled}
              className={cx("p-2.5 rounded-2xl transition-all cursor-pointer shadow-lg",
                isGold
                  ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-amber-500/25"
                  : "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-violet-500/25")}>
              <Send className="h-4 w-4" />
            </motion.button>
          ) : (
            <motion.button whileTap={{ scale: 0.9 }}
              onClick={recording ? stopRec : startRec} disabled={disabled}
              className={cx("p-2.5 rounded-2xl transition-all cursor-pointer",
                recording
                  ? "bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30"
                  : isGold ? "text-amber-400/40 hover:text-amber-400 hover:bg-amber-400/10" : "text-white/25 hover:text-white/60 hover:bg-white/8")}>
              {recording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </motion.button>
          )}
        </div>
      </div>
    );
  }

  export function UnreadBanner({ count, onClick }: { count: number; onClick: () => void }) {
    if (count <= 0) return null;
    return (
      <motion.button
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        onClick={onClick}
        className="absolute top-16 left-1/2 -translate-x-1/2 z-30 px-4 py-1.5 rounded-full bg-violet-600/90 text-white text-[11px] font-bold shadow-lg shadow-violet-600/30 cursor-pointer hover:bg-violet-500/90 transition-colors backdrop-blur-sm border border-violet-400/20"
      >
        ↓ {count} mensaje{count > 1 ? "s" : ""} nuevo{count > 1 ? "s" : ""}
      </motion.button>
    );
  }
  