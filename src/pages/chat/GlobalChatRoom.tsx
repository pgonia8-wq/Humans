/**
 * GlobalChatRoom.tsx – Chat Premium 2026 · Self-contained
 *
 * npm install framer-motion lucide-react @supabase/supabase-js @worldcoin/minikit-js
 *
 * Props: isOpen, onClose, currentUserId  (sin cambios)
 *
 * Columnas nuevas OPCIONALES en global_chat_messages:
 *   reply_to_id text, reply_to_content text, reply_to_username text,
 *   audio_url text, edited_at timestamptz,
 *   deleted_for_all boolean DEFAULT false,
 *   ephemeral boolean DEFAULT false
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Send, Crown, MessageSquare, Paperclip, Plus, Share2,
  Users, Lock, Globe, Hash, ChevronDown, FileText, Sparkles,
  Star, Twitter, Mic, MicOff, Search, Pin, Edit2, Trash2,
  CornerUpLeft, CheckCheck, Check,
} from "lucide-react";
import { MiniKit, Tokens, tokenToDecimals } from "@worldcoin/minikit-js";
import { supabase } from "../../supabaseClient";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────────────────────────
const RECEIVER   = "0xdf4a991bc05945bd0212e773adcff6ea619f4c4b";
const EMOJI_LIST = ["❤️", "🔥", "😂", "😮", "👍", "🎉", "💯", "🤯"];

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────
export type UserRole = "admin" | "gold" | "free";
export type RoomType = "classic" | "gold";

export interface ChatRoom {
  id: string; name: string; type: RoomType; isPrivate: boolean;
  description?: string; createdBy?: string;
}

export interface ChatMessage {
  id: string; roomId: string; userId: string; username: string;
  avatarUrl?: string; content?: string;
  fileUrl?: string; fileName?: string; fileType?: string;
  audioUrl?: string;
  replyToId?: string; replyToContent?: string; replyToUsername?: string;
  editedAt?: string; deletedForAll?: boolean; ephemeral?: boolean;
  createdAt: string;
}

export interface TypingUser    { userId: string; username: string; }
export interface ConnectedUser { userId: string; username: string; avatarUrl?: string; }

export interface GlobalChatRoomProps {
  isOpen: boolean; onClose: () => void; currentUserId: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// SALAS ESTÁTICAS
// ─────────────────────────────────────────────────────────────────────────────
const STATIC_ROOMS: ChatRoom[] = [
  { id: "classic-general", name: "General",    type: "classic", isPrivate: false, description: "Chat general para todos" },
  { id: "classic-tech",    name: "Tecnología", type: "classic", isPrivate: false, description: "Habla de tech y programación" },
  { id: "gold-vip",        name: "VIP Lounge", type: "gold",    isPrivate: false, description: "Sala exclusiva Gold" },
  { id: "gold-business",   name: "Business",   type: "gold",    isPrivate: true,  description: "Negocios y networking" },
];

// ─────────────────────────────────────────────────────────────────────────────
// UTILIDADES
// ─────────────────────────────────────────────────────────────────────────────
function cx(...c: (string | false | undefined | null)[]): string { return c.filter(Boolean).join(" "); }
function timeStr(iso: string): string { return new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }); }
function initials(name: string): string { return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase(); }
function canEditMsg(createdAt: string): boolean { return Date.now() - new Date(createdAt).getTime() < 10 * 60 * 1000; }

function rowToMessage(row: Record<string, unknown>): ChatMessage {
  const profile = row.profiles as { username?: string; avatar_url?: string } | null | undefined;
  const senderId = String(row.sender_id ?? row.user_id ?? "");
  const resolvedUsername = profile?.username
    ? String(profile.username)
    : (row.username ? String(row.username) : (senderId ? `@${senderId.slice(0, 8)}` : "Usuario"));
  const resolvedAvatar = profile?.avatar_url
    ? String(profile.avatar_url)
    : (row.avatar_url ? String(row.avatar_url) : undefined);
  return {
    id:              String(row.id ?? ""),
    roomId:          String(row.room_id ?? ""),
    userId:          senderId,
    username:        resolvedUsername,
    avatarUrl:       resolvedAvatar,
    content:         row.content           ? String(row.content)           : undefined,
    fileUrl:         row.file_url          ? String(row.file_url)          : undefined,
    fileName:        row.file_name         ? String(row.file_name)         : undefined,
    fileType:        row.file_type         ? String(row.file_type)         : undefined,
    audioUrl:        row.audio_url         ? String(row.audio_url)         : undefined,
    replyToId:       row.reply_to_id       ? String(row.reply_to_id)       : undefined,
    replyToContent:  row.reply_to_content  ? String(row.reply_to_content)  : undefined,
    replyToUsername: row.reply_to_username ? String(row.reply_to_username) : undefined,
    editedAt:        row.edited_at         ? String(row.edited_at)         : undefined,
    deletedForAll:   row.deleted_for_all   === true,
    ephemeral:       row.ephemeral         === true,
    createdAt:       String(row.created_at ?? new Date().toISOString()),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// AVATAR
// ─────────────────────────────────────────────────────────────────────────────
function Avatar({ src, name, size = "md", ring = false, gold = false }: {
  src?: string; name: string; size?: "xs" | "sm" | "md"; ring?: boolean; gold?: boolean;
}) {
  const [imgError, setImgError] = useState(false);
  const sz = size === "xs" ? "w-5 h-5 text-[8px]" : size === "sm" ? "w-8 h-8 text-xs" : "w-9 h-9 text-sm";
  const rg = ring ? gold
    ? "ring-2 ring-yellow-400/80 shadow-[0_0_12px_rgba(234,179,8,0.55)]"
    : "ring-2 ring-fuchsia-500/70 shadow-[0_0_12px_rgba(217,70,239,0.45)]" : "";

  return (
    <div className={cx("rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden transition-all duration-200", sz, rg,
      gold ? "bg-gradient-to-br from-yellow-800/80 to-amber-900/80 text-yellow-300 font-bold"
           : "bg-gradient-to-br from-indigo-900/80 to-violet-900/80 text-violet-300 font-bold")}>
      {src && !imgError
        ? <img src={src} alt={name} className="w-full h-full object-cover" onError={() => setImgError(true)} />
        : <span>{initials(name)}</span>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BTN
// ─────────────────────────────────────────────────────────────────────────────
function Btn({ children, onClick, disabled, variant = "primary", className, testId }: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean;
  variant?: "primary" | "ghost" | "outline" | "gold" | "danger"; className?: string; testId?: string;
}) {
  const base = "inline-flex items-center justify-center gap-2 rounded-xl font-semibold text-sm transition-all duration-150 select-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed";
  const variants: Record<string, string> = {
    primary: "bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-4 py-2 shadow-lg shadow-violet-500/25 active:brightness-90",
    ghost:   "text-white/60 px-2 py-1.5 hover:bg-white/8 active:bg-white/12",
    outline: "border border-violet-500/30 text-violet-300 px-4 py-2 hover:bg-violet-500/10 active:bg-violet-600/20",
    gold:    "bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-400 text-white px-4 py-2 shadow-lg shadow-yellow-500/30 active:brightness-90",
    danger:  "bg-red-600/80 text-white px-3 py-1.5 hover:bg-red-600 active:brightness-90",
  };
  return (
    <button onClick={onClick} disabled={disabled} data-testid={testId} className={cx(base, variants[variant], className)}>
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROLE BADGE
// ─────────────────────────────────────────────────────────────────────────────
function RoleBadge({ role }: { role: UserRole }) {
  if (role === "admin") return <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/20 font-semibold">Admin</span>;
  if (role === "gold")  return <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 font-semibold">Gold ✦</span>;
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// EMOJI PICKER
// ─────────────────────────────────────────────────────────────────────────────
function EmojiPicker({ onPick, isOwn }: { onPick: (e: string) => void; isOwn: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.75, y: 6 }} animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.75, y: 6 }} transition={{ duration: 0.15, ease: "easeOut" }}
      className={cx(
        "absolute z-40 flex gap-0.5 p-1.5 rounded-2xl border border-white/15 shadow-2xl backdrop-blur-2xl bg-slate-900/95",
        "bottom-[calc(100%+6px)]", isOwn ? "right-0" : "left-0"
      )}
    >
      {EMOJI_LIST.map((e) => (
        <button key={e} onClick={() => onPick(e)}
          className="text-base p-1.5 rounded-xl hover:bg-white/12 active:scale-90 transition-all cursor-pointer">
          {e}
        </button>
      ))}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REACTION BAR
// ─────────────────────────────────────────────────────────────────────────────
function ReactionBar({ reactions, currentUserId, onReact }: {
  reactions: Record<string, string[]>; currentUserId: string; onReact: (emoji: string) => void;
}) {
  const entries = Object.entries(reactions).filter(([, users]) => users.length > 0);
  if (!entries.length) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {entries.map(([emoji, users]) => {
        const mine = users.includes(currentUserId);
        return (
          <button key={emoji} onClick={() => onReact(emoji)}
            className={cx(
              "flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition-all cursor-pointer border",
              mine
                ? "bg-violet-600/40 border-violet-500/50 text-violet-200"
                : "bg-white/8 border-white/12 text-white/60 hover:bg-white/15"
            )}>
            <span>{emoji}</span><span>{users.length}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AUDIO PLAYER
// ─────────────────────────────────────────────────────────────────────────────
function AudioPlayer({ url, isOwn }: { url: string; isOwn: boolean }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const bars = Array.from({ length: 20 }, (_, i) => 0.3 + Math.sin(i * 0.8) * 0.5 + Math.random() * 0.2);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  };

  return (
    <div className="flex items-center gap-2 py-1 min-w-[160px]">
      <audio ref={audioRef} src={url} onEnded={() => { setPlaying(false); setProgress(0); }}
        onTimeUpdate={() => { if (audioRef.current) setProgress(audioRef.current.currentTime / (audioRef.current.duration || 1)); }}
        onLoadedMetadata={() => { if (audioRef.current) setDuration(audioRef.current.duration); }} />
      <button onClick={toggle} className={cx("flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer",
        isOwn ? "bg-white/20 hover:bg-white/30" : "bg-violet-500/30 hover:bg-violet-500/50")}>
        {playing
          ? <span className="flex gap-[2px]">{[0,1].map(i=><span key={i} className="w-[3px] h-3 rounded-full bg-current block"/>)}</span>
          : <span className="ml-0.5 border-l-[6px] border-y-[4px] border-y-transparent border-l-current"/>
        }
      </button>
      <div className="flex items-center gap-[2px] flex-1">
        {bars.map((h, i) => (
          <div key={i} className={cx("rounded-full flex-1 transition-all",
            i / bars.length < progress
              ? isOwn ? "bg-white/80" : "bg-violet-400"
              : isOwn ? "bg-white/30" : "bg-white/20"
          )} style={{ height: `${Math.max(4, h * 20)}px` }} />
        ))}
      </div>
      <span className="text-[10px] text-current/50 flex-shrink-0">
        {duration > 0 ? `${Math.floor(duration / 60)}:${String(Math.floor(duration % 60)).padStart(2, "0")}` : "0:00"}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPING INDICATOR
// ─────────────────────────────────────────────────────────────────────────────
function TypingIndicator({ users }: { users: TypingUser[] }) {
  if (!users.length) return null;
  const label = users.length === 1
    ? `${users[0].username} está escribiendo`
    : `${users.map((u) => u.username).join(", ")} están escribiendo`;

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
      className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/8 w-fit">
      <div className="flex gap-[3px]">
        {[0, 1, 2].map((i) => (
          <motion.span key={i} className="w-1.5 h-1.5 rounded-full bg-fuchsia-400 block"
            animate={{ y: [0, -5, 0], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15 }} />
        ))}
      </div>
      <span className="text-[11px] text-white/50 italic font-medium">{label}…</span>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PINNED BAR
// ─────────────────────────────────────────────────────────────────────────────
function PinnedBar({ messages, isGold, onUnpin }: {
  messages: ChatMessage[]; isGold: boolean; onUnpin: (id: string) => void;
}) {
  const [idx, setIdx] = useState(0);
  if (!messages.length) return null;
  const msg = messages[idx % messages.length];
  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
      className={cx("flex items-center gap-2 px-3 py-1.5 border-b text-xs flex-shrink-0",
        isGold ? "border-yellow-500/20 bg-yellow-900/20" : "border-violet-500/20 bg-violet-900/15")}>
      <Pin className={cx("h-3 w-3 flex-shrink-0", isGold ? "text-yellow-400" : "text-violet-400")} />
      <span className={cx("font-semibold flex-shrink-0", isGold ? "text-yellow-300" : "text-violet-300")}>{msg.username}:</span>
      <span className="text-white/60 truncate flex-1">{msg.content ?? "📎 archivo"}</span>
      {messages.length > 1 && (
        <button onClick={() => setIdx(i => i + 1)}
          className="text-white/30 hover:text-white/60 cursor-pointer text-[10px] flex-shrink-0">
          {idx % messages.length + 1}/{messages.length}
        </button>
      )}
      <button onClick={() => onUnpin(msg.id)} className="text-white/20 hover:text-white/50 cursor-pointer flex-shrink-0">
        <X className="h-3 w-3" />
      </button>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SEARCH BAR
// ─────────────────────────────────────────────────────────────────────────────
function SearchBar({ value, onChange, onClose, isGold }: {
  value: string; onChange: (v: string) => void; onClose: () => void; isGold: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
      className={cx("flex items-center gap-2 px-3 py-2 border-b flex-shrink-0",
        isGold ? "border-yellow-500/20 bg-yellow-900/20" : "border-violet-500/20 bg-violet-900/15")}>
      <Search className="h-3.5 w-3.5 text-white/30 flex-shrink-0" />
      <input ref={ref} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder="Buscar mensajes…"
        className="flex-1 bg-transparent text-sm text-white placeholder-white/30 outline-none" />
      {value && <button onClick={() => onChange("")} className="text-white/30 hover:text-white/60 cursor-pointer"><X className="h-3.5 w-3.5" /></button>}
      <button onClick={onClose} className="text-white/30 hover:text-white/60 cursor-pointer text-xs">Cerrar</button>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MESSAGE BUBBLE
// ─────────────────────────────────────────────────────────────────────────────
function MessageBubble({ message, isOwn, isGold, currentUserId, reactions, seenByOthers,
  editingId, editText, setEditText,
  onShare, onReply, onReact, onEdit, onDelete, onPin, onSaveEdit, onCancelEdit,
}: {
  message: ChatMessage; isOwn: boolean; isGold: boolean; currentUserId: string;
  reactions: Record<string, string[]>; seenByOthers: boolean;
  editingId: string | null; editText: string; setEditText: (t: string) => void;
  onShare: (m: ChatMessage) => void; onReply: (m: ChatMessage) => void;
  onReact: (msgId: string, emoji: string) => void;
  onEdit: (msgId: string) => void; onDelete: (msgId: string) => void;
  onPin: (msgId: string) => void;
  onSaveEdit: (msgId: string, text: string) => void; onCancelEdit: () => void;
}) {
  const [hover, setHover]         = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const isEditing = editingId === message.id;

  if (message.deletedForAll) {
    return (
      <div className={cx("flex gap-2.5", isOwn ? "flex-row-reverse" : "flex-row")}>
        <div className="w-8 h-8 flex-shrink-0" />
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white/5 border border-white/8 text-xs text-white/30 italic">
          <Trash2 className="w-3 h-3" /> Mensaje eliminado
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className={cx("flex gap-2.5 group", isOwn ? "flex-row-reverse" : "flex-row")}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => { setHover(false); setShowPicker(false); }}
    >
      {/* Avatar */}
      <div className="flex-shrink-0 mt-1">
        <Avatar src={message.avatarUrl} name={message.username} size="sm" ring gold={isGold} />
      </div>

      {/* Columna principal */}
      <div className={cx("flex flex-col gap-1 max-w-[75%] relative", isOwn ? "items-end" : "items-start")}>
        {/* Meta */}
        <div className={cx("flex items-center gap-1.5 flex-wrap", isOwn ? "flex-row-reverse" : "flex-row")}>
          <span className={cx("text-xs font-semibold", isGold ? "text-yellow-300" : "text-violet-300")}>{message.username}</span>
          <span className="text-[10px] text-white/30">{timeStr(message.createdAt)}</span>
          {message.editedAt && <span className="text-[9px] text-white/25 italic">editado</span>}
        </div>

        {/* Reply preview */}
        {message.replyToContent && (
          <div className={cx("flex items-start gap-1.5 px-2 py-1 rounded-lg border-l-2 bg-white/5 max-w-full",
            isGold ? "border-yellow-500/50" : "border-violet-500/50")}>
            <CornerUpLeft className="h-2.5 w-2.5 flex-shrink-0 mt-0.5 text-white/30" />
            <div className="min-w-0">
              <span className={cx("text-[10px] font-semibold block", isGold ? "text-yellow-400/70" : "text-violet-400/70")}>
                {message.replyToUsername}
              </span>
              <span className="text-[11px] text-white/40 truncate block">{message.replyToContent}</span>
            </div>
          </div>
        )}

        {/* Burbuja */}
        {isEditing ? (
          <div className="flex flex-col gap-1.5 w-full">
            <textarea value={editText} onChange={(e) => setEditText(e.target.value)}
              rows={2} autoFocus
              className="w-full rounded-xl border border-violet-500/40 bg-violet-900/40 px-3 py-2 text-sm text-white outline-none resize-none focus:border-fuchsia-500/60"
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSaveEdit(message.id, editText); } if (e.key === "Escape") onCancelEdit(); }}
            />
            <div className="flex gap-1.5 justify-end">
              <button onClick={onCancelEdit} className="text-[11px] text-white/40 px-2 py-0.5 cursor-pointer hover:text-white/60">Cancelar</button>
              <button onClick={() => onSaveEdit(message.id, editText)}
                className="text-[11px] text-white bg-violet-600 px-2.5 py-0.5 rounded-lg cursor-pointer hover:bg-violet-500 font-medium">Guardar</button>
            </div>
          </div>
        ) : (
          <div className={cx(
            "rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-lg",
            isOwn
              ? isGold
                ? "bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500 text-white rounded-tr-sm shadow-lg shadow-yellow-500/35"
                : "bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 text-white rounded-tr-sm shadow-lg shadow-violet-600/40"
              : isGold
                ? "bg-amber-950/60 backdrop-blur-xl border border-yellow-500/15 text-zinc-50 drop-shadow-sm rounded-tl-sm"
                : "bg-white/8 backdrop-blur-xl border border-white/12 text-zinc-50 drop-shadow-sm rounded-tl-sm"
          )}>
            {message.content && <p className="break-words whitespace-pre-wrap">{message.content}</p>}

            {/* Audio */}
            {message.audioUrl && <AudioPlayer url={message.audioUrl} isOwn={isOwn} />}

            {/* Adjunto */}
            {message.fileUrl && (
              <div className="mt-1.5">
                {message.fileType?.startsWith("image/") ? (
                  <img src={message.fileUrl} alt={message.fileName ?? "imagen"}
                    onClick={() => window.open(message.fileUrl!, "_blank")}
                    className="rounded-xl max-w-[200px] max-h-[150px] object-cover cursor-pointer border border-white/10 shadow-lg" />
                ) : (
                  <a href={message.fileUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs underline opacity-80">
                    <FileText className="w-4 h-4 flex-shrink-0" />{message.fileName ?? "archivo"}
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        {/* Reacciones */}
        <ReactionBar reactions={reactions} currentUserId={currentUserId} onReact={(e) => onReact(message.id, e)} />

        {/* Read receipt */}
        {isOwn && (
          <div className={cx("flex items-center gap-0.5 mt-0.5", seenByOthers ? "text-sky-400" : "text-white/25")}>
            {seenByOthers ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />}
          </div>
        )}

        {/* Acciones hover */}
        <AnimatePresence>
          {hover && !isEditing && (
            <motion.div
              initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.88 }} transition={{ duration: 0.1 }}
              className={cx("flex items-center gap-0.5 px-1 py-0.5 rounded-xl bg-slate-900/95 border border-white/12 backdrop-blur-xl shadow-xl",
                isOwn ? "flex-row-reverse" : "flex-row")}
            >
              {/* Emoji picker toggle */}
              <div className="relative">
                <ActionBtn onClick={() => setShowPicker(p => !p)} title="Reaccionar">😊</ActionBtn>
                <AnimatePresence>
                  {showPicker && <EmojiPicker isOwn={isOwn} onPick={(e) => { onReact(message.id, e); setShowPicker(false); }} />}
                </AnimatePresence>
              </div>
              <ActionBtn onClick={() => onReply(message)} title="Responder"><CornerUpLeft className="h-3.5 w-3.5" /></ActionBtn>
              <ActionBtn onClick={() => onPin(message.id)} title="Fijar"><Pin className="h-3.5 w-3.5" /></ActionBtn>
              <ActionBtn onClick={() => onShare(message)} title="Compartir"><Share2 className="h-3.5 w-3.5" /></ActionBtn>
              {isOwn && canEditMsg(message.createdAt) && (
                <ActionBtn onClick={() => onEdit(message.id)} title="Editar"><Edit2 className="h-3.5 w-3.5" /></ActionBtn>
              )}
              {isOwn && (
                <ActionBtn onClick={() => onDelete(message.id)} title="Eliminar" danger>
                  <Trash2 className="h-3.5 w-3.5" />
                </ActionBtn>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function ActionBtn({ children, onClick, title, danger }: {
  children: React.ReactNode; onClick: () => void; title?: string; danger?: boolean;
}) {
  return (
    <button onClick={onClick} title={title}
      className={cx("p-1.5 rounded-lg transition-all cursor-pointer text-sm",
        danger ? "text-red-400 hover:bg-red-500/15" : "text-white/50 hover:text-white hover:bg-white/10")}>
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL SUSCRIPCIÓN GOLD
// ─────────────────────────────────────────────────────────────────────────────
function GoldSubscribeModal({ onClose, onSubscribe, loading }: {
  onClose: () => void; onSubscribe: () => void; loading?: boolean;
}) {
  return (
    <Overlay>
      <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.85, opacity: 0 }} transition={{ type: "spring", damping: 20, stiffness: 300 }}
        className="relative w-80 rounded-2xl border border-yellow-400/30 bg-gradient-to-b from-yellow-950/97 to-amber-950/93 p-6 shadow-2xl shadow-yellow-900/40">
        <CloseBtn onClick={onClose} testId="button-close-gold-modal" />
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 shadow-xl shadow-yellow-500/40">
            <Crown className="h-8 w-8 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-yellow-300">Gold Chat</h3>
            <p className="mt-1 text-sm text-yellow-100/60">Accede a salas exclusivas, funciones premium y una comunidad VIP</p>
          </div>
          <ul className="w-full space-y-2 text-left text-sm text-yellow-100/70">
            {["Salas exclusivas Gold", "Acceso a Business & VIP Lounge", "Sin publicidad", "Badge Gold especial"].map((f) => (
              <li key={f} className="flex items-center gap-2">
                <Star className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" /> {f}
              </li>
            ))}
          </ul>
          <div className="w-full space-y-2">
            <Btn variant="gold" onClick={onSubscribe} disabled={loading} className="w-full" testId="button-subscribe-gold">
              <Sparkles className="h-4 w-4" />
              {loading ? "Procesando pago…" : "Suscribirme — 9.99 WLD"}
            </Btn>
            <button onClick={onClose} data-testid="button-cancel-gold"
              className="w-full text-xs text-yellow-100/40 cursor-pointer py-1">Quizás más tarde</button>
          </div>
        </div>
      </motion.div>
    </Overlay>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL CREAR SALA
// ─────────────────────────────────────────────────────────────────────────────
function CreateRoomModal({ onClose, onCreate, canCreateGold }: {
  onClose: () => void; onCreate: (room: Omit<ChatRoom, "id">) => void; canCreateGold: boolean;
}) {
  const [name, setName]               = useState("");
  const [type, setType]               = useState<RoomType>("classic");
  const [isPrivate, setIsPrivate]     = useState(false);
  const [description, setDescription] = useState("");

  return (
    <Overlay>
      <motion.div initial={{ scale: 0.88, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.88, opacity: 0 }} transition={{ type: "spring", damping: 20, stiffness: 300 }}
        className="relative w-80 rounded-2xl border border-violet-500/30 bg-gradient-to-b from-indigo-950/97 to-violet-950/93 p-6 shadow-2xl">
        <CloseBtn onClick={onClose} testId="button-close-create-room" />
        <h3 className="mb-4 text-base font-bold text-violet-200">Crear nueva sala</h3>
        <div className="space-y-3">
          <ModalInput label="Nombre" value={name} onChange={setName} placeholder="ej. off-topic" maxLength={50} testId="input-room-name" />
          <ModalInput label="Descripción (opcional)" value={description} onChange={setDescription} placeholder="De qué trata esta sala" maxLength={100} testId="input-room-description" />
          <div>
            <label className="mb-1 block text-xs text-violet-300">Tipo</label>
            <div className="flex gap-2">
              {(["classic", "gold"] as RoomType[]).map((t) => {
                const isG = t === "gold"; const active = type === t;
                return (
                  <button key={t} onClick={() => (!isG || canCreateGold) && setType(t)} data-testid={`button-type-${t}`}
                    className={cx("flex-1 rounded-xl border py-2 text-xs font-medium transition-all",
                      isG && !canCreateGold ? "cursor-not-allowed opacity-40" : "cursor-pointer",
                      active ? isG ? "border-yellow-500 bg-yellow-600/30 text-yellow-200" : "border-violet-500 bg-violet-600/40 text-violet-200" : "border-white/10 text-white/40")}>
                    {isG ? <Crown className="mx-auto mb-0.5 h-4 w-4" /> : <MessageSquare className="mx-auto mb-0.5 h-4 w-4" />}
                    {t === "classic" ? "Classic" : <>Gold {!canCreateGold && <span className="text-[9px]">(Gold+)</span>}</>}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setIsPrivate(!isPrivate)} data-testid="button-toggle-private"
              className={cx("flex h-5 w-9 items-center rounded-full border transition-all cursor-pointer",
                isPrivate ? "border-violet-500 bg-violet-600/60" : "border-white/20 bg-white/10")}>
              <span className={cx("ml-0.5 h-3.5 w-3.5 rounded-full bg-white shadow transition-all", isPrivate && "translate-x-4")} />
            </button>
            <span className="flex items-center gap-1 text-xs text-violet-300">
              {isPrivate ? <Lock className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
              {isPrivate ? "Sala privada" : "Sala pública"}
            </span>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Btn variant="outline" onClick={onClose} className="flex-1" testId="button-cancel-create-room">Cancelar</Btn>
          <Btn variant="primary" disabled={!name.trim()} className="flex-1" testId="button-confirm-create-room"
            onClick={() => { if (!name.trim()) return; onCreate({ name: name.trim(), type, isPrivate, description: description.trim() || undefined }); onClose(); }}>
            Crear sala
          </Btn>
        </div>
      </motion.div>
    </Overlay>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL COMPARTIR
// ─────────────────────────────────────────────────────────────────────────────
function ShareModal({ message, onClose }: { message: ChatMessage; onClose: () => void }) {
  const text = encodeURIComponent(`"${message.content}" — ${message.username} en GlobalChat`);
  const platforms = [
    { label: "Twitter / X", url: `https://twitter.com/intent/tweet?text=${text}`, color: "text-sky-400",    icon: <Twitter className="h-4 w-4" /> },
    { label: "WhatsApp",    url: `https://wa.me/?text=${text}`,                    color: "text-green-400", icon: <WhatsAppIcon /> },
    { label: "Discord",     url: `https://discord.com/`,                           color: "text-indigo-400",icon: <DiscordIcon /> },
  ];
  return (
    <Overlay>
      <motion.div initial={{ scale: 0.9, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0 }} transition={{ type: "spring", damping: 22, stiffness: 300 }}
        className="relative w-72 rounded-2xl border border-white/10 bg-slate-900/98 p-5 shadow-2xl">
        <CloseBtn onClick={onClose} testId="button-close-share" />
        <h3 className="mb-3 text-sm font-bold text-white">Compartir mensaje</h3>
        {message.content && <p className="mb-4 rounded-xl bg-white/5 px-3 py-2 text-xs text-white/50 italic line-clamp-2">"{message.content}"</p>}
        <div className="space-y-2">
          {platforms.map((p) => (
            <a key={p.label} href={p.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70 cursor-pointer">
              <span className={p.color}>{p.icon}</span>{p.label}
            </a>
          ))}
          <button onClick={() => { navigator.clipboard.writeText(message.content ?? ""); onClose(); }}
            className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70 cursor-pointer">
            <Hash className="h-4 w-4 text-fuchsia-400" /> Copiar texto
          </button>
        </div>
      </motion.div>
    </Overlay>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CHAT INPUT
// ─────────────────────────────────────────────────────────────────────────────
function ChatInput({ onSend, onTyping, isGold, disabled, replyTo, onCancelReply }: {
  onSend: (content: string, file?: File, audioBlob?: Blob, ephemeral?: boolean, replyTo?: ChatMessage) => void;
  onTyping: (b: boolean) => void; isGold: boolean; disabled?: boolean;
  replyTo: ChatMessage | null; onCancelReply: () => void;
}) {
  const [text, setText]               = useState("");
  const [file, setFile]               = useState<File | null>(null);
  const [previewUrl, setPreviewUrl]   = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recSecs, setRecSecs]         = useState(0);
  const [ephemeral, setEphemeral]     = useState(false);
  const fileRef           = useRef<HTMLInputElement>(null);
  const textareaRef       = useRef<HTMLTextAreaElement>(null);
  const typingTimer       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mediaRecorder     = useRef<MediaRecorder | null>(null);
  const audioChunks       = useRef<Blob[]>([]);
  const recInterval       = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearFile = () => { setFile(null); setPreviewUrl(null); if (fileRef.current) fileRef.current.value = ""; };

  const send = () => {
    if (!text.trim() && !file) return;
    onSend(text.trim(), file ?? undefined, undefined, ephemeral, replyTo ?? undefined);
    setText(""); clearFile(); onTyping(false);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    const el = e.target; el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 120) + "px";
    onTyping(true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => onTyping(false), 1500);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4", ""]
        .find((m) => !m || MediaRecorder.isTypeSupported(m)) ?? "";
      const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      audioChunks.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) audioChunks.current.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(audioChunks.current, { type: rec.mimeType || "audio/webm" });
        onSend("", undefined, blob, ephemeral, replyTo ?? undefined);
        stream.getTracks().forEach((t) => t.stop());
        setRecSecs(0);
        if (recInterval.current) clearInterval(recInterval.current);
      };
      rec.start(250);
      mediaRecorder.current = rec;
      setIsRecording(true);
      recInterval.current = setInterval(() => setRecSecs((s) => s + 1), 1000);
    } catch { console.warn("[GlobalChat] Micrófono no disponible"); }
  };

  const stopRecording = () => {
    mediaRecorder.current?.stop();
    setIsRecording(false);
    if (recInterval.current) clearInterval(recInterval.current);
  };

  return (
    <div className={cx("border-t p-3 flex-shrink-0 backdrop-blur-sm",
      isGold ? "border-yellow-500/20 bg-yellow-950/40" : "border-violet-500/20 bg-slate-950/60")}>

      {/* Reply preview */}
      <AnimatePresence>
        {replyTo && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="mb-2 flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-2.5 py-1.5">
            <CornerUpLeft className="h-3 w-3 text-violet-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-semibold text-violet-300">{replyTo.username}</span>
              <p className="text-[11px] text-white/40 truncate">{replyTo.content ?? "📎 archivo"}</p>
            </div>
            <button onClick={onCancelReply} className="text-white/30 hover:text-white/60 cursor-pointer"><X className="h-3.5 w-3.5" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* File preview */}
      <AnimatePresence>
        {file && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="mb-2 flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 p-2">
            {previewUrl ? <img src={previewUrl} alt="prev" className="h-10 w-10 rounded-lg object-cover" /> : <FileText className="h-8 w-8 text-violet-400 flex-shrink-0" />}
            <div className="flex-1 min-w-0">
              <p className="truncate text-xs text-white/70">{file.name}</p>
              <p className="text-[10px] text-white/30">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
            <button onClick={clearFile} className="text-white/30 cursor-pointer p-1" data-testid="button-clear-file"><X className="h-4 w-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>

            {/* Recording indicator */}
      <AnimatePresence>
        {isRecording && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="mb-2 flex items-center gap-2 rounded-xl bg-red-500/15 border border-red-500/30 px-3 py-2">
            <motion.span className="w-2 h-2 rounded-full bg-red-400 block"
              animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }} />
            <span className="text-xs text-red-300 font-medium flex-1">
              Grabando… {Math.floor(recSecs / 60)}:{String(recSecs % 60).padStart(2, "0")}
            </span>
            <span className="text-[10px] text-red-400/60">Toca 🎤 para enviar</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-end gap-1.5">
        {/* File */}
        <input ref={fileRef} type="file" accept="image/*,.pdf,.doc,.docx,.txt" className="hidden"
          data-testid="input-file-upload"
          onChange={(e) => {
            const f = e.target.files?.[0]; if (!f) return;
            setFile(f); setPreviewUrl(f.type.startsWith("image/") ? URL.createObjectURL(f) : null);
          }} />
        <button onClick={() => fileRef.current?.click()} disabled={disabled || isRecording} data-testid="button-attach-file"
          className={cx("flex-shrink-0 p-2.5 rounded-xl transition-colors cursor-pointer disabled:opacity-30",
            isGold ? "text-yellow-400/60 hover:bg-yellow-500/10" : "text-violet-400/60 hover:bg-violet-500/10")}>
          <Paperclip className="h-4 w-4" />
        </button>

        {/* Mic */}
        <button onClick={isRecording ? stopRecording : startRecording} disabled={disabled}
          data-testid="button-mic"
          className={cx("flex-shrink-0 p-2.5 rounded-xl transition-all cursor-pointer disabled:opacity-30",
            isRecording ? "text-red-400 bg-red-500/15 hover:bg-red-500/25" : isGold ? "text-yellow-400/60 hover:bg-yellow-500/10" : "text-violet-400/60 hover:bg-violet-500/10")}>
          {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </button>

        {/* Ephemeral toggle */}
        <button onClick={() => setEphemeral(!ephemeral)} disabled={disabled}
          title={ephemeral ? "Mensaje efímero (24h)" : "Mensaje normal"}
          className={cx("flex-shrink-0 p-2.5 rounded-xl transition-all cursor-pointer disabled:opacity-30 text-sm",
            ephemeral ? "text-fuchsia-400 bg-fuchsia-500/15" : "text-white/20 hover:text-white/40")}>
          ⏳
        </button>

        {/* Textarea */}
        <textarea ref={textareaRef} value={text} onChange={handleChange} onKeyDown={handleKey}
          disabled={disabled || isRecording} rows={1}
          placeholder={disabled ? "Solo para usuarios Gold" : isRecording ? "Grabando audio…" : "Escribe un mensaje… (Enter para enviar)"}
          data-testid="input-chat-message"
          className={cx(
            "flex-1 resize-none rounded-2xl border text-sm text-white placeholder-white/30 bg-transparent transition-all py-2.5 px-3.5 outline-none min-h-[40px] max-h-[120px] overflow-y-auto scrollbar-thin focus:ring-1",
            isGold
              ? "border-yellow-500/30 bg-yellow-900/20 focus:border-yellow-400/50 focus:ring-yellow-500/20"
              : "border-violet-500/30 bg-violet-900/20 focus:border-fuchsia-500/40 focus:ring-fuchsia-500/15 focus:shadow-[0_0_20px_rgba(217,70,239,0.08)]"
          )} />

        {/* Send */}
        <button onClick={send} disabled={disabled || isRecording || (!text.trim() && !file)}
          data-testid="button-send-message"
          className={cx(
            "flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center shadow-lg transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed active:scale-95",
            isGold
              ? "bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500 shadow-yellow-500/40"
              : "bg-gradient-to-br from-violet-600 via-fuchsia-600 to-fuchsia-700 shadow-fuchsia-600/40"
          )}>
          <Send className="h-4 w-4 text-white" />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS LAYOUT
// ─────────────────────────────────────────────────────────────────────────────
function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex items-center justify-center rounded-2xl bg-black/70 backdrop-blur-md">
      {children}
    </motion.div>
  );
}

function CloseBtn({ onClick, testId }: { onClick: () => void; testId?: string }) {
  return (
    <button onClick={onClick} data-testid={testId}
      className="absolute right-3 top-3 text-white/30 hover:text-white/60 cursor-pointer p-1 rounded-lg transition-colors">
      <X className="h-4 w-4" />
    </button>
  );
}

function ModalInput({ label, value, onChange, placeholder, maxLength, testId }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; maxLength?: number; testId?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-violet-300">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} maxLength={maxLength} data-testid={testId}
        className="w-full rounded-xl border border-violet-500/30 bg-violet-900/40 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-violet-400/60 transition-colors" />
    </div>
  );
}

function WhatsAppIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.99-1.418A9.956 9.956 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a7.946 7.946 0 01-4.057-1.107l-.29-.173-3.008.855.84-3.074-.19-.307A7.95 7.95 0 014 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z"/>
    </svg>
  );
}

function DiscordIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03z"/>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export default function GlobalChatRoom({ isOpen, onClose, currentUserId }: GlobalChatRoomProps) {

  const [roomType,       setRoomType]       = useState<RoomType>("classic");
  const [rooms,          setRooms]          = useState<ChatRoom[]>(STATIC_ROOMS);
  const [selectedRoomId, setSelectedRoomId] = useState("classic-general");
  const [messages,       setMessages]       = useState<Record<string, ChatMessage[]>>({});
  const [typingUsers,    setTypingUsers]    = useState<TypingUser[]>([]);
  const [connected,      setConnected]      = useState<ConnectedUser[]>([]);
  const [showRooms,      setShowRooms]      = useState(false);
  const [showGoldModal,  setShowGoldModal]  = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [shareMsg,       setShareMsg]       = useState<ChatMessage | null>(null);
  const [isClassicSubscribed, setIsClassicSubscribed] = useState(false);
  const [isGoldSubscribed,   setIsGoldSubscribed]    = useState(false);
  const [goldLoading,        setGoldLoading]          = useState(false);
  const [myUsername,         setMyUsername]            = useState<string>("");
  const [userTier,           setUserTier]              = useState<string>("");

  const [reactions,   setReactions]   = useState<Record<string, Record<string, string[]>>>({});
  const [pinnedIds,   setPinnedIds]   = useState<string[]>([]);
  const [replyTo,     setReplyTo]     = useState<ChatMessage | null>(null);
  const [editingId,   setEditingId]   = useState<string | null>(null);
  const [editText,    setEditText]    = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch,  setShowSearch]  = useState(false);
  const [seenMsgIds,  setSeenMsgIds]  = useState<Set<string>>(new Set());

  const bottomRef      = useRef<HTMLDivElement>(null);
  const realtimeRef    = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const isGold     = roomType === "gold";
  const canUseGold = isGoldSubscribed;
  const selectedRoom  = rooms.find((r) => r.id === selectedRoomId);
  const filteredRooms = rooms.filter((r) => r.type === roomType);

  const now = Date.now();
  const allMessages = messages[selectedRoomId] ?? [];
  const activeMessages = allMessages
    .filter((m) => !m.ephemeral || now - new Date(m.createdAt).getTime() < 24 * 60 * 60 * 1000)
    .filter((m) => !showSearch || !searchQuery || m.content?.toLowerCase().includes(searchQuery.toLowerCase()));

  const pinnedMessages = allMessages.filter((m) => pinnedIds.includes(m.id));

  const displayUsername = useCallback((userId: string): string => {
    for (const msgs of Object.values(messages)) {
      const found = msgs.find((m) => m.userId === userId);
      if (found?.username && found.username !== userId && !found.username.startsWith("@")) return found.username;
    }
    return `@${userId.slice(0, 8)}`;
  }, [messages]);

  useEffect(() => {
    if (!currentUserId || !isOpen) return;
    const fetchProfile = async () => {
      const { data } = await supabase.from("profiles").select("tier").eq("user_id", currentUserId).maybeSingle();
      if (data?.tier) setUserTier(String(data.tier));
    };
    fetchProfile();
  }, [currentUserId, isOpen]);

  useEffect(() => {
    if (!currentUserId || !isOpen) return;
    const check = async () => {
      const { data } = await supabase.from("subscriptions").select("product")
        .eq("user_id", currentUserId).eq("product", "chat_gold").maybeSingle();
      if (data) setIsGoldSubscribed(true);
    };
    check();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId, isOpen]);

  const switchRoom = useCallback((roomId: string) => {
    setSelectedRoomId(roomId); setShowRooms(false); setTypingUsers([]);
    setReplyTo(null); setEditingId(null); setSearchQuery(""); setShowSearch(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const load = async () => {
      const { data, error } = await supabase
        .from("global_chat_messages")
        .select("*, profiles:sender_id(username, avatar_url)")
        .eq("room_id", selectedRoomId)
        .order("created_at", { ascending: true })
        .limit(60);
      if (cancelled || error) return;
      setMessages((prev) => ({ ...prev, [selectedRoomId]: (data ?? []).map((r) => rowToMessage(r as Record<string, unknown>)) }));
    };
    load();
    return () => { cancelled = true; };
  }, [isOpen, selectedRoomId]);

  useEffect(() => {
    if (!isOpen) return;
    if (realtimeRef.current) { supabase.removeChannel(realtimeRef.current); realtimeRef.current = null; }

    const channel = supabase
      .channel(`globalchat-${selectedRoomId}`, {
        config: { broadcast: { self: false }, presence: { key: currentUserId } },
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "global_chat_messages", filter: `room_id=eq.${selectedRoomId}` },
        (payload) => {
          const newMsg = rowToMessage(payload.new as Record<string, unknown>);
          setMessages((prev) => {
            const existing = prev[selectedRoomId] ?? [];
            const tempIdx = existing.findIndex(
              (m) => m.id.startsWith("temp-") &&
                     m.userId === newMsg.userId &&
                     (m.content ?? "") === (newMsg.content ?? "")
            );
            if (tempIdx !== -1) {
              const temp = existing[tempIdx];
              const merged: ChatMessage = {
                ...newMsg,
                username: newMsg.username.startsWith("@") ? temp.username : newMsg.username,
                avatarUrl: newMsg.avatarUrl ?? temp.avatarUrl,
              };
              const updated = [...existing];
              updated[tempIdx] = merged;
              return { ...prev, [selectedRoomId]: updated };
            }
            if (existing.some((m) => m.id === newMsg.id)) return prev;
            return { ...prev, [selectedRoomId]: [...existing, newMsg] };
          });
        })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "global_chat_messages", filter: `room_id=eq.${selectedRoomId}` },
        (payload) => {
          const updated = rowToMessage(payload.new as Record<string, unknown>);
          setMessages((prev) => ({
            ...prev,
            [selectedRoomId]: (prev[selectedRoomId] ?? []).map((m) => m.id === updated.id ? updated : m),
          }));
        })
      .on("broadcast", { event: "typing" }, (payload) => {
        const { user, username } = payload.payload as { user: string; username?: string };
        if (user === currentUserId) return;
        setTypingUsers((prev) => prev.some((u) => u.userId === user) ? prev : [...prev, { userId: user, username: username ?? user.slice(-6) }]);
        if (typingTimeouts.current[user]) clearTimeout(typingTimeouts.current[user]);
        typingTimeouts.current[user] = setTimeout(() => {
          setTypingUsers((prev) => prev.filter((u) => u.userId !== user));
          delete typingTimeouts.current[user];
        }, 2000);
      })
      .on("broadcast", { event: "reaction" }, (payload) => {
        const { messageId, emoji, userId, action } = payload.payload as { messageId: string; emoji: string; userId: string; action: "add" | "remove" };
        setReactions((prev) => {
          const msg = { ...(prev[messageId] ?? {}) };
          const users = [...(msg[emoji] ?? [])];
          if (action === "add")    { if (!users.includes(userId)) users.push(userId); }
          else { const i = users.indexOf(userId); if (i > -1) users.splice(i, 1); }
          msg[emoji] = users;
          return { ...prev, [messageId]: msg };
        });
      })
      .on("broadcast", { event: "seen" }, (payload) => {
        const { userId, messageIds } = payload.payload as { userId: string; messageIds: string[] };
        if (userId === currentUserId) return;
        setSeenMsgIds((prev) => new Set([...prev, ...messageIds]));
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<ConnectedUser>();
        const users = Object.values(state).flat() as ConnectedUser[];
        setConnected(users.filter((u) => u.userId !== currentUserId));
      })
      .subscribe();

    channel.track({ userId: currentUserId, username: displayUsername(currentUserId) });
    realtimeRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      realtimeRef.current = null;
      Object.values(typingTimeouts.current).forEach(clearTimeout);
      typingTimeouts.current = {};
      setTypingUsers([]); setConnected([]);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, selectedRoomId, currentUserId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [activeMessages.length, typingUsers.length]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      if (!realtimeRef.current) return;
      const myMsgIds = (messages[selectedRoomId] ?? []).filter((m) => m.userId === currentUserId).map((m) => m.id);
      if (!myMsgIds.length) return;
      realtimeRef.current.send({ type: "broadcast", event: "seen", payload: { userId: currentUserId, messageIds: myMsgIds } });
    }, 600);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, activeMessages.length, selectedRoomId]);

  const handleSwitchType = (type: RoomType) => {
    if (type === "gold" && !canUseGold) { setShowGoldModal(true); return; }
    setRoomType(type);
    const first = rooms.find((r) => r.type === type);
    if (first) switchRoom(first.id);
  };

  const handleGoldSubscribe = async () => {
    if (!currentUserId) return;
    setGoldLoading(true);
    try {
      const payRes = await MiniKit.commandsAsync.pay({
        reference: `chat_gold-${Date.now()}`.slice(0, 36),
        to: RECEIVER,
        tokens: [{ symbol: Tokens.WLD, token_amount: tokenToDecimals(9.99, Tokens.WLD).toString() }],
        description: "Suscripción Gold Chat",
      });
      if (payRes?.finalPayload?.status === "success") {
        const { error: dbErr } = await supabase.from("subscriptions").upsert({ user_id: currentUserId, product: "chat_gold" });
        if (dbErr) { console.error("[GlobalChat] Error guardando suscripción:", dbErr.message); return; }
        setIsGoldSubscribed(true); setShowGoldModal(false); setRoomType("gold");
        const first = rooms.find((r) => r.type === "gold");
        if (first) switchRoom(first.id);
      }
    } catch (e) { console.error("[GlobalChat] Error pago Gold:", e); }
    finally { setGoldLoading(false); }
  };

  const handleSend = async (content: string, file?: File, audioBlob?: Blob, ephemeral?: boolean, replyMsg?: ChatMessage) => {
    if (!content.trim() && !file && !audioBlob) return;
    const username = displayUsername(currentUserId);
    let fileUrl: string | undefined, fileName: string | undefined, fileType: string | undefined, audioUrl: string | undefined;

    if (audioBlob) {
      const path = `${currentUserId}/${Date.now()}-voice.webm`;
      const { error: upErr } = await supabase.storage.from("chat-files").upload(path, audioBlob, { cacheControl: "3600" });
      if (upErr) { console.error("[GlobalChat] Error subiendo audio:", upErr.message); return; }
      const { data: urlData } = supabase.storage.from("chat-files").getPublicUrl(path);
      audioUrl = urlData.publicUrl;
    }

    if (file) {
      const path = `${currentUserId}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("chat-files").upload(path, file, { cacheControl: "3600" });
      if (upErr) { console.error("[GlobalChat] Error subiendo archivo:", upErr.message); return; }
      const { data: urlData } = supabase.storage.from("chat-files").getPublicUrl(path);
      fileUrl = urlData.publicUrl; fileName = file.name; fileType = file.type;
    }

    const tempId = `temp-${Date.now()}`;
    const optimistic: ChatMessage = {
      id: tempId, roomId: selectedRoomId, userId: currentUserId, username,
      content: content.trim() || undefined, fileUrl, fileName, fileType, audioUrl,
      replyToId: replyMsg?.id, replyToContent: replyMsg?.content, replyToUsername: replyMsg?.username,
      ephemeral: ephemeral ?? false, createdAt: new Date().toISOString(),
    };
    setMessages((prev) => ({ ...prev, [selectedRoomId]: [...(prev[selectedRoomId] ?? []), optimistic] }));
    setReplyTo(null);

    const { error } = await supabase.from("global_chat_messages").insert({
      room_id: selectedRoomId, sender_id: currentUserId, username,
      content: content.trim() || null, file_url: fileUrl ?? null, file_name: fileName ?? null, file_type: fileType ?? null,
      audio_url: audioUrl ?? null,
      reply_to_id: replyMsg?.id ?? null, reply_to_content: replyMsg?.content ?? null, reply_to_username: replyMsg?.username ?? null,
      ephemeral: ephemeral ?? false, created_at: new Date().toISOString(),
    });
    if (error) {
      console.error("[GlobalChat] Error guardando mensaje:", error.message);
      setMessages((prev) => ({ ...prev, [selectedRoomId]: (prev[selectedRoomId] ?? []).filter((m) => m.id !== tempId) }));
    }
  };

  const handleTyping = useCallback((b: boolean) => {
    if (!b || !realtimeRef.current) return;
    realtimeRef.current.send({ type: "broadcast", event: "typing", payload: { user: currentUserId, username: displayUsername(currentUserId) } });
  }, [currentUserId, displayUsername]);

  const handleReact = useCallback((messageId: string, emoji: string) => {
    const current = reactions[messageId]?.[emoji] ?? [];
    const hasReacted = current.includes(currentUserId);
    const action: "add" | "remove" = hasReacted ? "remove" : "add";
    setReactions((prev) => {
      const msg = { ...(prev[messageId] ?? {}) };
      const users = [...(msg[emoji] ?? [])];
      if (action === "add")  { if (!users.includes(currentUserId)) users.push(currentUserId); }
      else { const i = users.indexOf(currentUserId); if (i > -1) users.splice(i, 1); }
      msg[emoji] = users;
      return { ...prev, [messageId]: msg };
    });
    realtimeRef.current?.send({ type: "broadcast", event: "reaction", payload: { messageId, emoji, userId: currentUserId, action } });
  }, [reactions, currentUserId]);

  const handlePin = useCallback((msgId: string) => {
    setPinnedIds((prev) => {
      if (prev.includes(msgId)) return prev.filter((id) => id !== msgId);
      if (prev.length >= 3) return [...prev.slice(1), msgId];
      return [...prev, msgId];
    });
  }, []);

  const handleStartEdit = (msgId: string) => {
    const msg = (messages[selectedRoomId] ?? []).find((m) => m.id === msgId);
    if (!msg) return;
    setEditingId(msgId); setEditText(msg.content ?? "");
  };

  const handleSaveEdit = async (msgId: string, newContent: string) => {
    if (!newContent.trim()) return;
    await supabase.from("global_chat_messages").update({ content: newContent.trim(), edited_at: new Date().toISOString() }).eq("id", msgId);
    setMessages((prev) => ({
      ...prev,
      [selectedRoomId]: (prev[selectedRoomId] ?? []).map((m) => m.id === msgId ? { ...m, content: newContent.trim(), editedAt: new Date().toISOString() } : m),
    }));
    setEditingId(null); setEditText("");
  };

  const handleDelete = async (msgId: string) => {
    await supabase.from("global_chat_messages").update({ deleted_for_all: true, content: null }).eq("id", msgId);
    setMessages((prev) => ({
      ...prev,
      [selectedRoomId]: (prev[selectedRoomId] ?? []).map((m) => m.id === msgId ? { ...m, deletedForAll: true, content: undefined } : m),
    }));
  };

  const handleCreateRoom = async (data: Omit<ChatRoom, "id">) => {
    const localId = `room-${Date.now()}`;
    const room: ChatRoom = { ...data, id: localId };
    const { data: inserted, error } = await supabase.from("chat_rooms")
      .insert({ name: data.name, type: data.type, is_private: data.isPrivate, description: data.description ?? null, created_by: currentUserId })
      .select("id").maybeSingle();
    if (!error && inserted?.id) room.id = String(inserted.id);
    setRooms((p) => [...p, room]); setMessages((p) => ({ ...p, [room.id]: [] }));
    setRoomType(room.type); switchRoom(room.id);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xl bg-black/70"
          onClick={(e) => e.target === e.currentTarget && onClose()}
          data-testid="overlay-chat-modal"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 24 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            className={cx(
              "relative flex h-[620px] w-full max-w-md flex-col rounded-3xl overflow-hidden shadow-2xl border",
              isGold
                ? "border-yellow-400/35 bg-gradient-to-b from-yellow-950/98 via-amber-950/95 to-orange-950/98 shadow-2xl shadow-yellow-900/50 shadow-[0_0_80px_rgba(234,179,8,0.14)]"
                : "border-fuchsia-500/30 bg-gradient-to-b from-slate-950/99 via-indigo-950/96 to-violet-950/98 shadow-2xl shadow-violet-900/50 shadow-[0_0_80px_rgba(217,70,239,0.14)]"
            )}
            data-testid="container-chat-room"
          >
            {/* ══ HEADER ══ */}
            <div className={cx("flex items-center gap-3 px-4 py-3 border-b flex-shrink-0 backdrop-blur-sm",
              isGold ? "border-yellow-500/15 bg-yellow-900/15" : "border-violet-500/15 bg-indigo-950/40")}>
              <div className={cx("flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl",
                isGold ? "bg-gradient-to-br from-yellow-400/20 to-amber-500/20 text-yellow-400"
                       : "bg-gradient-to-br from-indigo-500/20 to-violet-500/20 text-violet-400")}>
                {isGold ? <Crown className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <button onClick={() => setShowRooms(!showRooms)} data-testid="button-toggle-room-list"
                  className="flex items-center gap-1 cursor-pointer">
                  <span className="font-bold text-sm text-white truncate">
                    {isGold ? "Gold Chat" : "Global Chat"} — {selectedRoom?.name ?? "General"}
                  </span>
                  <ChevronDown className={cx("h-3.5 w-3.5 text-white/40 transition-transform", showRooms && "rotate-180")} />
                </button>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                  <span className="text-[11px] text-white/40">{connected.length + 1} conectados</span>
                  {selectedRoom?.isPrivate && <Lock className="h-3 w-3 text-white/30" />}
                </div>
              </div>
              <Avatar name={displayUsername(currentUserId)} gold={isGold} />
              <button onClick={() => setShowSearch(!showSearch)}
                className={cx("p-1.5 rounded-lg transition-colors cursor-pointer",
                  showSearch ? isGold ? "text-yellow-300 bg-yellow-500/15" : "text-violet-300 bg-violet-500/15" : "text-white/30 hover:text-white/60")}>
                <Search className="h-4 w-4" />
              </button>
              <div className="flex rounded-xl border border-white/15 overflow-hidden shadow-sm">
                <button onClick={() => handleSwitchType("classic")} data-testid="button-switch-classic"
                  className={cx("flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold transition-all cursor-pointer",
                    roomType === "classic" ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-inner" : "text-white/45 hover:text-white/70 hover:bg-white/6")}>
                  <MessageSquare className="h-3 w-3" /> Classic
                </button>
                <div className="w-px bg-white/10 self-stretch" />
                <button onClick={() => handleSwitchType("gold")} data-testid="button-switch-gold"
                  className={cx("flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold transition-all cursor-pointer",
                    roomType === "gold" ? "bg-gradient-to-r from-yellow-500 to-amber-500 text-white shadow-inner"
                      : canUseGold ? "text-yellow-400/80 hover:text-yellow-300 hover:bg-yellow-500/8"
                      : "text-yellow-500/50 hover:text-yellow-400/70 hover:bg-yellow-500/6")}>
                  <Crown className="h-3 w-3" /> Gold
                  {!canUseGold && <span className="text-[8px] opacity-60">✦</span>}
                </button>
              </div>
              {isGold && !canUseGold && (
                <button onClick={handleGoldSubscribe} disabled={goldLoading} data-testid="button-upgrade-gold-header"
                  className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-xl text-[9px] font-bold bg-gradient-to-r from-yellow-400 to-amber-500 text-white shadow-md shadow-yellow-500/30 cursor-pointer disabled:opacity-50 whitespace-nowrap">
                  <Sparkles className="h-3 w-3" />
                  {goldLoading ? "…" : "Upgrade 9.99 WLD"}
                </button>
              )}
              <button onClick={onClose} data-testid="button-close-chat"
                className="flex-shrink-0 text-white/30 hover:text-white/60 cursor-pointer p-1 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* ══ SEARCH BAR ══ */}
            <AnimatePresence>
              {showSearch && (
                <SearchBar value={searchQuery} onChange={setSearchQuery} onClose={() => { setShowSearch(false); setSearchQuery(""); }} isGold={isGold} />
              )}
            </AnimatePresence>

            {/* ══ DROPDOWN SALAS ══ */}
            <AnimatePresence>
              {showRooms && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  className={cx("border-b overflow-hidden flex-shrink-0",
                    isGold ? "border-yellow-500/15 bg-yellow-900/20" : "border-violet-500/15 bg-indigo-950/50")}>
                  <div className="px-3 py-2 space-y-0.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/25 px-1 mb-1">
                      {isGold ? "Salas Gold" : "Salas Classic"}
                    </p>
                    {filteredRooms.map((room) => (
                      <button key={room.id} onClick={() => switchRoom(room.id)} data-testid={`button-room-${room.id}`}
                        className={cx("flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm cursor-pointer transition-all",
                          room.id === selectedRoomId
                            ? isGold ? "bg-yellow-500/20 text-yellow-200" : "bg-violet-500/20 text-violet-200"
                            : "text-white/50 hover:text-white/70 hover:bg-white/5")}>
                        <Hash className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="flex-1 truncate">{room.name}</span>
                        {room.isPrivate && <Lock className="h-3 w-3 text-white/30" />}
                      </button>
                    ))}
                    <button onClick={() => { setShowCreateRoom(true); setShowRooms(false); }} data-testid="button-open-create-room"
                      className={cx("flex w-full items-center gap-2 rounded-xl border border-dashed px-2.5 py-2 text-xs cursor-pointer transition-colors mt-1",
                        isGold ? "border-yellow-500/25 text-yellow-400/60 hover:bg-yellow-500/5" : "border-violet-500/25 text-violet-400/60 hover:bg-violet-500/5")}>
                      <Plus className="h-3.5 w-3.5" /> Crear nueva sala
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ══ PINNED BAR ══ */}
            <AnimatePresence>
              {pinnedMessages.length > 0 && <PinnedBar messages={pinnedMessages} isGold={isGold} onUnpin={handlePin} />}
            </AnimatePresence>

            {/* ══ USUARIOS CONECTADOS ══ */}
            <div className="flex items-center gap-2 overflow-x-auto px-4 py-1.5 flex-shrink-0" style={{ scrollbarWidth: "none" }}>
              <Users className="h-3 w-3 flex-shrink-0 text-white/20" />
              <div className="flex -space-x-1.5">
                {connected.slice(0, 8).map((u) => (
                  <Avatar key={u.userId} src={u.avatarUrl} name={u.username} size="xs" />
                ))}
                {connected.length > 8 && (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 ring-1 ring-black/30 text-[8px] text-white/50">
                    +{connected.length - 8}
                  </div>
                )}
              </div>
              <RoleBadge role={userTier === "premium+" ? "gold" : "free"} />
              {showSearch && searchQuery && (
                <span className="ml-auto text-[10px] text-white/30">{activeMessages.length} resultado{activeMessages.length !== 1 ? "s" : ""}</span>
              )}
            </div>

            {/* ══ MENSAJES ══ */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" data-testid="container-messages"
              style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.06) transparent" }}>
              {activeMessages.length === 0 && (
                <div className="flex h-full flex-col items-center justify-center gap-4 text-center min-h-[200px]">
                  <motion.div animate={{ scale: [1, 1.05, 1], opacity: [0.7, 1, 0.7] }} transition={{ duration: 3, repeat: Infinity }}
                    className={cx("flex h-16 w-16 items-center justify-center rounded-2xl shadow-2xl",
                      isGold ? "bg-gradient-to-br from-yellow-400/20 to-amber-500/20 text-yellow-400"
                             : "bg-gradient-to-br from-indigo-500/20 to-violet-500/20 text-violet-400")}>
                    {isGold ? <Crown className="h-8 w-8" /> : <MessageSquare className="h-8 w-8" />}
                  </motion.div>
                  <div>
                    <p className="text-sm font-semibold text-white/60">
                      {showSearch && searchQuery ? "Sin resultados" : "No hay mensajes aún"}
                    </p>
                    <p className="text-xs text-white/30 mt-1">
                      {showSearch && searchQuery ? "Prueba con otra búsqueda" : "Sé el primero en escribir algo"}
                    </p>
                  </div>
                </div>
              )}
              {activeMessages.map((msg) => (
                <MessageBubble
                  key={msg.id} message={msg} isOwn={msg.userId === currentUserId} isGold={isGold}
                  currentUserId={currentUserId} reactions={reactions[msg.id] ?? {}} seenByOthers={seenMsgIds.has(msg.id)}
                  editingId={editingId} editText={editText} setEditText={setEditText}
                  onShare={setShareMsg} onReply={setReplyTo} onReact={handleReact}
                  onEdit={handleStartEdit} onDelete={handleDelete} onPin={handlePin}
                  onSaveEdit={handleSaveEdit} onCancelEdit={() => { setEditingId(null); setEditText(""); }}
                />
              ))}
              <AnimatePresence>
                {typingUsers.length > 0 && <TypingIndicator users={typingUsers} />}
              </AnimatePresence>
              <div ref={bottomRef} />
            </div>

            {/* ══ INPUT ══ */}
            <ChatInput
              onSend={handleSend} onTyping={handleTyping} isGold={isGold}
              disabled={isGold && !canUseGold} replyTo={replyTo} onCancelReply={() => setReplyTo(null)}
            />

            {/* ══ MODALES ══ */}
            <AnimatePresence>
              {showGoldModal  && <GoldSubscribeModal onClose={() => setShowGoldModal(false)} onSubscribe={handleGoldSubscribe} loading={goldLoading} />}
              {showCreateRoom && <CreateRoomModal onClose={() => setShowCreateRoom(false)} onCreate={handleCreateRoom} canCreateGold={canUseGold} />}
              {shareMsg       && <ShareModal message={shareMsg} onClose={() => setShareMsg(null)} />}
            </AnimatePresence>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
export default function GlobalChatRoom;
