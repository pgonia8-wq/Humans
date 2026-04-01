/**
 * GlobalChatRoom.tsx – Chat Premium 2026 · Self-contained
 *
 * CORRECCIONES APLICADAS (sobre la versión adjunta):
 * [C1] Mensajes de Classic se veían en Gold: se limpia el estado de mensajes al
 *      cambiar de tipo de sala, y se separa correctamente el selectedRoomId por tipo.
 * [C2] Permanencia de mensajes: fetchMessages persiste en Supabase (ya estaba),
 *      pero se asegura que fetchMessages se llame correctamente al montar y al
 *      cambiar de sala — corregido el orden de dependencias en useEffect.
 * [C3] Sala general: se garantiza que exista al menos una sala "General" de tipo
 *      "classic" al iniciar fetchRooms. Si no existe, se crea automáticamente.
 * [C4] Límites de salas por tier:
 *      - Usuarios Classic (hasClassicAccess && !hasGoldAccess) → máximo 2 salas
 *      - Usuarios Gold (hasGoldAccess) → máximo 5 salas
 *      Corregido handleCreateRoom para aplicar límites correctamente por tipo.
 * [F1] MiniKit.isInstalled() verificado antes de CADA llamada a commandsAsync.pay()
 * [F2] reference de pago generado con crypto.randomUUID() (formato UUID v4)
 * [F3] Feedback de error mostrado al usuario en los pagos
 * [F4] handleGoldSubscribe: si el backend falla, se muestra toast y NO se da acceso
 * [F5] handlePayForExtraRoom: mismo patrón de error con toast visible
 * [F6] supabase importado desde supabaseClient (env vars), NO hardcoded
 * [F8] Verificación de pago: fetch con try/catch y timeout
 * [F9] Realtime: cleanup correcto al desmontar (no memory leaks)
 * [F10] fetchMessages: errores de Supabase logueados y propagados
 * [F11] insertRoom: error de Supabase mostrado al usuario
 * [F12] handleSend: eliminación de mensaje optimista si el insert definitivo falla
 * [F13] handleDelete/handleSaveEdit: errores de Supabase con feedback al usuario
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

// Nombre de la sala general que debe existir siempre
const DEFAULT_ROOM_NAME = "General";

/** [F2] Genera un reference UUID v4 válido para Worldcoin Pay */
function generatePayReference(_prefix: string): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  const now = Date.now().toString(16).padStart(12, "0");
  const rand = Math.random().toString(16).slice(2, 14).padStart(12, "0");
  const safe = `${_prefix}-`.slice(0, 8).replace(/[^a-z0-9]/gi, "x").padEnd(8, "0");
  return `${safe.slice(0,8)}-${now.slice(0,4)}-4${now.slice(4,7)}-8${rand.slice(0,3)}-${rand.slice(3,15).padEnd(12,"0")}`.slice(0,36);
}

/** [F8] fetch con timeout para evitar cuelgue en entornos embebidos */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = 10000
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

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
    deletedForAll:   row.deleted_for_all   ? Boolean(row.deleted_for_all)  : undefined,
    ephemeral:       row.ephemeral         ? Boolean(row.ephemeral)        : undefined,
    createdAt:       String(row.created_at ?? new Date().toISOString()),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// AVATAR
// ─────────────────────────────────────────────────────────────────────────────
function Avatar({ src, name, size = "md", ring = false, gold = false }: {
  src?: string; name: string; size?: "xs" | "sm" | "md"; ring?: boolean; gold?: boolean;
}) {
  const sz = size === "xs" ? "h-6 w-6 text-[9px]" : size === "sm" ? "h-8 w-8 text-[11px]" : "h-10 w-10 text-sm";
  const rg = ring ? gold
    ? "ring-2 ring-yellow-400"
    : "ring-2 ring-violet-400"
    : "";
  if (src) return <img src={src} alt={name} className={cx(sz, "rounded-full object-cover", rg)} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />;
  return (
    <div className={cx(sz, "rounded-full flex items-center justify-center flex-shrink-0", rg,
      gold ? "bg-gradient-to-br from-yellow-800/80 to-amber-900/80 text-yellow-300 font-bold"
           : "bg-gradient-to-br from-violet-800/80 to-fuchsia-900/80 text-violet-200 font-semibold")}>
      {initials(name) || "?"}
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
  const base = "inline-flex items-center justify-center gap-1.5 rounded-xl text-sm font-semibold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500";
  const v: Record<string, string> = {
    primary: "bg-gradient-to-r from-violet-600 via-fuchsia-600 to-fuchsia-700 text-white px-4 py-2 shadow-lg shadow-fuchsia-600/30 active:brightness-90",
    ghost:   "text-white/60 hover:text-white hover:bg-white/10 px-3 py-1.5",
    outline: "border border-violet-500/40 text-violet-300 hover:border-violet-400/60 hover:text-violet-200 px-3 py-1.5",
    gold:    "bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-400 text-white px-4 py-2 shadow-lg shadow-yellow-500/30 active:brightness-90",
    danger:  "text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-1.5",
  };
  return (
    <button className={cx(base, v[variant], className)} onClick={onClick} disabled={disabled} data-testid={testId}>
      {children}
    </button>
  );
}

// ROLE BADGE
function RoleBadge({ role }: { role: UserRole }) {
  if (role === "admin") return <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-400/20 text-violet-300 border border-violet-400/30 font-semibold">Admin ⚙</span>;
  if (role === "gold")  return <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 font-semibold">Gold ✦</span>;
  return null;
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
// MESSAGE BUBBLE
// ─────────────────────────────────────────────────────────────────────────────
interface MessageBubbleProps {
  message: ChatMessage; isOwn: boolean; isGold: boolean;
  currentUserId: string; reactions: Record<string, string[]>;
  seenByOthers: boolean; editingId: string | null; editText: string;
  setEditText: (t: string) => void; onShare: (m: ChatMessage) => void;
  onReply: (m: ChatMessage) => void; onReact: (id: string, emoji: string) => void;
  onEdit: (id: string) => void; onDelete: (id: string) => void;
  onPin: (id: string) => void; onSaveEdit: (id: string) => void;
  onCancelEdit: () => void;
}
function MessageBubble({
  message, isOwn, isGold, reactions, seenByOthers,
  editingId, editText, setEditText,
  onShare, onReply, onReact, onEdit, onDelete, onPin, onSaveEdit, onCancelEdit,
}: MessageBubbleProps) {
  const [showActions, setShowActions] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const isEditing = editingId === message.id;
  const isDeleted = message.deletedForAll;
  const isTemp    = message.id.startsWith("temp-");
  const isEphemeral = message.ephemeral;

  const accentBg  = isGold ? "bg-gradient-to-br from-yellow-900/60 to-amber-900/40 border border-yellow-700/30"
                           : "bg-gradient-to-br from-violet-900/60 to-fuchsia-900/40 border border-fuchsia-700/30";
  const otherBg   = "bg-white/8 border border-white/10";

  const hasReactions = Object.values(reactions).some((v) => v.length > 0);
  const myReactions  = Object.entries(reactions)
    .filter(([, users]) => users.includes(message.userId))
    .map(([emoji]) => emoji);

  if (isDeleted) {
    return (
      <div className={cx("flex gap-2 mb-3", isOwn ? "flex-row-reverse" : "flex-row")}>
        <div className="h-8 w-8 flex-shrink-0" />
        <div className="px-4 py-2 rounded-2xl bg-white/5 border border-white/10 text-white/30 text-xs italic">
          Mensaje eliminado
        </div>
      </div>
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: isTemp ? 0.7 : 1, y: 0, scale: 1 }}
      transition={{ type: "spring", damping: 22, stiffness: 280 }}
      className={cx("flex gap-2 mb-3 group", isOwn ? "flex-row-reverse" : "flex-row")}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowEmojis(false); }}
    >
      <Avatar src={message.avatarUrl} name={message.username} size="sm" ring gold={isGold} />

      <div className={cx("flex flex-col gap-1 max-w-[75%]", isOwn ? "items-end" : "items-start")}>
        {!isOwn && (
          <div className="flex items-center gap-1.5 px-1">
            <span className="text-[11px] font-semibold text-white/70">{message.username}</span>
            <RoleBadge role={isGold ? "gold" : "free"} />
          </div>
        )}

        {/* Reply preview */}
        {message.replyToId && (
          <div className={cx("px-2.5 py-1.5 rounded-xl border-l-2 text-[11px] max-w-full truncate mb-0.5",
            isGold ? "border-yellow-400 bg-yellow-900/20 text-yellow-200/60" : "border-violet-400 bg-violet-900/20 text-violet-200/60")}>
            <span className="font-semibold">{message.replyToUsername}: </span>
            {message.replyToContent ?? "📎 archivo"}
          </div>
        )}

        {/* Editing */}
        {isEditing ? (
          <div className="flex gap-2 items-end">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="rounded-xl bg-violet-900/60 border border-violet-500/40 text-white text-sm px-3 py-2 resize-none w-48 outline-none focus:border-violet-400"
              rows={2}
              autoFocus
            />
            <div className="flex flex-col gap-1">
              <Btn variant="primary" onClick={() => onSaveEdit(message.id)} className="px-2 py-1 text-xs">Guardar</Btn>
              <Btn variant="ghost"   onClick={onCancelEdit} className="px-2 py-1 text-xs">Cancelar</Btn>
            </div>
          </div>
        ) : (
          <div className={cx("px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed", isOwn ? accentBg : otherBg)}>
            {/* Audio */}
            {message.audioUrl && (
              <audio controls src={message.audioUrl} className="max-w-[200px] h-8 mb-1" />
            )}
            {/* File */}
            {message.fileUrl && message.fileType?.startsWith("image/") && (
              <img src={message.fileUrl} alt={message.fileName ?? "img"} className="max-w-[220px] rounded-xl mb-1" />
            )}
            {message.fileUrl && !message.fileType?.startsWith("image/") && (
              <a href={message.fileUrl} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 text-xs text-violet-300 underline mb-1">
                <FileText className="h-3.5 w-3.5" />{message.fileName ?? "archivo"}
              </a>
            )}
            {/* Text */}
            {message.content && (
              <span className={cx("text-white", isEphemeral && "italic opacity-70")}>
                {message.content}
              </span>
            )}
            {message.editedAt && <span className="text-[9px] text-white/30 ml-1">(editado)</span>}
          </div>
        )}

        {/* Reactions */}
        {hasReactions && !isEditing && (
          <div className="flex flex-wrap gap-1 px-1">
            {Object.entries(reactions).filter(([, u]) => u.length > 0).map(([emoji, users]) => (
              <button key={emoji}
                onClick={() => onReact(message.id, emoji)}
                className={cx("flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] border transition-all cursor-pointer",
                  myReactions.includes(emoji)
                    ? isGold ? "bg-yellow-400/20 border-yellow-400/40 text-yellow-200" : "bg-violet-400/20 border-violet-400/40 text-violet-200"
                    : "bg-white/5 border-white/15 text-white/50 hover:bg-white/10")}>
                {emoji} <span>{users.length}</span>
              </button>
            ))}
          </div>
        )}

        {/* Meta row */}
        {!isEditing && (
          <div className={cx("flex items-center gap-2 px-1", isOwn ? "flex-row-reverse" : "flex-row")}>
            <span className="text-[10px] text-white/25">{timeStr(message.createdAt)}</span>
            {isOwn && seenByOthers && <CheckCheck className="h-3 w-3 text-violet-400" />}
            {isOwn && !seenByOthers && isTemp && <span className="h-3 w-3 text-white/20 text-[9px]">✓</span>}
            {isOwn && !seenByOthers && !isTemp && <Check className="h-3 w-3 text-white/20" />}
            {isEphemeral && <Sparkles className="h-3 w-3 text-purple-400" />}
          </div>
        )}

        {/* Action toolbar */}
        <AnimatePresence>
          {showActions && !isEditing && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -4 }}
              transition={{ duration: 0.12 }}
              className={cx("flex items-center gap-0.5 px-1.5 py-1 rounded-2xl bg-gray-900/90 border border-white/10 shadow-xl backdrop-blur-sm z-10",
                isOwn ? "self-end" : "self-start")}>
              {/* Quick emoji reactions */}
              {showEmojis ? (
                <div className="flex gap-0.5">
                  {EMOJI_LIST.map((e) => (
                    <button key={e} onClick={() => { onReact(message.id, e); setShowEmojis(false); }}
                      className="text-base hover:scale-125 transition-transform cursor-pointer px-0.5">{e}</button>
                  ))}
                  <button onClick={() => setShowEmojis(false)}
                    className="text-white/40 hover:text-white/70 cursor-pointer px-1"><X className="h-3 w-3" /></button>
                </div>
              ) : (
                <>
                  <button onClick={() => setShowEmojis(true)} className="text-white/40 hover:text-white/80 cursor-pointer p-1 rounded-lg hover:bg-white/10 transition-colors" title="Reaccionar">
                    <Star className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => onReply(message)} className="text-white/40 hover:text-white/80 cursor-pointer p-1 rounded-lg hover:bg-white/10 transition-colors" title="Responder">
                    <CornerUpLeft className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => onShare(message)} className="text-white/40 hover:text-white/80 cursor-pointer p-1 rounded-lg hover:bg-white/10 transition-colors" title="Compartir">
                    <Share2 className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => onPin(message.id)} className="text-white/40 hover:text-white/80 cursor-pointer p-1 rounded-lg hover:bg-white/10 transition-colors" title="Fijar">
                    <Pin className="h-3.5 w-3.5" />
                  </button>
                  {isOwn && canEditMsg(message.createdAt) && (
                    <button onClick={() => onEdit(message.id)} className="text-white/40 hover:text-white/80 cursor-pointer p-1 rounded-lg hover:bg-white/10 transition-colors" title="Editar">
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {isOwn && (
                    <button onClick={() => onDelete(message.id)} className="text-red-400/60 hover:text-red-400 cursor-pointer p-1 rounded-lg hover:bg-red-400/10 transition-colors" title="Eliminar">
                      <Trash2 className="h-3.5 w-3.5" />
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

// ─────────────────────────────────────────────────────────────────────────────
// SHARE MODAL
// ─────────────────────────────────────────────────────────────────────────────
function ShareModal({ message, onClose }: { message: ChatMessage; onClose: () => void }) {
  const text = encodeURIComponent(message.content ?? "");
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex items-end justify-center pb-8 rounded-2xl bg-black/60 backdrop-blur-sm"
      onClick={onClose}>
      <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        className="bg-gray-900/95 border border-white/10 rounded-3xl p-5 w-[90%] max-w-xs shadow-2xl"
        onClick={(e) => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-white mb-4">Compartir mensaje</h3>
        <div className="flex gap-3 justify-center">
          <a href={`https://twitter.com/intent/tweet?text=${text}`} target="_blank" rel="noreferrer"
            className="flex flex-col items-center gap-1 text-[11px] text-sky-400">
            <Twitter className="h-6 w-6" />Twitter
          </a>
          <a href={`https://wa.me/?text=${text}`} target="_blank" rel="noreferrer"
            className="flex flex-col items-center gap-1 text-[11px] text-green-400">
            <span className="h-6 w-6 flex items-center justify-center text-xl">💬</span>WhatsApp
          </a>
          <button onClick={() => { navigator.clipboard?.writeText(message.content ?? ""); onClose(); }}
            className="flex flex-col items-center gap-1 text-[11px] text-white/50 cursor-pointer">
            <span className="h-6 w-6 flex items-center justify-center text-xl">📋</span>Copiar
          </button>
        </div>
        <button onClick={onClose} className="mt-4 w-full text-xs text-white/30 hover:text-white/60 cursor-pointer">Cerrar</button>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GOLD SUBSCRIBE MODAL
// ─────────────────────────────────────────────────────────────────────────────
function GoldSubscribeModal({ onClose, onSubscribe, loading }: {
  onClose: () => void; onSubscribe: () => void; loading: boolean;
}) {
  return (
    <Overlay>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        className="w-[90%] max-w-xs bg-gradient-to-br from-yellow-950 to-amber-950 border border-yellow-500/30 rounded-3xl p-6 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}>
        <CloseBtn onClick={onClose} testId="button-close-gold-modal" />
        <div className="flex flex-col items-center gap-3 mb-5">
          <Crown className="h-10 w-10 text-yellow-400" />
          <h2 className="text-lg font-bold text-yellow-200">Chat Gold</h2>
          <p className="text-sm text-yellow-200/60 text-center">Accede a salas exclusivas Gold con funciones premium.</p>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black text-yellow-400">9.99</span>
            <span className="text-sm text-yellow-400/70">WLD / mes</span>
          </div>
        </div>
        <Btn variant="gold" onClick={onSubscribe} disabled={loading} className="w-full" testId="button-subscribe-gold">
          {loading ? "Procesando..." : "Suscribirse con WLD"}
        </Btn>
        <button onClick={onClose} data-testid="button-cancel-gold"
          className="mt-3 w-full text-xs text-yellow-200/30 hover:text-yellow-200/60 cursor-pointer">
          Cancelar
        </button>
      </motion.div>
    </Overlay>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EXTRA ROOM PAY MODAL
// ─────────────────────────────────────────────────────────────────────────────
function ExtraRoomPayModal({ onClose, onPay, loading, amount, isGoldPrice }: {
  onClose: () => void; onPay: () => void; loading: boolean; amount: number; isGoldPrice: boolean;
}) {
  return (
    <Overlay>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        className="w-[90%] max-w-xs bg-gray-900/95 border border-white/10 rounded-3xl p-6 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}>
        <CloseBtn onClick={onClose} />
        <h2 className="text-base font-bold text-white mb-2">Sala adicional</h2>
        <p className="text-sm text-white/50 mb-4">
          Has alcanzado el límite de salas gratuitas. Crea una sala extra por{" "}
          <span className={isGoldPrice ? "text-yellow-400 font-bold" : "text-violet-400 font-bold"}>
            {amount} WLD
          </span>.
        </p>
        <Btn variant="primary" onClick={onPay} disabled={loading} className="w-full" testId="button-pay-extra-room">
          {loading ? "Procesando..." : `Pagar ${amount} WLD`}
        </Btn>
        <button onClick={onClose} className="mt-3 w-full text-xs text-white/30 hover:text-white/60 cursor-pointer">Cancelar</button>
      </motion.div>
    </Overlay>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATE ROOM MODAL
// ─────────────────────────────────────────────────────────────────────────────
function CreateRoomModal({ onClose, onCreate, canCreateGold }: {
  onClose: () => void;
  onCreate: (data: Omit<ChatRoom, "id">) => void;
  canCreateGold: boolean;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<RoomType>("classic");
  const [isPrivate, setIsPrivate] = useState(false);
  const [description, setDescription] = useState("");

  return (
    <Overlay>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        className="w-[92%] max-w-sm bg-gray-900/95 border border-white/10 rounded-3xl p-5 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}>
        <CloseBtn onClick={onClose} />
        <h2 className="text-base font-bold text-white mb-4">Crear sala</h2>

        <div className="flex gap-2 mb-4">
          {(["classic", "gold"] as RoomType[]).map((t) => {
            const isG = t === "gold"; const active = type === t;
            return (
              <button key={t} onClick={() => { if (!isG || canCreateGold) setType(t); }}
                disabled={isG && !canCreateGold}
                className={cx("flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold border cursor-pointer transition-all",
                  active
                    ? isG ? "bg-yellow-400/20 border-yellow-400/40 text-yellow-300" : "bg-violet-400/20 border-violet-400/40 text-violet-300"
                    : "border-white/10 text-white/40 hover:border-white/20 hover:text-white/60",
                  isG && !canCreateGold && "opacity-30 cursor-not-allowed")}>
                {isG ? <Crown className="h-3.5 w-3.5" /> : <Hash className="h-3.5 w-3.5" />}
                {t === "classic" ? "Clásica" : "Gold"}
              </button>
            );
          })}
        </div>

        <ModalInput label="Nombre de sala" value={name} onChange={setName} placeholder="mi-sala-genial" maxLength={40} testId="input-room-name" />
        <div className="mt-3">
          <ModalInput label="Descripción (opcional)" value={description} onChange={setDescription} placeholder="Para hablar de…" maxLength={120} />
        </div>
        <button onClick={() => setIsPrivate(p => !p)}
          className="mt-3 flex items-center gap-2 text-sm text-white/50 hover:text-white/80 cursor-pointer transition-colors">
          {isPrivate ? <Lock className="h-4 w-4 text-violet-400" /> : <Globe className="h-4 w-4" />}
          {isPrivate ? "Sala privada" : "Sala pública"}
        </button>

        <Btn variant="primary" disabled={!name.trim()} className="flex-1 mt-4 w-full" testId="button-confirm-create-room"
          onClick={() => onCreate({ name: name.trim(), type, isPrivate, description: description.trim() || undefined })}>
          Crear sala
        </Btn>
      </motion.div>
    </Overlay>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CHAT INPUT
// ─────────────────────────────────────────────────────────────────────────────
interface ChatInputProps {
  onSend: (content: string, file?: File, audio?: Blob, ephemeral?: boolean, reply?: ChatMessage) => void;
  onTyping: (typing: boolean) => void;
  isGold: boolean;
  hasGoldAccess: boolean;
  disabled: boolean;
  replyTo: ChatMessage | null;
  onCancelReply: () => void;
}
function ChatInput({ onSend, onTyping, isGold, disabled, replyTo, onCancelReply }: ChatInputProps) {
  const [text, setText] = useState("");
  const [ephemeral, setEphemeral] = useState(false);
  const [recording, setRecording] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const fileRef    = useRef<HTMLInputElement>(null);
  const mediaRef   = useRef<MediaRecorder | null>(null);
  const chunksRef  = useRef<Blob[]>([]);

  const EMOJIS = ["😀","😂","😍","🎉","🔥","💯","🤔","😎","❤️","👍","🙌","✨","🥹","😅","🤯","🥳"];

  const doSend = () => {
    if (!text.trim()) return;
    onSend(text.trim(), undefined, undefined, ephemeral, replyTo ?? undefined);
    setText(""); setEphemeral(false); setShowEmojis(false);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onSend("", file, undefined, ephemeral, replyTo ?? undefined);
    e.target.value = "";
  };

  const toggleRecord = async () => {
    if (recording && mediaRef.current) {
      mediaRef.current.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        onSend("", undefined, blob, ephemeral, replyTo ?? undefined);
        stream.getTracks().forEach(t => t.stop());
      };
      recorder.start();
      mediaRef.current = recorder;
      setRecording(true);
    } catch {
      console.warn("[ChatInput] No se pudo acceder al micrófono.");
    }
  };

  return (
    <div className="flex flex-col gap-1.5 px-3 pb-3 flex-shrink-0">
      {/* Reply preview */}
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

      {/* Emoji tray */}
      <AnimatePresence>
        {showEmojis && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-1 px-2 py-1.5 rounded-xl bg-gray-900/90 border border-white/10">
            {EMOJIS.map((e) => (
              <button key={e} onClick={() => setText(t => t + e)}
                className="text-lg hover:scale-125 transition-transform cursor-pointer">{e}</button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-end gap-2">
        {/* Attachments */}
        <input ref={fileRef} type="file" className="hidden" onChange={handleFile} />
        <button onClick={() => fileRef.current?.click()} disabled={disabled}
          className="flex-shrink-0 h-9 w-9 rounded-xl flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed">
          <Paperclip className="h-4 w-4" />
        </button>

        {/* Emoji toggle */}
        <button onClick={() => setShowEmojis(e => !e)} disabled={disabled}
          className="flex-shrink-0 h-9 w-9 rounded-xl flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed text-lg">
          😊
        </button>

        {/* Ephemeral toggle */}
        <button onClick={() => setEphemeral(e => !e)} disabled={disabled} title="Mensaje efímero (24h)"
          className={cx("flex-shrink-0 h-9 w-9 rounded-xl flex items-center justify-center transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed",
            ephemeral ? "text-purple-400 bg-purple-400/15" : "text-white/25 hover:text-white/50 hover:bg-white/8")}>
          <Sparkles className="h-4 w-4" />
        </button>

        <textarea
          value={text}
          onChange={(e) => { setText(e.target.value); onTyping(!!e.target.value); }}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); doSend(); } }}
          placeholder={disabled ? "Sin acceso" : "Escribe un mensaje…"}
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-white/25 outline-none focus:border-violet-500/50 transition-colors disabled:opacity-40 max-h-24 overflow-y-auto"
        />

        {/* Voice */}
        <button onClick={toggleRecord} disabled={disabled}
          className={cx("flex-shrink-0 h-9 w-9 rounded-xl flex items-center justify-center transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed",
            recording ? "text-red-400 bg-red-400/20 animate-pulse" : "text-white/30 hover:text-white/60 hover:bg-white/10")}>
          {recording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </button>

        {/* Send */}
        <button
          onClick={doSend}
          disabled={disabled || !text.trim()}
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

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function GlobalChatRoom({ isOpen, onClose, currentUserId }: GlobalChatRoomProps) {
  const [roomType,         setRoomType]         = useState<RoomType>("classic");
  const [rooms,            setRooms]            = useState<ChatRoom[]>([]);
  const [selectedRoomId,   setSelectedRoomId]   = useState<string>("");
  // [C1] messages separado por roomId para evitar mezcla entre Classic y Gold
  const [messages,         setMessages]         = useState<Record<string, ChatMessage[]>>({});
  const [typingUsers,      setTypingUsers]       = useState<TypingUser[]>([]);
  const [connected,        setConnected]         = useState<ConnectedUser[]>([]);
  const [reactionsPerRoom, setReactionsPerRoom] = useState<Map<string, Record<string, Record<string, string[]>>>>(new Map());
  const [pinnedPerRoom,    setPinnedPerRoom]    = useState<Map<string, string[]>>(new Map());
  const [seenMsgIds,       setSeenMsgIds]       = useState<Set<string>>(new Set());
  const [hasClassicAccess, setHasClassicAccess] = useState(false);
  const [hasGoldAccess,    setHasGoldAccess]    = useState(false);
  const [myUsername,       setMyUsername]        = useState<string>("");
  const [showGoldModal,    setShowGoldModal]    = useState(false);
  const [goldLoading,      setGoldLoading]      = useState(false);
  const [showCreateRoom,   setShowCreateRoom]   = useState(false);
  const [shareMsg,         setShareMsg]         = useState<ChatMessage | null>(null);
  const [replyTo,          setReplyTo]          = useState<ChatMessage | null>(null);
  const [editingId,        setEditingId]        = useState<string | null>(null);
  const [editText,         setEditText]         = useState("");
  const [showSearch,       setShowSearch]       = useState(false);
  const [searchQuery,      setSearchQuery]      = useState("");
  const [showExtraRoomModal, setShowExtraRoomModal] = useState(false);
  const [pendingRoomData,    setPendingRoomData]    = useState<Omit<ChatRoom, "id"> | null>(null);
  const [extraRoomPayLoading,   setExtraRoomPayLoading]   = useState(false);
  const [errorToast,       setErrorToast]       = useState<string | null>(null);

  const bottomRef      = useRef<HTMLDivElement>(null);
  const typingTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const realtimeRef    = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const isGold     = roomType === "gold" && hasGoldAccess;
  const canUseGold = hasGoldAccess;

  const selectedRoom  = rooms.find((r) => r.id === selectedRoomId);
  // [C1] filtrar salas por tipo activo para no mezclar mensajes entre tipos
  const filteredRooms = rooms.filter((r) => r.type === roomType);

  const reactions  = selectedRoomId ? (reactionsPerRoom.get(selectedRoomId) ?? {}) : {};
  const pinnedIds  = selectedRoomId ? (pinnedPerRoom.get(selectedRoomId) ?? []) : [];

  const now = Date.now();
  const allMessages = messages[selectedRoomId] ?? [];
  const activeMessages = allMessages
    .filter((m) => !m.ephemeral || now - new Date(m.createdAt).getTime() < 24 * 60 * 60 * 1000)
    .filter((m) => !showSearch || !searchQuery || m.content?.toLowerCase().includes(searchQuery.toLowerCase()));

  const pinnedMessages = allMessages.filter((m) => pinnedIds.includes(m.id));

  // [C4] Límites correctos: Classic → 2 salas, Gold → 5 salas
  const freeRoomLimit  = hasGoldAccess ? 5 : 2;
  const extraRoomPrice = hasGoldAccess ? 12 : 18;

  const myRoomsOfType = rooms.filter((r) => r.createdBy === currentUserId && r.type === roomType).length;

  const noAccess = roomType === "gold" ? !hasGoldAccess : !hasClassicAccess;

  /** [F3] Mostrar error en pantalla y en consola */
  const showError = useCallback((msg: string) => {
    console.error("[GlobalChatRoom]", msg);
    setErrorToast(msg);
    setTimeout(() => setErrorToast(null), 5000);
  }, []);

  const displayUsername = useCallback((userId: string): string => {
    for (const msgs of Object.values(messages)) {
      const found = msgs.find((m) => m.userId === userId);
      if (found?.username && found.username !== userId && !found.username.startsWith("@")) return found.username;
    }
    if (myUsername && userId === currentUserId) return myUsername;
    return `@${userId.slice(0, 8)}`;
  }, [messages, myUsername, currentUserId]);

  // ── Check subscriptions ──
  useEffect(() => {
    if (!currentUserId || !isOpen) return;
    const checkSubscriptions = async () => {
      try {
        const { data, error } = await supabase.from("subscriptions").select("product")
          .eq("user_id", currentUserId).in("product", ["chat_classic", "chat_gold"]);
        if (error) { console.error("[GlobalChat] Error cargando suscripciones:", error.message); return; }
        if (!data) return;
        const products = data.map((r: { product: string }) => r.product);
        const classic = products.includes("chat_classic");
        const gold    = products.includes("chat_gold");
        setHasClassicAccess(classic || gold);
        setHasGoldAccess(gold);
      } catch (e) {
        console.error("[GlobalChat] Error inesperado checkSubscriptions:", e);
      }
    };
    checkSubscriptions();
  }, [currentUserId, isOpen]);

  // ── Fetch my profile ──
  useEffect(() => {
    if (!currentUserId || !isOpen) return;
    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase.from("profiles").select("tier, username").eq("id", currentUserId).maybeSingle();
        if (error) { console.error("[GlobalChat] Error cargando perfil:", error.message); return; }
        if (data?.username) setMyUsername(String(data.username));
      } catch (e) {
        console.error("[GlobalChat] Error inesperado fetchProfile:", e);
      }
    };
    fetchProfile();
  }, [currentUserId, isOpen]);

  // ── [C3] Asegurar sala General existe ──
  const ensureDefaultRoom = useCallback(async (parsedRooms: ChatRoom[]) => {
    const hasGeneral = parsedRooms.some(r => r.name === DEFAULT_ROOM_NAME && r.type === "classic");
    if (!hasGeneral) {
      try {
        const { data: inserted, error } = await supabase.from("chat_rooms")
          .insert({
            name: DEFAULT_ROOM_NAME,
            type: "classic",
            is_private: false,
            description: "Sala general de bienvenida",
            created_by: currentUserId,
          })
          .select("id, name, type, is_private, description, created_by")
          .maybeSingle();
        if (error) {
          console.error("[GlobalChat] Error creando sala General:", error.message);
          return parsedRooms;
        }
        if (inserted) {
          const generalRoom: ChatRoom = {
            id: String(inserted.id),
            name: String(inserted.name),
            type: "classic",
            isPrivate: false,
            description: inserted.description ? String(inserted.description) : undefined,
            createdBy: inserted.created_by ? String(inserted.created_by) : undefined,
          };
          return [generalRoom, ...parsedRooms];
        }
      } catch (e) {
        console.error("[GlobalChat] Error inesperado ensureDefaultRoom:", e);
      }
    }
    return parsedRooms;
  }, [currentUserId]);

  // ── Fetch rooms ──
  const fetchRooms = useCallback(async () => {
    try {
      const { data, error } = await supabase.from("chat_rooms")
        .select("id, name, type, is_private, description, created_by")
        .order("created_at", { ascending: true });
      if (error) { console.error("[GlobalChat] Error cargando rooms:", error.message); return; }
      let parsed: ChatRoom[] = (data ?? []).map((r: Record<string, unknown>) => ({
        id:          String(r.id),
        name:        String(r.name),
        type:        String(r.type) as RoomType,
        isPrivate:   Boolean(r.is_private),
        description: r.description ? String(r.description) : undefined,
        createdBy:   r.created_by  ? String(r.created_by)  : undefined,
      }));

      // [C3] Garantizar que exista sala General
      parsed = await ensureDefaultRoom(parsed);

      setRooms(parsed);

      // [C1] Seleccionar sala del tipo activo, no cualquier sala
      if (parsed.length > 0 && !selectedRoomId) {
        const defaultRoom = parsed.find(r => r.type === roomType) ?? parsed[0];
        setSelectedRoomId(defaultRoom.id);
      }
    } catch (e) {
      console.error("[GlobalChat] Error inesperado fetchRooms:", e);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoomId, roomType, ensureDefaultRoom]);

  useEffect(() => {
    if (!isOpen || !currentUserId) return;
    fetchRooms();
  }, [isOpen, currentUserId, fetchRooms]);

  // ── [C2] Fetch messages — se llama correctamente al cambiar sala ──
  const fetchMessages = useCallback(async (roomId: string) => {
    if (!roomId) return;
    try {
      const { data, error } = await supabase
        .from("global_chat_messages")
        .select("*, profiles:sender_id(username, avatar_url)")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true })
        .limit(80);
      if (error) {
        console.error("[GlobalChat] Error cargando mensajes:", error.message);
        return;
      }
      const parsed = (data ?? []).map((r) => rowToMessage(r as Record<string, unknown>));
      // [C1] Los mensajes se guardan bajo la clave del roomId específico
      setMessages((prev) => ({ ...prev, [roomId]: parsed }));
    } catch (e) {
      console.error("[GlobalChat] Error inesperado fetchMessages:", e);
    }
  }, []);

  // [C2] useEffect separado para fetchMessages, reactivo al selectedRoomId
  useEffect(() => {
    if (!selectedRoomId) return;
    fetchMessages(selectedRoomId);
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedRoomId, fetchMessages]);

  const switchRoom = useCallback((id: string) => {
    setSelectedRoomId(id);
    setSearchQuery(""); setShowSearch(false); setReplyTo(null); setEditingId(null);
  }, []);

  // ── Realtime ──
  useEffect(() => {
    if (!isOpen || !selectedRoomId) return;
    // [F9] Cleanup anterior antes de crear nuevo canal
    if (realtimeRef.current) { supabase.removeChannel(realtimeRef.current); realtimeRef.current = null; }

    const channel = supabase
      .channel(`globalchat-${selectedRoomId}`, {
        config: { broadcast: { self: false }, presence: { key: currentUserId } },
      })
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "global_chat_messages",
        // [C1] filtrar por room_id para que mensajes de otras salas no aparezcan
        filter: `room_id=eq.${selectedRoomId}`
      },
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
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "global_chat_messages",
        filter: `room_id=eq.${selectedRoomId}`
      },
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
        setReactionsPerRoom((prev) => {
          const roomReactions = { ...(prev.get(selectedRoomId) ?? {}) };
          const msg = { ...(roomReactions[messageId] ?? {}) };
          const users = [...(msg[emoji] ?? [])];
          if (action === "add")    { if (!users.includes(userId)) users.push(userId); }
          else { const i = users.indexOf(userId); if (i > -1) users.splice(i, 1); }
          msg[emoji] = users;
          roomReactions[messageId] = msg;
          const updated = new Map(prev);
          updated.set(selectedRoomId, roomReactions);
          return updated;
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
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.error("[GlobalChat] Error en canal realtime para room:", selectedRoomId);
        }
      });

    channel.track({ userId: currentUserId, username: displayUsername(currentUserId) });
    realtimeRef.current = channel;

    return () => {
      // [F9] Limpieza correcta al desmontar
      supabase.removeChannel(channel);
      realtimeRef.current = null;
      Object.values(typingTimeouts.current).forEach(clearTimeout);
      typingTimeouts.current = {};
      setTypingUsers([]); setConnected([]);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, selectedRoomId, currentUserId]);

  // ── Seen broadcast ──
  useEffect(() => {
    if (!isOpen || !selectedRoomId) return;
    const timer = setTimeout(() => {
      if (!realtimeRef.current) return;
      const myMsgIds = (messages[selectedRoomId] ?? []).filter((m) => m.userId === currentUserId).map((m) => m.id);
      if (!myMsgIds.length) return;
      realtimeRef.current.send({ type: "broadcast", event: "seen", payload: { userId: currentUserId, messageIds: myMsgIds } });
    }, 600);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, activeMessages.length, selectedRoomId]);

  // ── Auto scroll ──
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [activeMessages.length, typingUsers.length]);

  // ── Refetch latest ──
  const refetchLatestMessages = useCallback(async (roomId: string) => {
    try {
      const { data, error } = await supabase
        .from("global_chat_messages")
        .select("*, profiles:sender_id(username, avatar_url)")
        .eq("room_id", roomId)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) { console.error("[GlobalChat] Error refetch:", error.message); return; }
      if (!data) return;
      const fresh = data.reverse().map((r) => rowToMessage(r as Record<string, unknown>));
      setMessages((prev) => {
        const existing = prev[roomId] ?? [];
        const freshIds = new Set(fresh.map((m) => m.id));
        const merged = [
          ...existing.filter((m) => !m.id.startsWith("temp-") && !freshIds.has(m.id)),
          ...fresh,
        ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        return { ...prev, [roomId]: merged };
      });
    } catch (e) {
      console.error("[GlobalChat] Error inesperado refetch:", e);
    }
  }, []);

  // [C1] Al cambiar de tipo de sala, seleccionar la primera sala del tipo correcto
  const handleSwitchType = (type: RoomType) => {
    if (type === "gold" && !canUseGold) { setShowGoldModal(true); return; }
    if (type === "classic" && !hasClassicAccess) { return; }
    setRoomType(type);
    // [C1] Seleccionar la primera sala del nuevo tipo, NO cualquier sala
    const firstRoomOfType = rooms.find(r => r.type === type);
    setSelectedRoomId(firstRoomOfType?.id || "");
    setSearchQuery(""); setShowSearch(false); setReplyTo(null); setEditingId(null);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // [F1][F2][F4] GOLD SUBSCRIBE
  // ─────────────────────────────────────────────────────────────────────────
  const handleGoldSubscribe = async () => {
    if (!currentUserId) return;

    if (!MiniKit.isInstalled()) {
      showError("World App no detectada. Abre esta app desde World App.");
      return;
    }

    setGoldLoading(true);
    try {
      const payRes = await MiniKit.commandsAsync.pay({
        reference: generatePayReference("gold"),
        to: RECEIVER,
        tokens: [{ symbol: Tokens.WLD, token_amount: tokenToDecimals(9.99, Tokens.WLD).toString() }],
        description: "Suscripción Gold Chat",
      });

      if (payRes?.finalPayload?.status !== "success") {
        console.warn("[GlobalChat] Pago Gold cancelado por usuario:", payRes?.finalPayload?.status);
        return;
      }

      const transactionId = payRes.finalPayload.transaction_id;

      let verifyRes: Response;
      try {
        verifyRes = await fetchWithTimeout("/api/verifyPayment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transactionId, userId: currentUserId, action: "chat_gold" }),
        }, 12000);
      } catch (fetchErr: unknown) {
        const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
        showError(`Error de red al verificar pago Gold: ${msg}`);
        return;
      }

      if (!verifyRes.ok) {
        const errData = await verifyRes.json().catch(() => ({}));
        const errMsg = (errData as { error?: string }).error ?? `HTTP ${verifyRes.status}`;
        showError(`El servidor rechazó la suscripción Gold: ${errMsg}`);
        return;
      }

      // [F4] Solo dar acceso DESPUÉS de confirmación del backend
      setHasGoldAccess(true);
      setHasClassicAccess(true);
      setShowGoldModal(false);
      setRoomType("gold");
      setSelectedRoomId("");

    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      showError(`Error al procesar pago Gold: ${msg}`);
    } finally {
      setGoldLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // [F1][F2][F5] EXTRA ROOM
  // ─────────────────────────────────────────────────────────────────────────
  const handlePayForExtraRoom = async (amount: number, isGoldPrice: boolean) => {
    if (!pendingRoomData) return;

    if (!MiniKit.isInstalled()) {
      showError("World App no detectada. Abre esta app desde World App.");
      return;
    }

    setExtraRoomPayLoading(true);
    try {
      const payRes = await MiniKit.commandsAsync.pay({
        reference: generatePayReference("room"),
        to: RECEIVER,
        tokens: [{ symbol: Tokens.WLD, token_amount: tokenToDecimals(amount, Tokens.WLD).toString() }],
        description: "Sala adicional",
      });

      if (payRes?.finalPayload?.status !== "success") {
        console.warn("[GlobalChat] Pago sala extra cancelado:", payRes?.finalPayload?.status);
        return;
      }

      const transactionId = payRes.finalPayload.transaction_id;

      let verifyRes: Response;
      try {
        verifyRes = await fetchWithTimeout("/api/verifyPayment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transactionId, userId: currentUserId, action: "extra_room" }),
        }, 12000);
      } catch (fetchErr: unknown) {
        const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
        showError(`Error de red al verificar pago de sala: ${msg}`);
        return;
      }

      if (!verifyRes.ok) {
        const errData = await verifyRes.json().catch(() => ({}));
        const errMsg = (errData as { error?: string }).error ?? `HTTP ${verifyRes.status}`;
        showError(`El servidor rechazó el pago de sala extra: ${errMsg}`);
        return;
      }

      // [F5] Solo insertar sala DESPUÉS de confirmación del backend
      await insertRoom(pendingRoomData);
      setShowExtraRoomModal(false);
      setPendingRoomData(null);
      console.log("[GlobalChat] Sala extra creada. isGoldPrice:", isGoldPrice);

    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      showError(`Error al pagar sala extra: ${msg}`);
    } finally {
      setExtraRoomPayLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // [F11] INSERT ROOM
  // ─────────────────────────────────────────────────────────────────────────
  const insertRoom = async (data: Omit<ChatRoom, "id">) => {
    try {
      const { data: inserted, error } = await supabase.from("chat_rooms")
        .insert({ name: data.name, type: data.type, is_private: data.isPrivate, description: data.description ?? null, created_by: currentUserId })
        .select("id").maybeSingle();
      if (error) {
        showError(`Error al crear sala: ${error.message}`);
        return;
      }
      if (inserted?.id) {
        await fetchRooms();
        switchRoom(String(inserted.id));
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      showError(`Error inesperado al crear sala: ${msg}`);
    }
  };

  // [C4] handleCreateRoom con límites correctos: Classic → 2, Gold → 5
  const handleCreateRoom = async (data: Omit<ChatRoom, "id">) => {
    try {
      const { count, error: countError } = await supabase.from("chat_rooms")
        .select("*", { count: "exact", head: true })
        .eq("created_by", currentUserId)
        .eq("type", data.type);
      if (countError) { console.error("[GlobalChat] Error contando rooms:", countError.message); }
      const userCount = count ?? 0;

      // [C4] Límite según tier: Gold → 5, Classic → 2
      const limit = hasGoldAccess ? 5 : 2;

      if (userCount < limit) {
        await insertRoom(data);
      } else {
        setPendingRoomData(data);
        setShowExtraRoomModal(true);
      }
      setShowCreateRoom(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      showError(`Error al crear sala: ${msg}`);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // [F12] SEND
  // ─────────────────────────────────────────────────────────────────────────
  const handleSend = async (content: string, file?: File, audioBlob?: Blob, ephemeral?: boolean, replyMsg?: ChatMessage) => {
    if (!content.trim() && !file && !audioBlob) return;
    const username = myUsername || displayUsername(currentUserId);
    let fileUrl: string | undefined, fileName: string | undefined, fileType: string | undefined, audioUrl: string | undefined;

    if (audioBlob) {
      const path = `${currentUserId}/${Date.now()}-voice.webm`;
      const { error: upErr } = await supabase.storage.from("chat-files").upload(path, audioBlob, { cacheControl: "3600" });
      if (upErr) { console.error("[GlobalChat] Error subiendo audio:", upErr.message); showError("Error al subir audio. Intenta de nuevo."); return; }
      const { data: urlData } = supabase.storage.from("chat-files").getPublicUrl(path);
      audioUrl = urlData.publicUrl;
    }

    if (file) {
      const path = `${currentUserId}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("chat-files").upload(path, file, { cacheControl: "3600" });
      if (upErr) { console.error("[GlobalChat] Error subiendo archivo:", upErr.message); showError("Error al subir archivo. Intenta de nuevo."); return; }
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

    const fullPayload: Record<string, unknown> = {
      room_id: selectedRoomId,
      sender_id: currentUserId,
      content: content.trim() || null,
    };
    if (username)            fullPayload.username          = username;
    if (fileUrl)             fullPayload.file_url          = fileUrl;
    if (fileName)            fullPayload.file_name         = fileName;
    if (fileType)            fullPayload.file_type         = fileType;
    if (audioUrl)            fullPayload.audio_url         = audioUrl;
    if (replyMsg?.id)        fullPayload.reply_to_id       = replyMsg.id;
    if (replyMsg?.content)   fullPayload.reply_to_content  = replyMsg.content;
    if (replyMsg?.username)  fullPayload.reply_to_username = replyMsg.username;
    if (ephemeral)           fullPayload.ephemeral         = true;

    let { error } = await supabase.from("global_chat_messages").insert(fullPayload);

    if (error) {
      console.warn("[GlobalChat] Insert completo falló, reintentando mínimo:", error.message);
      const minPayload = { room_id: selectedRoomId, sender_id: currentUserId, content: content.trim() || null };
      const retry = await supabase.from("global_chat_messages").insert(minPayload);
      error = retry.error;
    }

    if (error) {
      console.error("[GlobalChat] Error guardando mensaje definitivo:", error.message);
      // [F12] Eliminar mensaje optimista si el insert falla definitivamente
      setMessages((prev) => ({
        ...prev,
        [selectedRoomId]: (prev[selectedRoomId] ?? []).filter((m) => m.id !== tempId),
      }));
      showError("No se pudo enviar el mensaje. Verifica tu conexión.");
    } else {
      setTimeout(() => refetchLatestMessages(selectedRoomId), 800);
    }
  };

  const handleTyping = useCallback((b: boolean) => {
    if (!b || !realtimeRef.current) return;
    realtimeRef.current.send({ type: "broadcast", event: "typing", payload: { user: currentUserId, username: displayUsername(currentUserId) } });
  }, [currentUserId, displayUsername]);

  const handleReact = useCallback((messageId: string, emoji: string) => {
    const roomReactions = reactionsPerRoom.get(selectedRoomId) ?? {};
    const current = roomReactions[messageId]?.[emoji] ?? [];
    const hasReacted = current.includes(currentUserId);
    const action: "add" | "remove" = hasReacted ? "remove" : "add";
    setReactionsPerRoom((prev) => {
      const roomR = { ...(prev.get(selectedRoomId) ?? {}) };
      const msg = { ...(roomR[messageId] ?? {}) };
      const users = [...(msg[emoji] ?? [])];
      if (action === "add")  { if (!users.includes(currentUserId)) users.push(currentUserId); }
      else { const i = users.indexOf(currentUserId); if (i > -1) users.splice(i, 1); }
      msg[emoji] = users;
      roomR[messageId] = msg;
      const updated = new Map(prev);
      updated.set(selectedRoomId, roomR);
      return updated;
    });
    realtimeRef.current?.send({ type: "broadcast", event: "reaction", payload: { messageId, emoji, userId: currentUserId, action } });
  }, [reactionsPerRoom, selectedRoomId, currentUserId]);

  const handlePin = useCallback((msgId: string) => {
    setPinnedPerRoom((prev) => {
      const current = prev.get(selectedRoomId) ?? [];
      let next: string[];
      if (current.includes(msgId)) {
        next = current.filter((id) => id !== msgId);
      } else {
        next = current.length >= 3 ? [...current.slice(1), msgId] : [...current, msgId];
      }
      const updated = new Map(prev);
      updated.set(selectedRoomId, next);
      return updated;
    });
  }, [selectedRoomId]);

  const handleStartEdit = (msgId: string) => {
    const msg = (messages[selectedRoomId] ?? []).find((m) => m.id === msgId);
    if (!msg) return;
    setEditingId(msgId); setEditText(msg.content ?? "");
  };

  // ─────────────────────────────────────────────────────────────────────────
  // [F13] EDIT/DELETE
  // ─────────────────────────────────────────────────────────────────────────
  const handleSaveEdit = async (msgId: string) => {
    if (!editText.trim()) return;
    try {
      const { error } = await supabase.from("global_chat_messages")
        .update({ content: editText.trim(), edited_at: new Date().toISOString() })
        .eq("id", msgId);
      if (error) {
        showError(`Error al editar mensaje: ${error.message}`);
        return;
      }
      setMessages((prev) => ({
        ...prev,
        [selectedRoomId]: (prev[selectedRoomId] ?? []).map((m) =>
          m.id === msgId ? { ...m, content: editText.trim(), editedAt: new Date().toISOString() } : m
        ),
      }));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      showError(`Error inesperado al editar: ${msg}`);
    }
    setEditingId(null); setEditText("");
  };

  const handleDelete = async (msgId: string) => {
    try {
      const { error } = await supabase.from("global_chat_messages")
        .update({ deleted_for_all: true, content: null })
        .eq("id", msgId);
      if (error) {
        showError(`Error al eliminar mensaje: ${error.message}`);
        return;
      }
      setMessages((prev) => ({
        ...prev,
        [selectedRoomId]: (prev[selectedRoomId] ?? []).map((m) =>
          m.id === msgId ? { ...m, deletedForAll: true, content: undefined } : m
        ),
      }));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      showError(`Error inesperado al eliminar: ${msg}`);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2"
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 16 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
            className={cx(
              "relative flex flex-col w-full max-w-md h-[88vh] rounded-2xl overflow-hidden shadow-2xl",
              isGold
                ? "bg-gradient-to-b from-yellow-950 via-amber-950 to-black border border-yellow-500/20"
                : "bg-gradient-to-b from-[#0e0618] via-[#0b0414] to-black border border-violet-500/20"
            )}
          >
            {/* ══ HEADER ══ */}
            <div className={cx("flex items-center gap-2 px-3 pt-3 pb-2 border-b flex-shrink-0",
              isGold ? "border-yellow-500/20" : "border-violet-500/20")}>

              {/* Type switch */}
              <div className="flex gap-1">
                {(["classic", "gold"] as RoomType[]).map((t) => {
                  const active = roomType === t;
                  return (
                    <button key={t} onClick={() => handleSwitchType(t)}
                      className={cx("flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer",
                        active
                          ? t === "gold" ? "bg-yellow-400/20 text-yellow-300 border border-yellow-400/30" : "bg-violet-400/20 text-violet-300 border border-violet-400/30"
                          : "text-white/30 hover:text-white/60 hover:bg-white/5")}>
                      {t === "gold" ? <Crown className="h-3 w-3" /> : <Hash className="h-3 w-3" />}
                      {t === "classic" ? "Clásico" : "Gold"}
                    </button>
                  );
                })}
              </div>

              {/* Room selector */}
              <div className="relative flex-1">
                <button
                  className="flex items-center gap-1 text-sm font-semibold text-white/80 hover:text-white transition-colors cursor-pointer truncate max-w-full"
                  onClick={() => {}}>
                  <span className="truncate">{selectedRoom?.name ?? "Selecciona sala"}</span>
                  <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-white/40" />
                </button>
              </div>

              {/* Room list dropdown — solo salas del tipo activo */}
              <div className="flex items-center gap-1">
                {filteredRooms.slice(0, 3).map((r) => (
                  <button key={r.id} onClick={() => switchRoom(r.id)}
                    title={r.name}
                    className={cx("px-2 py-0.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer",
                      r.id === selectedRoomId
                        ? isGold ? "bg-yellow-400/20 text-yellow-300" : "bg-violet-400/20 text-violet-300"
                        : "text-white/30 hover:text-white/60 hover:bg-white/5")}>
                    {r.isPrivate ? <Lock className="h-3 w-3 inline" /> : null} {r.name.slice(0, 8)}
                  </button>
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-0.5 ml-auto flex-shrink-0">
                <button onClick={() => setShowSearch(s => !s)}
                  className={cx("p-1.5 rounded-xl transition-colors cursor-pointer",
                    showSearch ? "text-violet-300 bg-violet-400/15" : "text-white/30 hover:text-white/60 hover:bg-white/8")}>
                  <Search className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => setShowCreateRoom(true)}
                  className="p-1.5 rounded-xl text-white/30 hover:text-white/60 hover:bg-white/8 transition-colors cursor-pointer">
                  <Plus className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => {}}
                  className="p-1.5 rounded-xl text-white/30 hover:text-white/60 hover:bg-white/8 transition-colors cursor-pointer"
                  title={`${connected.length + 1} conectados`}>
                  <Users className="h-3.5 w-3.5" />
                  {connected.length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 text-[9px] bg-green-500 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold">
                      {connected.length}
                    </span>
                  )}
                </button>
                <button onClick={onClose}
                  className="p-1.5 rounded-xl text-white/30 hover:text-white/60 hover:bg-white/8 transition-colors cursor-pointer">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Search bar */}
            <AnimatePresence>
              {showSearch && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="px-3 py-1.5 border-b border-white/8 flex-shrink-0">
                  <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buscar mensajes…"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-sm text-white placeholder-white/25 outline-none focus:border-violet-500/40" autoFocus />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Pinned */}
            <AnimatePresence>
              {pinnedMessages.length > 0 && (
                <PinnedBar messages={pinnedMessages} isGold={isGold} onUnpin={handlePin} />
              )}
            </AnimatePresence>

            {/* ══ MESSAGES ══ */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1 scroll-smooth">
              {noAccess && (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-4">
                  {roomType === "gold" ? (
                    <>
                      <Crown className="h-10 w-10 text-yellow-400/50" />
                      <p className="text-sm text-yellow-200/50">Necesitas Gold para acceder a estas salas.</p>
                      <Btn variant="gold" onClick={() => setShowGoldModal(true)}>Obtener Gold</Btn>
                    </>
                  ) : (
                    <>
                      <MessageSquare className="h-10 w-10 text-violet-400/50" />
                      <p className="text-sm text-violet-200/50">Necesitas suscripción para acceder al chat.</p>
                    </>
                  )}
                </div>
              )}

              {!noAccess && activeMessages.map((msg) => (
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
            {isGold && (
              <div className="flex items-center gap-1.5 px-4 pt-1 flex-shrink-0">
                <Crown className="h-3 w-3 text-yellow-400" />
                <span className="text-[10px] text-yellow-400/70 font-semibold tracking-wide">Gold Room</span>
              </div>
            )}
            <ChatInput
              onSend={handleSend} onTyping={handleTyping} isGold={isGold}
              hasGoldAccess={hasGoldAccess}
              disabled={noAccess} replyTo={replyTo} onCancelReply={() => setReplyTo(null)}
            />

            {/* ══ ERROR TOAST ══ */}
            <AnimatePresence>
              {errorToast && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-red-600/90 text-white text-xs font-medium shadow-xl max-w-[85%] text-center"
                >
                  {errorToast}
                </motion.div>
              )}
            </AnimatePresence>

            {/* ══ MODALES ══ */}
            <AnimatePresence>
              {showGoldModal  && <GoldSubscribeModal onClose={() => setShowGoldModal(false)} onSubscribe={handleGoldSubscribe} loading={goldLoading} />}
              {showCreateRoom && <CreateRoomModal onClose={() => setShowCreateRoom(false)} onCreate={handleCreateRoom} canCreateGold={canUseGold} />}
              {shareMsg       && <ShareModal message={shareMsg} onClose={() => setShareMsg(null)} />}
              {showExtraRoomModal && pendingRoomData && (
                <ExtraRoomPayModal
                  onClose={() => { setShowExtraRoomModal(false); setPendingRoomData(null); }}
                  onPay={() => handlePayForExtraRoom(extraRoomPrice, hasGoldAccess)}
                  loading={extraRoomPayLoading}
                  amount={extraRoomPrice}
                  isGoldPrice={hasGoldAccess}
                />
              )}
            </AnimatePresence>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
