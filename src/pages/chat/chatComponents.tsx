
  import { useState, useRef, useEffect, memo } from "react";
  import { motion, AnimatePresence } from "framer-motion";
  import {
    X, Send, Crown, Paperclip, Plus, Share2,
    Lock, Globe, Hash, ChevronDown,
    Star, Mic, MicOff, Search, Pin, Edit2, Trash2,
    CornerUpLeft, Check, Image, FileText, Play, Pause,
    Sparkles, Users, MessageSquare, Zap, Shield, Flame,
  } from "lucide-react";
  import type { ChatMessage, ChatRoom, RoomType, TypingUser, UserRole } from "./chatTypes";
  import { cx, timeStr, timeAgo, initials, canEditMsg, isImageFile } from "./chatUtils";
  import { EMOJI_LIST, FILE_ACCEPT, FILE_MAX_SIZE } from "./chatTypes";

  const SPRING = { type: "spring" as const, damping: 25, stiffness: 350 };
  const FADE_UP = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 } };

  export function AnimatedBg({ isGold }: { isGold: boolean }) {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={cx("absolute -top-1/3 -left-1/3 w-[120%] h-[120%] rounded-full blur-[120px] opacity-20 animate-pulse",
          isGold ? "bg-amber-500" : "bg-violet-600")}
          style={{ animationDuration: "8s" }} />
        <div className={cx("absolute -bottom-1/4 -right-1/4 w-[80%] h-[80%] rounded-full blur-[100px] opacity-15",
          isGold ? "bg-orange-600" : "bg-fuchsia-700")}
          style={{ animation: "pulse 12s ease-in-out infinite reverse" }} />
        <div className={cx("absolute top-1/3 left-1/2 w-[60%] h-[40%] rounded-full blur-[80px] opacity-10",
          isGold ? "bg-yellow-400" : "bg-cyan-600")}
          style={{ animation: "pulse 15s ease-in-out infinite 3s" }} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)]" />
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)`,
          backgroundSize: "32px 32px"
        }} />
      </div>
    );
  }

  export function GlassPanel({ children, className, isGold = false, intensity = "medium" }: {
    children: React.ReactNode; className?: string; isGold?: boolean; intensity?: "light" | "medium" | "heavy";
  }) {
    const bg = { light: "bg-white/[0.03]", medium: "bg-white/[0.06]", heavy: "bg-white/[0.1]" }[intensity];
    const blur = { light: "backdrop-blur-sm", medium: "backdrop-blur-md", heavy: "backdrop-blur-xl" }[intensity];
    return (
      <div className={cx("border rounded-3xl shadow-2xl", bg, blur,
        isGold ? "border-amber-400/10 shadow-amber-900/10" : "border-white/[0.08] shadow-violet-900/10",
        className)}>
        {children}
      </div>
    );
  }

  export function Overlay({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
    return (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 z-50 flex items-center justify-center"
        onClick={onClick}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xl" />
        <div className="relative z-10">{children}</div>
      </motion.div>
    );
  }

  export function CloseBtn({ onClick, testId }: { onClick: () => void; testId?: string }) {
    return (
      <motion.button whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }}
        onClick={onClick} data-testid={testId}
        className="absolute top-4 right-4 p-2 rounded-2xl bg-white/5 text-white/30 hover:text-white hover:bg-white/10 transition-colors cursor-pointer z-10 border border-white/5">
        <X className="h-4 w-4" />
      </motion.button>
    );
  }

  export function ModalInput({ label, value, onChange, placeholder, maxLength, testId }: {
    label: string; value: string; onChange: (v: string) => void;
    placeholder?: string; maxLength?: number; testId?: string;
  }) {
    return (
      <div>
        <label className="mb-2 block text-[10px] font-black text-white/50 uppercase tracking-[0.2em]">{label}</label>
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} maxLength={maxLength} data-testid={testId}
          className="w-full rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-violet-400/40 focus:bg-white/[0.06] focus:ring-2 focus:ring-violet-500/10 transition-all duration-300" />
      </div>
    );
  }

  export function Btn({ children, onClick, disabled, variant = "primary", className, testId }: {
    children: React.ReactNode; onClick?: () => void; disabled?: boolean;
    variant?: "primary" | "ghost" | "outline" | "gold" | "danger"; className?: string; testId?: string;
  }) {
    const base = "relative inline-flex items-center justify-center gap-2 rounded-2xl text-sm font-black tracking-wide transition-all duration-300 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none overflow-hidden";
    const v: Record<string, string> = {
      primary: "bg-gradient-to-r from-violet-600 via-fuchsia-500 to-violet-600 text-white px-6 py-3 shadow-[0_0_30px_rgba(139,92,246,0.3)] hover:shadow-[0_0_50px_rgba(139,92,246,0.5)] hover:scale-[1.02] active:scale-[0.98]",
      ghost:   "text-white/40 hover:text-white hover:bg-white/8 px-4 py-2.5",
      outline: "border-2 border-white/10 text-white/50 hover:border-white/25 hover:text-white hover:bg-white/5 px-5 py-2.5",
      gold:    "bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black px-6 py-3 shadow-[0_0_40px_rgba(245,158,11,0.35)] hover:shadow-[0_0_60px_rgba(245,158,11,0.5)] hover:scale-[1.02] active:scale-[0.98]",
      danger:  "text-red-400 hover:text-red-300 hover:bg-red-500/10 px-4 py-2.5",
    };
    return (
      <motion.button whileTap={{ scale: 0.96 }}
        className={cx(base, v[variant], className)} onClick={onClick} disabled={disabled} data-testid={testId}>
        {(variant === "primary" || variant === "gold") && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-700" />
        )}
        <span className="relative z-10 flex items-center gap-2">{children}</span>
      </motion.button>
    );
  }

  export function RoleBadge({ role }: { role: UserRole }) {
    if (role === "admin") return (
      <span className="text-[8px] px-2.5 py-1 rounded-full bg-violet-500/15 text-violet-300 border border-violet-400/15 font-black tracking-[0.15em] shadow-[0_0_10px_rgba(139,92,246,0.2)]">
        <Shield className="h-2.5 w-2.5 inline mr-1" />ADMIN
      </span>
    );
    if (role === "gold") return (
      <span className="text-[8px] px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-400/15 font-black tracking-[0.15em] shadow-[0_0_10px_rgba(245,158,11,0.2)]">
        <Crown className="h-2.5 w-2.5 inline mr-1" />GOLD
      </span>
    );
    return null;
  }

  export function Avatar({ src, name, size = "md", ring = false, gold = false }: {
      src?: string; name: string; size?: "xs" | "sm" | "md" | "lg"; ring?: boolean; gold?: boolean;
    }) {
      const [imgFailed, setImgFailed] = useState(false);
      const sz = { xs: "h-6 w-6 text-[9px]", sm: "h-9 w-9 text-xs", md: "h-10 w-10 text-sm", lg: "h-14 w-14 text-base" }[size];
      const ringStyle = ring
        ? gold ? "ring-2 ring-yellow-400" : "ring-2 ring-violet-400"
        : "";
      const showImg = src && !imgFailed;
      return (
        <div className="relative flex-shrink-0">
          {showImg ? (
            <img src={src} alt={name}
              className={cx(sz, "rounded-full object-cover", ringStyle)}
              onError={() => setImgFailed(true)} />
          ) : (
            <div className={cx(sz, "rounded-full flex items-center justify-center flex-shrink-0", ringStyle,
              gold ? "bg-gradient-to-br from-yellow-800/80 to-amber-900/80 text-yellow-300 font-bold"
                   : "bg-gradient-to-br from-violet-800/80 to-fuchsia-900/80 text-violet-200 font-semibold")}>
              {initials(name) || "?"}
            </div>
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
      <motion.div {...FADE_UP} transition={SPRING}
        className="flex items-center gap-3 px-5 py-2.5 mx-2 mb-1 rounded-2xl bg-white/[0.03] border border-white/5">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.span key={i}
              animate={{ y: [0, -6, 0], scale: [0.8, 1.2, 0.8] }}
              transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.2, ease: "easeInOut" }}
              className="w-2 h-2 rounded-full bg-gradient-to-t from-violet-500 to-fuchsia-400 shadow-[0_0_6px_rgba(139,92,246,0.5)]"
            />
          ))}
        </div>
        <span className="text-[11px] text-white/40 font-medium italic">{label}</span>
      </motion.div>
    );
  }

  export function DateSeparator({ label }: { label: string }) {
    return (
      <div className="flex items-center gap-4 py-4 px-2">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06]">
          <Sparkles className="h-2.5 w-2.5 text-violet-400/40" />
          <span className="text-[10px] font-black text-white/35 uppercase tracking-[0.2em]">{label}</span>
        </div>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
      </div>
    );
  }

  export function PinnedBar({ messages, isGold, onUnpin }: {
    messages: ChatMessage[]; isGold: boolean; onUnpin: (id: string) => void;
  }) {
    const [expanded, setExpanded] = useState(false);
    return (
      <motion.div {...FADE_UP} transition={SPRING}
        className={cx("border-b flex-shrink-0 overflow-hidden",
          isGold ? "border-amber-400/8 bg-gradient-to-r from-amber-950/30 to-transparent" : "border-violet-400/8 bg-gradient-to-r from-violet-950/20 to-transparent")}>
        <button onClick={() => setExpanded(e => !e)}
          className="w-full flex items-center gap-3 px-5 py-3 text-left cursor-pointer hover:bg-white/[0.02] transition-colors">
          <div className={cx("p-1.5 rounded-xl", isGold ? "bg-amber-500/10" : "bg-violet-500/10")}>
            <Pin className={cx("h-3 w-3", isGold ? "text-amber-400" : "text-violet-400")} />
          </div>
          <span className="text-[11px] font-bold text-white/75 flex-1">
            {messages.length} fijado{messages.length > 1 ? "s" : ""}
          </span>
          <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="h-3 w-3 text-white/20" />
          </motion.div>
        </button>
        <AnimatePresence>
          {expanded && (
            <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
              <div className="px-5 pb-3 space-y-2 max-h-36 overflow-y-auto">
                {messages.map((m) => (
                  <div key={m.id} className="flex items-start gap-2.5 group p-2 rounded-xl hover:bg-white/[0.02] transition-colors">
                    <p className="text-[11px] text-white/50 flex-1 line-clamp-2 leading-relaxed">
                      <span className="font-bold text-white/70">{m.username}:</span> {m.content}
                    </p>
                    <button onClick={() => onUnpin(m.id)}
                      className="opacity-0 group-hover:opacity-100 text-white/15 hover:text-red-400 transition-all cursor-pointer p-1 rounded-lg hover:bg-red-500/10">
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
      <div className="flex flex-wrap gap-1.5 mt-2 ml-1">
        {entries.map(([emoji, users]) => {
          const isMine = users.includes(currentUserId);
          return (
            <motion.button key={emoji} whileTap={{ scale: 0.8 }} whileHover={{ scale: 1.1, y: -2 }}
              onClick={() => onToggle(emoji)}
              className={cx("flex items-center gap-1.5 px-2 py-1 rounded-xl text-[11px] border transition-all duration-200 cursor-pointer",
                isMine
                  ? "bg-violet-500/15 border-violet-400/25 text-violet-200 shadow-[0_0_12px_rgba(139,92,246,0.15)]"
                  : "bg-white/[0.03] border-white/8 text-white/50 hover:bg-white/[0.08] hover:border-white/12")}>
              <span className="text-sm">{emoji}</span>
              <span className="font-black text-[10px]">{users.length}</span>
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

  export const MessageBubble = memo(function MessageBubble({
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
        <div className={cx("flex px-2", isOwn ? "justify-end" : "justify-start")}>
          <div className="px-4 py-2.5 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
            <span className="text-[11px] text-white/30 italic flex items-center gap-1.5">
              <Trash2 className="h-3 w-3" /> Mensaje eliminado
            </span>
          </div>
        </div>
      );
    }

    return (
      <motion.div
        layout="position"
        initial={{ opacity: 0, y: 8, scale: 0.97 }}
        animate={{ opacity: isTemp ? 0.5 : 1, y: 0, scale: 1 }}
        transition={{ ...SPRING, duration: 0.3 }}
        className={cx("flex gap-3 px-2 group", isOwn ? "flex-row-reverse" : "flex-row", !isGrouped ? "mt-4" : "mt-0.5")}
        onClick={() => { if (!isEditing) setShowActions(prev => !prev); }}
      >
          <Avatar src={message.avatarUrl} name={message.username} size="sm" ring gold={isGold} />

        <div className={cx("flex flex-col max-w-[78%] min-w-0", isOwn ? "items-end" : "items-start")}>
            <div className={cx("flex items-center gap-2.5 mb-1 px-1", isOwn && "flex-row-reverse")}>
              <span className={cx("text-[12px] font-extrabold",
                isOwn ? (isGold ? "text-amber-300" : "text-violet-300") : "text-white/80")}>{message.username}</span>
              <span className="text-[9px] text-white/40 font-medium">{timeAgo(message.createdAt)}</span>
              {message.ephemeral && <span className="text-[9px] text-violet-400/40" title="Efímero 24h">👻</span>}
            </div>

          {message.replyToContent && (
            <div className={cx("flex items-center gap-2 mb-1.5 px-3.5 py-2 rounded-2xl text-[10px] border-l-[3px]",
              isGold ? "bg-amber-900/15 border-amber-400/30 text-amber-300/70" : "bg-violet-900/15 border-violet-400/30 text-violet-300/70")}>
              <CornerUpLeft className="h-3 w-3 flex-shrink-0 opacity-60" />
              <span className="font-black">{message.replyToUsername}</span>
              <span className="truncate opacity-60">{message.replyToContent}</span>
            </div>
          )}

          <div className={cx("relative rounded-[20px] px-4 py-2.5 text-[13.5px] leading-[1.6] break-words transition-all duration-200",
            isOwn
              ? isGold
                ? "bg-gradient-to-br from-amber-500/35 via-yellow-600/25 to-orange-700/25 text-amber-50 border border-amber-400/18 shadow-[0_2px_20px_rgba(245,158,11,0.08)]"
                : "bg-gradient-to-br from-violet-500/35 via-fuchsia-600/25 to-purple-700/25 text-violet-50 border border-violet-400/18 shadow-[0_2px_20px_rgba(139,92,246,0.08)]"
              : "bg-white/[0.04] text-white/90 border border-white/[0.06] shadow-[0_2px_10px_rgba(0,0,0,0.1)]",
            isGrouped && isOwn && "rounded-tr-lg",
            isGrouped && !isOwn && "rounded-tl-lg",
            "hover:shadow-[0_4px_25px_rgba(0,0,0,0.15)]"
          )}>
            {isEditing ? (
              <div className="flex flex-col gap-2.5">
                <input value={editText} onChange={(e) => setEditText(e.target.value)} autoFocus
                  className="bg-transparent border-b border-white/15 text-sm text-white outline-none py-1.5 placeholder-white/20"
                  onKeyDown={(e) => { if (e.key === "Enter") onSaveEdit(message.id); if (e.key === "Escape") onCancelEdit(); }}
                />
                <div className="flex gap-3 justify-end">
                  <button onClick={onCancelEdit} className="text-[10px] text-white/25 hover:text-white/50 cursor-pointer font-bold">Cancelar</button>
                  <button onClick={() => onSaveEdit(message.id)} className="text-[10px] text-violet-400 font-black cursor-pointer hover:text-violet-300">Guardar</button>
                </div>
              </div>
            ) : (
              <>
                {message.content && <p className="whitespace-pre-wrap">{message.content}</p>}

                {message.fileUrl && isImageFile(message.fileType) && (
                  <a href={message.fileUrl} target="_blank" rel="noreferrer" className="block mt-2.5 group/img">
                    <img src={message.fileUrl} alt={message.fileName}
                      className="max-w-full max-h-64 rounded-2xl object-cover border border-white/8 shadow-lg group-hover/img:border-white/15 transition-all duration-300" />
                  </a>
                )}
                {message.fileUrl && !isImageFile(message.fileType) && (
                  <a href={message.fileUrl} target="_blank" rel="noreferrer"
                    className="flex items-center gap-3 mt-2.5 px-4 py-3 rounded-2xl bg-white/[0.04] border border-white/8 hover:bg-white/[0.06] hover:border-white/12 transition-all duration-200 group/file">
                    <div className="p-2 rounded-xl bg-violet-500/10">
                      <FileText className="h-4 w-4 text-violet-400" />
                    </div>
                    <span className="text-[12px] text-white/50 truncate flex-1 font-medium group-hover/file:text-white/70">{message.fileName || "Archivo"}</span>
                  </a>
                )}
                {message.audioUrl && <AudioPlayer src={message.audioUrl} isGold={isGold} />}
                {message.editedAt && <span className="text-[9px] text-white/30 ml-1.5 font-medium">(editado)</span>}
              </>
            )}

            {isOwn && message.status === "sent" && (
              <div className="flex justify-end mt-1">
                <div className={cx("flex items-center gap-0.5",
                  seenByOthers ? "text-violet-400" : "text-white/30")}>
                  <Check className="h-3 w-3" />
                  {seenByOthers && <Check className="h-3 w-3 -ml-1.5" />}
                </div>
              </div>
            )}
          </div>

          <ReactionBadges reactions={reactions} currentUserId={currentUserId} onToggle={(emoji) => onReact(message.id, emoji)} />

          <AnimatePresence>
            {showActions && !isEditing && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                onClick={(e) => e.stopPropagation()}
                className={cx("flex items-center gap-0.5 mt-1.5 px-2 py-1.5 rounded-2xl border shadow-xl",
                  "bg-gray-900/95 border-white/12 backdrop-blur-xl shadow-black/40",
                  isOwn ? "self-end" : "self-start")}>
                {showEmojis ? (
                  <motion.div initial={{ width: 0 }} animate={{ width: "auto" }} className="flex gap-0.5 items-center overflow-hidden">
                    {EMOJI_LIST.map((e) => (
                      <motion.button key={e} whileTap={{ scale: 1.4 }} whileHover={{ scale: 1.2, y: -3 }}
                        onClick={() => { onReact(message.id, e); setShowEmojis(false); }}
                        className="text-sm cursor-pointer px-0.5 hover:drop-shadow-[0_0_4px_rgba(255,255,255,0.3)]">{e}</motion.button>
                    ))}
                    <button onClick={() => setShowEmojis(false)} className="text-white/40 hover:text-white/70 cursor-pointer ml-1.5 p-1 rounded-lg hover:bg-white/5">
                      <X className="h-3 w-3" />
                    </button>
                  </motion.div>
                ) : (
                  <>
                    {[
                      { icon: Flame, title: "Reaccionar", action: () => setShowEmojis(true), color: "hover:text-orange-400" },
                      { icon: CornerUpLeft, title: "Responder", action: () => onReply(message), color: "hover:text-cyan-400" },
                      { icon: Share2, title: "Compartir", action: () => onShare(message), color: "hover:text-emerald-400" },
                      { icon: Pin, title: "Fijar", action: () => onPin(message.id), color: "hover:text-amber-400" },
                    ].map(({ icon: Icon, title, action, color }) => (
                      <motion.button key={title} whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
                        onClick={action} title={title}
                        className={cx("text-white/50 cursor-pointer p-1.5 rounded-xl hover:bg-white/8 transition-all", color)}>
                        <Icon className="h-3.5 w-3.5" />
                      </motion.button>
                    ))}
                    {isOwn && canEditMsg(message.createdAt) && (
                      <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
                        onClick={() => onEdit(message.id)} title="Editar"
                        className="text-white/25 hover:text-blue-400 cursor-pointer p-1.5 rounded-xl hover:bg-white/8 transition-all">
                        <Edit2 className="h-3.5 w-3.5" />
                      </motion.button>
                    )}
                    {isOwn && (
                      <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
                        onClick={() => onDelete(message.id)} title="Eliminar"
                        className="text-red-500/30 hover:text-red-400 cursor-pointer p-1.5 rounded-xl hover:bg-red-500/8 transition-all">
                        <Trash2 className="h-3.5 w-3.5" />
                      </motion.button>
                    )}
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    );
  });

  function AudioPlayer({ src, isGold }: { src: string; isGold: boolean }) {
    const [playing, setPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
      const audio = new Audio(src);
      audioRef.current = audio;
      audio.addEventListener("loadedmetadata", () => setDuration(audio.duration));
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

    const fmt = (s: number) => { const m = Math.floor(s/60); return `${m}:${String(Math.floor(s%60)).padStart(2,"0")}`; };
    const bars = Array.from({ length: 28 }, (_, i) => 3 + Math.abs(Math.sin(i * 0.7 + 1.2)) * 14 + Math.sin(i * 1.3) * 4);

    return (
      <div className={cx("flex items-center gap-3 mt-2.5 px-4 py-3 rounded-2xl border transition-all",
        isGold ? "bg-amber-500/[0.06] border-amber-400/10" : "bg-violet-500/[0.06] border-violet-400/10")}>
        <motion.button whileTap={{ scale: 0.85 }} onClick={toggle}
          className={cx("p-2 rounded-xl cursor-pointer transition-all",
            isGold
              ? "bg-gradient-to-br from-amber-500/20 to-yellow-600/10 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
              : "bg-gradient-to-br from-violet-500/20 to-fuchsia-600/10 text-violet-400 shadow-[0_0_12px_rgba(139,92,246,0.2)]")}>
          {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
        </motion.button>
        <div className="flex-1 flex items-end gap-[2px] h-5">
          {bars.map((h, i) => {
            const filled = progress > (i / bars.length) * 100;
            return (
              <motion.div key={i}
                animate={playing ? { scaleY: [1, 0.5 + Math.random(), 1], opacity: [0.6, 1, 0.6] } : {}}
                transition={playing ? { duration: 0.5 + Math.random() * 0.3, repeat: Infinity, delay: i * 0.03 } : {}}
                className={cx("w-[3px] rounded-full transition-colors duration-200",
                  filled
                    ? isGold ? "bg-amber-400" : "bg-violet-400"
                    : isGold ? "bg-amber-400/15" : "bg-violet-400/15")}
                style={{ height: `${h}px` }} />
            );
          })}
        </div>
        {duration > 0 && <span className="text-[10px] text-white/20 font-mono font-medium tabular-nums">{fmt(duration)}</span>}
      </div>
    );
  }

  export function ShareModal({ message, onClose }: { message: ChatMessage; onClose: () => void }) {
    const text = encodeURIComponent(message.content ?? "");
    const platforms = [
      { name: "Twitter", href: `https://twitter.com/intent/tweet?text=${text}`, icon: "𝕏", color: "text-sky-400", bg: "bg-sky-400/10 hover:bg-sky-400/20 border-sky-400/10" },
      { name: "WhatsApp", href: `https://wa.me/?text=${text}`, icon: "💬", color: "text-emerald-400", bg: "bg-emerald-400/10 hover:bg-emerald-400/20 border-emerald-400/10" },
      { name: "Copiar", href: "#", icon: "📋", color: "text-white/50", bg: "bg-white/5 hover:bg-white/10 border-white/5", onClick: () => { navigator.clipboard?.writeText(message.content ?? ""); onClose(); } },
    ];
    return (
      <Overlay onClick={onClose}>
        <motion.div initial={{ scale: 0.9, opacity: 0, y: 24 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 24 }}
          transition={SPRING}
          className="w-[85%] max-w-xs bg-gray-950/95 border border-white/8 rounded-3xl p-7 shadow-2xl backdrop-blur-xl"
          onClick={(e) => e.stopPropagation()}>
          <h3 className="text-sm font-black text-white/90 mb-6 text-center tracking-wide">Compartir</h3>
          <div className="flex gap-5 justify-center">
            {platforms.map((p) => (
              <a key={p.name} href={p.href} target={p.href !== "#" ? "_blank" : undefined} rel="noreferrer"
                onClick={p.onClick}
                className={cx("flex flex-col items-center gap-2.5 group cursor-pointer")}>
                <div className={cx("p-4 rounded-2xl border transition-all duration-300 group-hover:scale-105", p.bg)}>
                  <span className="text-xl">{p.icon}</span>
                </div>
                <span className={cx("text-[10px] font-bold tracking-wide", p.color)}>{p.name}</span>
              </a>
            ))}
          </div>
          <button onClick={onClose} className="mt-6 w-full text-[11px] text-white/30 hover:text-white/60 cursor-pointer transition-colors font-bold">Cerrar</button>
        </motion.div>
      </Overlay>
    );
  }

  export function GoldSubscribeModal({ onClose, onSubscribe, loading }: {
    onClose: () => void; onSubscribe: () => void; loading: boolean;
  }) {
    return (
      <Overlay>
        <motion.div initial={{ scale: 0.9, opacity: 0, y: 24 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 24 }}
          transition={SPRING}
          className="w-[90%] max-w-sm relative overflow-hidden rounded-3xl shadow-[0_0_80px_rgba(245,158,11,0.15)]"
          onClick={(e) => e.stopPropagation()}>
          <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-amber-950/80 to-gray-950" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.12),transparent_60%)]" />
          <div className="absolute inset-0" style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, rgba(245,158,11,0.05) 1px, transparent 0)",
            backgroundSize: "24px 24px"
          }} />
          <div className="relative p-7">
            <CloseBtn onClick={onClose} testId="button-close-gold-modal" />
            <div className="flex flex-col items-center gap-4 mb-7">
              <motion.div
                animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.05, 1] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="p-4 rounded-3xl bg-gradient-to-br from-amber-400/15 to-yellow-500/5 border border-amber-400/15 shadow-[0_0_30px_rgba(245,158,11,0.15)]">
                <Crown className="h-10 w-10 text-amber-400" />
              </motion.div>
              <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 tracking-tight">Chat Gold</h2>
              <p className="text-[13px] text-amber-200/55 text-center leading-relaxed max-w-[240px]">Salas exclusivas, funciones premium y comunidad selecta.</p>
              <div className="flex items-baseline gap-1.5 mt-2">
                <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-amber-200 to-yellow-500">9.99</span>
                <span className="text-sm text-amber-400/60 font-bold">WLD/mes</span>
              </div>
            </div>
            <div className="space-y-3 mb-7 px-2">
              {[
                { icon: Zap, text: "Crea hasta 5 salas privadas" },
                { icon: Mic, text: "Envía audios y cualquier archivo" },
                { icon: Sparkles, text: "Mensajes efímeros (24h)" },
                { icon: Crown, text: "Badge Gold exclusivo" },
                { icon: Shield, text: "Nombre con efecto dorado" },
                { icon: Flame, text: "Prioridad en soporte" },
              ].map((f) => (
                <div key={f.text} className="flex items-center gap-3 text-[12px] text-amber-200/65 font-medium">
                  <div className="p-1.5 rounded-xl bg-amber-400/8">
                    <f.icon className="h-3.5 w-3.5 text-amber-400/60" />
                  </div>
                  {f.text}
                </div>
              ))}
            </div>
            <Btn variant="gold" onClick={onSubscribe} disabled={loading} className="w-full" testId="button-subscribe-gold">
              {loading ? (
                <div className="flex items-center gap-2">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full" />
                  Procesando…
                </div>
              ) : "Suscribirse con WLD"}
            </Btn>
            <button onClick={onClose} data-testid="button-cancel-gold"
              className="mt-4 w-full text-[11px] text-amber-200/30 hover:text-amber-200/60 cursor-pointer transition-colors font-bold tracking-wide">
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
        <motion.div initial={{ scale: 0.9, opacity: 0, y: 24 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 24 }}
          transition={SPRING}
          className="w-[90%] max-w-xs bg-gray-950/95 border border-white/8 rounded-3xl p-7 shadow-2xl backdrop-blur-xl relative"
          onClick={(e) => e.stopPropagation()}>
          <CloseBtn onClick={onClose} />
          <div className="flex items-center gap-4 mb-5">
            <div className={cx("p-3 rounded-2xl border", isGoldPrice ? "bg-amber-500/8 border-amber-400/10" : "bg-violet-500/8 border-violet-400/10")}>
              <Plus className={cx("h-6 w-6", isGoldPrice ? "text-amber-400" : "text-violet-400")} />
            </div>
            <div>
              <h2 className="text-base font-black text-white/90">Sala adicional</h2>
              <p className="text-[11px] text-white/40 font-medium mt-0.5">Has alcanzado el límite</p>
            </div>
          </div>
          <p className="text-[13px] text-white/55 mb-6 leading-relaxed">
            Crea una sala extra por{" "}
            <span className={cx("font-black", isGoldPrice ? "text-amber-400" : "text-violet-400")}>{amount} WLD</span>
          </p>
          <Btn variant="primary" onClick={onPay} disabled={loading} className="w-full" testId="button-pay-extra-room">
            {loading ? "Procesando…" : `Pagar ${amount} WLD`}
          </Btn>
          <button onClick={onClose} className="mt-4 w-full text-[11px] text-white/30 hover:text-white/60 cursor-pointer transition-colors font-bold">Cancelar</button>
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
        <motion.div initial={{ scale: 0.9, opacity: 0, y: 24 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 24 }}
          transition={SPRING}
          className="w-[92%] max-w-sm bg-gray-950/95 border border-white/8 rounded-3xl p-6 shadow-2xl backdrop-blur-xl relative"
          onClick={(e) => e.stopPropagation()}>
          <CloseBtn onClick={onClose} />
          <h2 className="text-base font-black text-white/90 mb-5 tracking-wide">Crear sala</h2>

          <div className={cx("flex items-center gap-2.5 px-4 py-2.5 rounded-2xl mb-5 border",
            isGoldRoom
              ? "bg-amber-400/8 border-amber-400/12 text-amber-300/70"
              : "bg-violet-400/8 border-violet-400/12 text-violet-300/70")}>
            {isGoldRoom ? <Crown className="h-4 w-4" /> : <Hash className="h-4 w-4" />}
            <span className="text-[11px] font-black tracking-wide">{isGoldRoom ? "Sala Gold" : "Sala Clásica"}</span>
          </div>

          <ModalInput label="Nombre" value={name} onChange={setName} placeholder="mi-sala-genial" maxLength={40} testId="input-room-name" />
          <div className="mt-4">
            <ModalInput label="Descripción" value={description} onChange={setDescription} placeholder="Para hablar de…" maxLength={120} />
          </div>

          <button onClick={() => setIsPrivate(p => !p)}
            className="mt-5 flex items-center gap-3 text-sm text-white/35 hover:text-white/60 cursor-pointer transition-all group">
            <div className={cx("p-2 rounded-xl border transition-all",
              isPrivate ? "bg-violet-500/10 border-violet-400/15 text-violet-400" : "bg-white/[0.03] border-white/8 text-white/25")}>
              {isPrivate ? <Lock className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
            </div>
            <span className="text-[12px] font-bold">{isPrivate ? "Sala privada" : "Sala pública"}</span>
          </button>

          <Btn variant="primary" disabled={!name.trim()} className="w-full mt-6" testId="button-confirm-create-room"
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
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const mediaRecRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const fileRef = useRef<HTMLInputElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const INPUT_EMOJIS = ["😀","😂","🥹","😍","🤩","😎","🥺","😭","🔥","❤️","💯","👍","👎","🙌","🎉","💀","🤔","😈","👀","💜","⚡","🫡","🤝","✨"];

    const handleSubmit = () => {
      if (!text.trim() && !file) return;
      onSend(text, file ?? undefined, undefined, ephemeral, replyTo ?? undefined);
      setText("");
      setFile(null);
      setEphemeral(false);
      setShowEmojiPicker(false);
      inputRef.current?.focus();
    };

    const insertEmoji = (emoji: string) => {
      setText(prev => prev + emoji);
      inputRef.current?.focus();
    };

    const startRec = async () => {
      if (!isGold) {
        onShowToast("¡Hazte Gold para enviar audios! 🎙️");
        return;
      }
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
      if (!isGold && !f.type.startsWith("image/")) {
        onShowToast("📎 Enviar archivos es exclusivo de Gold. En Classic solo puedes enviar imágenes.");
        return;
      }
      setFile(f);
    };

    const hasContent = text.trim() || file;

    return (
      <div className="flex flex-col gap-1.5 px-3 pb-[env(safe-area-inset-bottom,12px)] flex-shrink-0">
        <style>{`@keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }`}</style>

        <AnimatePresence>
          {replyTo && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs">
              <CornerUpLeft className="h-3 w-3 text-violet-400 flex-shrink-0" />
              <span className="text-violet-300 font-semibold truncate">{replyTo.username}:</span>
              <span className="text-white/40 truncate flex-1">{replyTo.content ?? "📎 archivo"}</span>
              <button onClick={onCancelReply} className="text-white/30 hover:text-white/60 cursor-pointer flex-shrink-0"><X className="h-3 w-3" /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {file && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-xs">
            <FileText className="h-3 w-3 text-violet-400 flex-shrink-0" />
            <span className="text-violet-300 truncate flex-1">{file.name}</span>
            <button onClick={() => setFile(null)} className="text-white/30 hover:text-white/60 cursor-pointer flex-shrink-0"><X className="h-3 w-3" /></button>
          </div>
        )}

        <AnimatePresence>
          {showEmojiPicker && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="flex flex-wrap gap-1 px-2 py-1.5 rounded-xl bg-gray-900/90 border border-white/10">
              {INPUT_EMOJIS.map((e) => (
                <button key={e} onClick={() => insertEmoji(e)}
                  className="text-lg hover:scale-125 transition-transform cursor-pointer">{e}</button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-end gap-2">
          <input ref={fileRef} type="file" accept={isGold ? FILE_ACCEPT : "image/png,image/jpeg,image/jpg,image/gif,image/webp"} onChange={handleFile} className="hidden" />

          <button onClick={() => fileRef.current?.click()} disabled={disabled}
            className="flex-shrink-0 h-9 w-9 rounded-xl flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-30">
            <Paperclip className="h-4 w-4" />
          </button>

          <button onClick={() => setShowEmojiPicker(e => !e)} disabled={disabled}
            className="flex-shrink-0 h-9 w-9 rounded-xl flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-30 text-lg">
            😊
          </button>

          <div className="flex-1 relative">
            <textarea ref={inputRef} value={text} rows={1}
              onChange={(e) => { setText(e.target.value); onTyping(); }}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
              placeholder={recording ? "🔴 Grabando audio…" : "Escribe un mensaje…"}
              disabled={disabled || recording}
              className={cx("w-full resize-none rounded-xl border px-3 py-2 text-sm text-white placeholder-white/25 outline-none transition-colors max-h-24 overflow-y-auto",
                isGold
                  ? "bg-amber-900/25 border-amber-500/15 focus:border-amber-400/40"
                  : "bg-white/5 border-white/10 focus:border-violet-500/50")} />
          </div>

          <button onClick={() => {
              if (!isGold) { onShowToast("¡Hazte Gold para usar mensajes efímeros! 👻"); return; }
              setEphemeral(e => !e);
            }} disabled={disabled} title="Mensaje efímero (24h)"
            className={cx("flex-shrink-0 h-9 w-9 rounded-xl flex items-center justify-center transition-colors cursor-pointer disabled:opacity-30 text-lg relative",
              ephemeral ? "bg-purple-400/20" : "hover:bg-white/8")}>
            👻
            {!isGold && (
              <Lock className="h-2.5 w-2.5 absolute -top-0.5 -right-0.5 text-yellow-400/70" />
            )}
          </button>

          <button onClick={recording ? stopRec : startRec}
            className={cx("flex-shrink-0 h-9 w-9 rounded-xl flex items-center justify-center transition-colors cursor-pointer relative",
              recording ? "text-red-400 bg-red-400/20 animate-pulse"
                : isGold ? "text-yellow-400/80 hover:text-yellow-300 hover:bg-yellow-400/10"
                : "text-white/20 hover:text-white/40 hover:bg-white/5")}>
            {recording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            {!isGold && !recording && (
              <Lock className="h-2.5 w-2.5 absolute -top-0.5 -right-0.5 text-yellow-400/70" />
            )}
          </button>

          <button onClick={handleSubmit} disabled={disabled || (!text.trim() && !file)}
            data-testid="button-send-message"
            className={cx("flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center shadow-lg transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed active:scale-95",
              isGold
                ? "bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500 shadow-yellow-500/40"
                : "bg-gradient-to-br from-violet-600 via-fuchsia-600 to-fuchsia-700 shadow-fuchsia-600/40")}>
            <Send className="h-4 w-4 text-white" />
          </button>
        </div>

        {!isGold && (
          <div className="overflow-hidden mt-1.5 rounded-lg bg-gradient-to-r from-yellow-500/10 via-amber-500/15 to-yellow-500/10 border border-yellow-500/20 py-1">
            <div className="flex whitespace-nowrap" style={{ animation: "marquee 12s linear infinite" }}>
              <span className="text-[10px] font-bold text-yellow-400/80 mx-3">⭐ HAZTE GOLD</span>
              <span className="text-[10px] text-yellow-300/50 mx-1">•</span>
              <span className="text-[10px] text-yellow-300/60 mx-1">Audios</span>
              <span className="text-[10px] text-yellow-300/50 mx-1">•</span>
              <span className="text-[10px] text-yellow-300/60 mx-1">Archivos</span>
              <span className="text-[10px] text-yellow-300/50 mx-1">•</span>
              <span className="text-[10px] text-yellow-300/60 mx-1">Efímeros</span>
              <span className="text-[10px] text-yellow-300/50 mx-1">•</span>
              <span className="text-[10px] text-yellow-300/60 mx-1">5 salas</span>
              <span className="text-[10px] text-yellow-300/50 mx-1">•</span>
              <span className="text-[10px] font-bold text-yellow-400/80 mx-3">⭐ HAZTE GOLD</span>
              <span className="text-[10px] text-yellow-300/50 mx-1">•</span>
              <span className="text-[10px] text-yellow-300/60 mx-1">Audios</span>
              <span className="text-[10px] text-yellow-300/50 mx-1">•</span>
              <span className="text-[10px] text-yellow-300/60 mx-1">Archivos</span>
              <span className="text-[10px] text-yellow-300/50 mx-1">•</span>
              <span className="text-[10px] text-yellow-300/60 mx-1">Efímeros</span>
              <span className="text-[10px] text-yellow-300/50 mx-1">•</span>
              <span className="text-[10px] text-yellow-300/60 mx-1">5 salas</span>
            </div>
          </div>
        )}

        
      </div>
    );
  }

  export function UnreadBanner({ count, onClick }: { count: number; onClick: () => void }) {
    if (count <= 0) return null;
    return (
      <motion.button
        initial={{ opacity: 0, y: -15, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -15, scale: 0.9 }}
        transition={SPRING}
        onClick={onClick}
        className="absolute top-20 left-1/2 -translate-x-1/2 z-30 px-5 py-2 rounded-full bg-gradient-to-r from-violet-600/90 to-fuchsia-600/90 text-white text-[11px] font-black shadow-[0_4px_30px_rgba(139,92,246,0.4)] cursor-pointer hover:shadow-[0_4px_40px_rgba(139,92,246,0.6)] transition-shadow backdrop-blur-sm border border-violet-400/20 tracking-wide"
      >
        ↓ {count} nuevo{count > 1 ? "s" : ""}
      </motion.button>
    );
  }
  