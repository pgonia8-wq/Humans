/**
 * GlobalChatRoom.tsx â€” Componente premium self-contained
 *
 * Dependencias Ãºnicas:
 *   npm install framer-motion lucide-react
 *
 * Tailwind debe estar configurado en el proyecto.
 *
 * Uso:
 *   import GlobalChatRoom from "@/components/GlobalChatRoom";
 *
 *   <GlobalChatRoom
 *     isOpen={true}
 *     onClose={() => {}}
 *     currentUser={{ id: "u1", username: "Ana", role: "free", isOnline: true }}
 *   />
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Send, Crown, MessageSquare, Paperclip, Plus, Share2,
  Users, Lock, Globe, Hash, ChevronDown, FileText, Sparkles,
  Star, Twitter,
} from "lucide-react";

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// TIPOS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export type UserRole = "admin" | "gold" | "free";
export type RoomType = "classic" | "gold";

export interface ChatUser {
  id: string;
  username: string;
  avatarUrl?: string;
  role: UserRole;
  isOnline: boolean;
}

export interface ChatRoom {
  id: string;
  name: string;
  type: RoomType;
  isPrivate: boolean;
  description?: string;
  createdBy?: string;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  username: string;
  avatarUrl?: string;
  content?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  createdAt: string;
}

export interface TypingUser { userId: string; username: string; }
export interface ConnectedUser { userId: string; username: string; avatarUrl?: string; }

export interface GlobalChatRoomProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: ChatUser;
  defaultRoom?: RoomType;
  /** URL base de la API REST. Default: "" (mismo origen) */
  apiBaseUrl?: string;
  /** URL WebSocket. Default: auto-detectada */
  wsUrl?: string;
  onSendMessage?: (message: ChatMessage) => void;
  supabase: any;                
}


// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// DATOS DE EJEMPLO
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const SEED_CLASSIC: ChatMessage[] = [
  { id: "c1", roomId: "classic-general", userId: "s1", username: "Alex Rivera",   content: "Hola a todos! Bienvenidos al Global Chat", createdAt: new Date(Date.now() - 600_000).toISOString() },
  { id: "c2", roomId: "classic-general", userId: "s2", username: "Maria Lopez",   content: "QuÃ© buena onda este nuevo chat, me encanta el diseÃ±o", createdAt: new Date(Date.now() - 300_000).toISOString() },
  { id: "c3", roomId: "classic-general", userId: "s3", username: "Carlos Dev",    content: "Soy desarrollador, alguien quiere hablar de React?", createdAt: new Date(Date.now() - 120_000).toISOString() },
];

const SEED_GOLD: ChatMessage[] = [
  { id: "g1", roomId: "gold-vip",       userId: "s4", username: "Isabella VIP",  content: "Bienvenidos al Gold Chat exclusivo!", createdAt: new Date(Date.now() - 480_000).toISOString() },
  { id: "g2", roomId: "gold-vip",       userId: "s5", username: "Rodrigo Gold",  content: "Este canal es increÃ­ble, la comunidad premium es otra cosa", createdAt: new Date(Date.now() - 180_000).toISOString() },
];

const SEED_ROOMS: ChatRoom[] = [
  { id: "classic-general",  name: "General",    type: "classic", isPrivate: false, description: "Chat general para todos" },
  { id: "classic-tech",     name: "TecnologÃ­a", type: "classic", isPrivate: false, description: "Habla de tech y programaciÃ³n" },
  { id: "gold-vip",         name: "VIP Lounge", type: "gold",    isPrivate: false, description: "Sala exclusiva Gold" },
  { id: "gold-business",    name: "Business",   type: "gold",    isPrivate: true,  description: "Negocios y networking" },
];

const SEED_CONNECTED: ConnectedUser[] = [
  { userId: "s1", username: "Alex Rivera" },
  { userId: "s2", username: "Maria Lopez" },
  { userId: "s3", username: "Carlos Dev" },
  { userId: "s6", username: "Sofia P." },
];

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// UTILIDADES INTERNAS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function cx(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

function timeStr(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

function initials(name: string): string {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// COMPONENTES UI INTERNOS (sin dependencia de Shadcn)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** Avatar circular con fallback de iniciales */
function Avatar({ src, name, size = "md", ring = false, gold = false }: {
  src?: string; name: string; size?: "xs" | "sm" | "md"; ring?: boolean; gold?: boolean;
}) {
  const [imgError, setImgError] = useState(false);
  const sizeClass = size === "xs" ? "w-5 h-5 text-[8px]" : size === "sm" ? "w-8 h-8 text-xs" : "w-9 h-9 text-sm";
  const ringClass = ring
    ? gold
      ? "ring-2 ring-yellow-500/60 group-hover:ring-yellow-400/90"
      : "ring-2 ring-indigo-500/50 group-hover:ring-indigo-400/80"
    : "";

  return (
    <div className={cx("rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden transition-all duration-200", sizeClass, ringClass,
      gold ? "bg-yellow-900/60 text-yellow-300 font-bold" : "bg-indigo-900/60 text-indigo-300 font-bold"
    )}>
      {src && !imgError
        ? <img src={src} alt={name} className="w-full h-full object-cover" onError={() => setImgError(true)} />
        : <span>{initials(name)}</span>
      }
    </div>
  );
}

/** BotÃ³n base reutilizable */
function Btn({ children, onClick, disabled, variant = "primary", className, testId }: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean;
  variant?: "primary" | "ghost" | "outline" | "gold" | "danger"; className?: string; testId?: string;
}) {
  const base = "inline-flex items-center justify-center gap-2 rounded-lg font-medium text-sm transition-all duration-150 select-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed";
  const variants: Record<string, string> = {
    primary: "bg-indigo-600 text-white px-4 py-2 shadow shadow-indigo-500/30 active:brightness-90",
    ghost:   "text-white/60 px-2 py-1.5 active:bg-white/10",
    outline: "border border-indigo-500/30 text-indigo-300 px-4 py-2 active:bg-indigo-600/20",
    gold:    "bg-gradient-to-r from-yellow-500 to-amber-500 text-white px-4 py-2 shadow shadow-yellow-500/30 active:brightness-90",
    danger:  "bg-red-600/80 text-white px-3 py-1.5 active:brightness-90",
  };
  return (
    <button onClick={onClick} disabled={disabled} data-testid={testId}
      className={cx(base, variants[variant], className)}>
      {children}
    </button>
  );
}

/** Badge de rol */
function RoleBadge({ role }: { role: UserRole }) {
  if (role === "admin") return <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/20 font-semibold">Admin</span>;
  if (role === "gold")  return <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/20 font-semibold">Gold</span>;
  return null;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// TYPING INDICATOR
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function TypingIndicator({ users }: { users: TypingUser[] }) {
  if (!users.length) return null;
  const label = users.length === 1
    ? `${users[0].username} estÃ¡ escribiendo`
    : `${users.map((u) => u.username).join(", ")} estÃ¡n escribiendo`;

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
      className="flex items-center gap-2 px-2 py-1">
      <div className="flex gap-[3px]">
        {[0, 1, 2].map((i) => (
          <motion.span key={i} className="w-1.5 h-1.5 rounded-full bg-indigo-400 block"
            animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.13 }} />
        ))}
      </div>
      <span className="text-[11px] text-white/40 italic">{label}...</span>
    </motion.div>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// BURBUJA DE MENSAJE
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function MessageBubble({ message, isOwn, isGold, onShare }: {
  message: ChatMessage; isOwn: boolean; isGold: boolean; onShare: (m: ChatMessage) => void;
}) {
  const [hover, setHover] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cx("flex gap-2.5 group", isOwn ? "flex-row-reverse" : "flex-row")}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Avatar */}
      <div className="flex-shrink-0 mt-1">
        <Avatar src={message.avatarUrl} name={message.username} size="sm" ring gold={isGold} />
      </div>

      {/* Contenido */}
      <div className={cx("flex flex-col gap-1 max-w-[75%]", isOwn ? "items-end" : "items-start")}>
        {/* Meta */}
        <div className={cx("flex items-center gap-1.5 flex-wrap", isOwn ? "flex-row-reverse" : "flex-row")}>
          <span className={cx("text-xs font-semibold", isGold ? "text-yellow-300" : "text-indigo-300")}>
            {message.username}
          </span>
          <span className="text-[10px] text-white/30">{timeStr(message.createdAt)}</span>
        </div>

        {/* Burbuja */}
        <div className={cx(
          "rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-lg",
          isOwn
            ? isGold
              ? "bg-gradient-to-br from-yellow-600 to-amber-600 text-white rounded-tr-sm"
              : "bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-tr-sm"
            : "bg-white/10 backdrop-blur-sm text-white/90 rounded-tl-sm border border-white/10"
        )}>
          {message.content && <p className="break-words whitespace-pre-wrap">{message.content}</p>}

          {/* Archivo adjunto */}
          {message.fileUrl && (
            <div className="mt-1.5">
              {message.fileType?.startsWith("image/") ? (
                <img
                  src={message.fileUrl} alt={message.fileName ?? "imagen"}
                  onClick={() => window.open(message.fileUrl!, "_blank")}
                  className="rounded-lg max-w-[200px] max-h-[150px] object-cover cursor-pointer border border-white/10"
                />
              ) : (
                <a href={message.fileUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs underline opacity-80">
                  <FileText className="w-4 h-4 flex-shrink-0" />
                  {message.fileName ?? "archivo"}
                </a>
              )}
            </div>
          )}
        </div>

        {/* Compartir (hover) */}
        <AnimatePresence>
          {hover && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.1 }}
              onClick={() => onShare(message)}
              className="flex items-center gap-1 text-[10px] text-white/35 px-1.5 py-0.5 rounded-md cursor-pointer"
              data-testid={`button-share-${message.id}`}
            >
              <Share2 className="w-3 h-3" /> Compartir
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// MODAL SUSCRIPCIÃ“N GOLD
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function GoldSubscribeModal({ onClose, onSubscribe }: { onClose: () => void; onSubscribe: () => void }) {
  return (
    <Overlay>
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.85, opacity: 0 }} transition={{ type: "spring", damping: 20, stiffness: 300 }}
        className="relative w-80 rounded-2xl border border-yellow-500/30 bg-gradient-to-b from-yellow-950/95 to-amber-950/90 p-6 shadow-2xl"
      >
        <CloseBtn onClick={onClose} testId="button-close-gold-modal" />

        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 shadow-lg shadow-yellow-500/30">
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
            <Btn variant="gold" onClick={onSubscribe} className="w-full" testId="button-subscribe-gold">
              <Sparkles className="h-4 w-4" /> Suscribirme â€” $9.99/mes
            </Btn>
            <button onClick={onClose} data-testid="button-cancel-gold"
              className="w-full text-xs text-yellow-100/40 cursor-pointer py-1">
              QuizÃ¡s mÃ¡s tarde
            </button>
          </div>
        </div>
      </motion.div>
    </Overlay>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// MODAL CREAR SALA
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function CreateRoomModal({ onClose, onCreate, canCreateGold }: {
  onClose: () => void;
  onCreate: (room: Omit<ChatRoom, "id">) => void;
  canCreateGold: boolean;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<RoomType>("classic");
  const [isPrivate, setIsPrivate] = useState(false);
  const [description, setDescription] = useState("");

  return (
    <Overlay>
      <motion.div
        initial={{ scale: 0.88, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.88, opacity: 0 }} transition={{ type: "spring", damping: 20, stiffness: 300 }}
        className="relative w-80 rounded-2xl border border-indigo-500/30 bg-gradient-to-b from-indigo-950/95 to-violet-950/90 p-6 shadow-2xl"
      >
        <CloseBtn onClick={onClose} testId="button-close-create-room" />
        <h3 className="mb-4 text-base font-bold text-indigo-200">Crear nueva sala</h3>

        <div className="space-y-3">
          <ModalInput label="Nombre de la sala" value={name} onChange={setName} placeholder="ej. off-topic" maxLength={50} testId="input-room-name" />
          <ModalInput label="DescripciÃ³n (opcional)" value={description} onChange={setDescription} placeholder="De quÃ© trata esta sala" maxLength={100} testId="input-room-description" />

          {/* Tipo */}
          <div>
            <label className="mb-1 block text-xs text-indigo-300">Tipo</label>
            <div className="flex gap-2">
              {(["classic", "gold"] as RoomType[]).map((t) => {
                const isGoldOption = t === "gold";
                const active = type === t;
                return (
                  <button key={t}
                    onClick={() => (!isGoldOption || canCreateGold) && setType(t)}
                    data-testid={`button-type-${t}`}
                    className={cx(
                      "flex-1 rounded-lg border py-2 text-xs font-medium transition-all",
                      isGoldOption && !canCreateGold ? "cursor-not-allowed opacity-40" : "cursor-pointer",
                      active
                        ? isGoldOption ? "border-yellow-500 bg-yellow-600/30 text-yellow-200" : "border-indigo-500 bg-indigo-600/50 text-indigo-200"
                        : "border-white/10 text-white/40"
                    )}
                  >
                    {isGoldOption ? <Crown className="mx-auto mb-0.5 h-4 w-4" /> : <MessageSquare className="mx-auto mb-0.5 h-4 w-4" />}
                    {t === "classic" ? "Classic" : <>Gold {!canCreateGold && <span className="text-[9px]">(Gold+)</span>}</>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Privacidad */}
          <div className="flex items-center gap-2">
            <button onClick={() => setIsPrivate(!isPrivate)} data-testid="button-toggle-private"
              className={cx("flex h-5 w-9 items-center rounded-full border transition-all cursor-pointer",
                isPrivate ? "border-indigo-500 bg-indigo-600/60" : "border-white/20 bg-white/10"
              )}>
              <span className={cx("ml-0.5 h-3.5 w-3.5 rounded-full bg-white shadow transition-all", isPrivate ? "translate-x-4" : "")} />
            </button>
            <span className="flex items-center gap-1 text-xs text-indigo-300">
              {isPrivate ? <Lock className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
              {isPrivate ? "Sala privada" : "Sala pÃºblica"}
            </span>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Btn variant="outline" onClick={onClose} className="flex-1" testId="button-cancel-create-room">Cancelar</Btn>
          <Btn variant="primary" onClick={() => { if (!name.trim()) return; onCreate({ name: name.trim(), type, isPrivate, description: description.trim() || undefined }); onClose(); }}
            disabled={!name.trim()} className="flex-1" testId="button-confirm-create-room">
            Crear sala
          </Btn>
        </div>
      </motion.div>
    </Overlay>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// MODAL COMPARTIR
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ShareModal({ message, onClose }: { message: ChatMessage; onClose: () => void }) {
  const text = encodeURIComponent(`"${message.content}" â€” ${message.username} en GlobalChat`);

  const platforms = [
    { label: "Twitter / X",  url: `https://twitter.com/intent/tweet?text=${text}`,  color: "text-sky-400",   icon: <Twitter className="h-4 w-4" /> },
    { label: "WhatsApp",     url: `https://wa.me/?text=${text}`,                     color: "text-green-400", icon: <WhatsAppIcon /> },
    { label: "Discord",      url: `https://discord.com/`,                            color: "text-indigo-400",icon: <DiscordIcon /> },
  ];

  return (
    <Overlay>
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0 }} transition={{ type: "spring", damping: 22, stiffness: 300 }}
        className="relative w-72 rounded-2xl border border-white/10 bg-gray-900/98 p-5 shadow-2xl"
      >
        <CloseBtn onClick={onClose} testId="button-close-share" />
        <h3 className="mb-3 text-sm font-bold text-white">Compartir mensaje</h3>

        {message.content && (
          <p className="mb-4 rounded-lg bg-white/5 px-3 py-2 text-xs text-white/50 italic line-clamp-2">
            "{message.content}"
          </p>
        )}

        <div className="space-y-2">
          {platforms.map((p) => (
            <a key={p.label} href={p.url} target="_blank" rel="noopener noreferrer"
              data-testid={`link-share-${p.label.toLowerCase().replace(/\s/g, "-")}`}
              className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70 transition-colors cursor-pointer">
              <span className={p.color}>{p.icon}</span>{p.label}
            </a>
          ))}
          <button onClick={() => { navigator.clipboard.writeText(message.content ?? ""); onClose(); }}
            data-testid="button-copy-message"
            className="flex w-full items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70 cursor-pointer">
            <Hash className="h-4 w-4 text-purple-400" /> Copiar texto
          </button>
        </div>
      </motion.div>
    </Overlay>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// CHAT INPUT
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ChatInput({ onSend, onTyping, isGold, disabled }: {
  onSend: (content: string, file?: File) => void;
  onTyping: (isTyping: boolean) => void;
  isGold: boolean;
  disabled?: boolean;
}) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const clearFile = () => {
    setFile(null);
    setPreviewUrl(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const send = () => {
    if (!text.trim() && !file) return;
    onSend(text.trim(), file ?? undefined);
    setText("");
    clearFile();
    onTyping(false);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    // Auto-resize
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
    onTyping(true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => onTyping(false), 1500);
  };

  return (
    <div className={cx("border-t p-3 flex-shrink-0", isGold ? "border-yellow-500/20 bg-yellow-950/30" : "border-indigo-500/20 bg-indigo-950/30")}>
      {/* Preview archivo */}
      <AnimatePresence>
        {file && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="mb-2 flex items-center gap-2 rounded-lg bg-white/5 p-2">
            {previewUrl
              ? <img src={previewUrl} alt="preview" className="h-10 w-10 rounded object-cover" />
              : <FileText className="h-8 w-8 text-indigo-400 flex-shrink-0" />
            }
            <div className="flex-1 min-w-0">
              <p className="truncate text-xs text-white/70">{file.name}</p>
              <p className="text-[10px] text-white/30">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
            <button onClick={clearFile} className="text-white/30 cursor-pointer p-1" data-testid="button-clear-file">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-end gap-2">
        {/* Adjuntar */}
        <input ref={fileRef} type="file" accept="image/*,.pdf,.doc,.docx,.txt"
          data-testid="input-file-upload"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setFile(f);
            setPreviewUrl(f.type.startsWith("image/") ? URL.createObjectURL(f) : null);
          }}
          className="hidden" id="gcr-file-input"
        />
        <button onClick={() => fileRef.current?.click()} disabled={disabled}
          data-testid="button-attach-file"
          className={cx("flex-shrink-0 p-2.5 rounded-xl transition-colors cursor-pointer disabled:opacity-30",
            isGold ? "text-yellow-400/60" : "text-indigo-400/60"
          )}>
          <Paperclip className="h-4 w-4" />
        </button>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKey}
          disabled={disabled}
          rows={1}
          placeholder={disabled ? "Solo para usuarios Gold" : "Escribe un mensaje... (Enter para enviar)"}
          data-testid="input-chat-message"
          className={cx(
            "flex-1 resize-none rounded-2xl border text-sm text-white placeholder-white/30 bg-transparent transition-all py-2.5 px-3.5 outline-none min-h-[40px] max-h-[120px] overflow-y-auto",
            "scrollbar-thin focus:ring-1",
            isGold
              ? "border-yellow-500/30 bg-yellow-900/20 focus:border-yellow-400/50 focus:ring-yellow-500/20"
              : "border-indigo-500/30 bg-indigo-900/20 focus:border-indigo-400/50 focus:ring-indigo-500/20"
          )}
        />

        {/* Enviar */}
        <button
          onClick={send}
          disabled={disabled || (!text.trim() && !file)}
          data-testid="button-send-message"
          className={cx(
            "flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center shadow-lg transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed active:scale-95",
            isGold
              ? "bg-gradient-to-br from-yellow-500 to-amber-600 shadow-yellow-500/30"
              : "bg-gradient-to-br from-indigo-500 to-violet-600 shadow-indigo-500/30"
          )}
        >
          <Send className="h-4 w-4 text-white" />
        </button>
      </div>
    </div>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// HELPERS DE LAYOUT (sin extraer archivos)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex items-center justify-center rounded-2xl bg-black/65 backdrop-blur-sm">
      {children}
    </motion.div>
  );
}

function CloseBtn({ onClick, testId }: { onClick: () => void; testId?: string }) {
  return (
    <button onClick={onClick} data-testid={testId}
      className="absolute right-3 top-3 text-white/30 cursor-pointer p-1 rounded-lg transition-colors">
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
      <label className="mb-1 block text-xs text-indigo-300">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} maxLength={maxLength} data-testid={testId}
        className="w-full rounded-lg border border-indigo-500/30 bg-indigo-900/40 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-indigo-400/60 transition-colors" />
    </div>
  );
}

// SVG icons para redes sociales (internos)
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

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// COMPONENTE PRINCIPAL
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function GlobalChatRoom({
  isOpen,
  onClose,
  currentUser,
  defaultRoom = "classic",
  apiBaseUrl = "",
  supabase,
  wsUrl,
  onSendMessage,
}: GlobalChatRoomProps) {
  // â”€â”€ Estado â”€â”€
  const [roomType,       setRoomType]       = useState<RoomType>(defaultRoom);
  const [rooms,          setRooms]          = useState<ChatRoom[]>(SEED_ROOMS);
  const [selectedRoomId, setSelectedRoomId] = useState(defaultRoom === "gold" ? "gold-vip" : "classic-general");
  const [messages,       setMessages]       = useState<Record<string, ChatMessage[]>>({
    "classic-general": SEED_CLASSIC,
    "classic-tech":    [],
    "gold-vip":        SEED_GOLD,
    "gold-business":   [],
  });
  const [typingUsers,    setTypingUsers]    = useState<TypingUser[]>([]);
  const [connected,      setConnected]      = useState<ConnectedUser[]>(SEED_CONNECTED);
  const [showRooms,      setShowRooms]      = useState(false);
  const [showGoldModal,  setShowGoldModal]  = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [shareMsg,       setShareMsg]       = useState<ChatMessage | null>(null);
  const [isSubscribed,   setIsSubscribed]   = useState(
    currentUser.role === "gold" || currentUser.role === "admin"
  );

  // â”€â”€ Refs â”€â”€
  const bottomRef = useRef<HTMLDivElement>(null);
 // const wsRef     = useRef<WebSocket | null>(null);

  // â”€â”€ Derivados â”€â”€
  const isGold      = roomType === "gold";
  const canUseGold  = isSubscribed;
  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);
  const activeMessages = messages[selectedRoomId] ?? [];
  const filteredRooms  = rooms.filter((r) => r.type === roomType);


      // ── WebSocket ── desactivado (usamos Supabase realtime en su lugar)
// const wsRef = useRef<WebSocket | null>(null);

// ── Auto-scroll ──
useEffect(() => {
  bottomRef.current?.scrollIntoView({ behavior: "smooth" });
}, [activeMessages.length, typingUsers.length]);

// ── Cambiar sala ──
const switchRoom = useCallback((roomId: string) => {
  setSelectedRoomId(roomId);
  setShowRooms(false);
  setTypingUsers([]);
  // No enviamos nada por WS → ya lo manejamos con Supabase después
}, [currentUser.id, currentUser.username]);



  // â”€â”€ Crear sala â”€â”€
  const handleCreateRoom = (data: Omit<ChatRoom, "id">) => {
    const room: ChatRoom = { ...data, id: `room-${Date.now()}` };
    setRooms((p) => [...p, room]);
    setMessages((p) => ({ ...p, [room.id]: [] }));
    setRoomType(room.type);
    switchRoom(room.id);
  };

  // â”€â”€ SuscripciÃ³n Gold â”€â”€
  const handleSubscribe = () => {
    setIsSubscribed(true);
    setShowGoldModal(false);
    setRoomType("gold");
    const first = rooms.find((r) => r.type === "gold");
    if (first) switchRoom(first.id);
  };

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // RENDER
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <AnimatePresence>
      {isOpen && (
        /* Backdrop */
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/60"
          onClick={(e) => e.target === e.currentTarget && onClose()}
          data-testid="overlay-chat-modal"
        >
          {/* Ventana */}
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 20 }}
            transition={{ type: "spring", damping: 24, stiffness: 300 }}
            className={cx(
              "relative flex h-[600px] w-full max-w-md flex-col rounded-2xl overflow-hidden shadow-2xl border",
              isGold
                ? "border-yellow-500/30 bg-gradient-to-b from-yellow-950/97 via-amber-950/92 to-orange-950/97"
                : "border-indigo-500/30 bg-gradient-to-b from-indigo-950/97 via-violet-950/92 to-purple-950/97"
            )}
            data-testid="container-chat-room"
          >

            {/* â•â•â• HEADER â•â•â• */}
            <div className={cx("flex items-center gap-3 px-4 py-3 border-b flex-shrink-0",
              isGold ? "border-yellow-500/20 bg-yellow-900/20" : "border-indigo-500/20 bg-indigo-900/20")}>

              {/* Icono sala */}
              <div className={cx("flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl",
                isGold ? "bg-yellow-500/20 text-yellow-400" : "bg-indigo-500/20 text-indigo-400")}>
                {isGold ? <Crown className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
              </div>

              {/* Nombre + selector */}
              <div className="flex-1 min-w-0">
                <button onClick={() => setShowRooms(!showRooms)} data-testid="button-toggle-room-list"
                  className="flex items-center gap-1 cursor-pointer">
                  <span className="font-bold text-sm text-white truncate">
                    {isGold ? "Gold Chat" : "Global Chat"} â€” {selectedRoom?.name ?? "General"}
                  </span>
                  <ChevronDown className={cx("h-3.5 w-3.5 text-white/40 transition-transform", showRooms && "rotate-180")} />
                </button>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-[11px] text-white/40">{connected.length + 1} conectados</span>
                  {selectedRoom?.isPrivate && <Lock className="h-3 w-3 text-white/30" />}
                </div>
              </div>

              {/* Avatar usuario */}
              <Avatar src={currentUser.avatarUrl} name={currentUser.username} gold={isGold} />

              {/* Toggle Classic / Gold (solo si estÃ¡ suscrito) */}
              {isSubscribed && (
                <div className="flex rounded-lg border border-white/10 overflow-hidden">
                  {(["classic", "gold"] as RoomType[]).map((t) => (
                    <button key={t} onClick={() => handleSwitchType(t)}
                      data-testid={`button-switch-${t}`}
                      className={cx("px-2 py-1 text-[10px] font-medium transition-all cursor-pointer capitalize",
                        roomType === t
                          ? t === "gold" ? "bg-yellow-600 text-white" : "bg-indigo-600 text-white"
                          : "text-white/40"
                      )}>
                      {t}
                    </button>
                  ))}
                </div>
              )}

              {/* BotÃ³n upgrade Gold */}
              {!isSubscribed && (
                <button onClick={() => setShowGoldModal(true)} data-testid="button-upgrade-gold"
                  className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-yellow-500 to-amber-500 px-2 py-1 text-[10px] font-bold text-white cursor-pointer shadow shadow-yellow-500/30">
                  <Crown className="h-3 w-3" /> Gold
                </button>
              )}

              {/* Cerrar */}
              <button onClick={onClose} data-testid="button-close-chat"
                className="flex-shrink-0 text-white/40 cursor-pointer p-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* â•â•â• DROPDOWN LISTA DE SALAS â•â•â• */}
            <AnimatePresence>
              {showRooms && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  className={cx("border-b overflow-hidden flex-shrink-0",
                    isGold ? "border-yellow-500/20 bg-yellow-900/30" : "border-indigo-500/20 bg-indigo-900/30")}>
                  <div className="px-3 py-2 space-y-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-white/30 px-1">
                      {isGold ? "Salas Gold" : "Salas Classic"}
                    </p>
                    {filteredRooms.map((room) => (
                      <button key={room.id} onClick={() => switchRoom(room.id)}
                        data-testid={`button-room-${room.id}`}
                        className={cx(
                          "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm cursor-pointer transition-colors",
                          room.id === selectedRoomId
                            ? isGold ? "bg-yellow-600/30 text-yellow-200" : "bg-indigo-600/30 text-indigo-200"
                            : "text-white/50"
                        )}>
                        <Hash className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="flex-1 truncate">{room.name}</span>
                        {room.isPrivate && <Lock className="h-3 w-3 text-white/30" />}
                      </button>
                    ))}
                    <button onClick={() => { setShowCreateRoom(true); setShowRooms(false); }}
                      data-testid="button-open-create-room"
                      className={cx("flex w-full items-center gap-2 rounded-lg border border-dashed px-2 py-1.5 text-xs cursor-pointer transition-colors",
                        isGold ? "border-yellow-500/30 text-yellow-400/60" : "border-indigo-500/30 text-indigo-400/60")}>
                      <Plus className="h-3.5 w-3.5" /> Crear nueva sala
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* â•â•â• BARRA DE USUARIOS CONECTADOS â•â•â• */}
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
              <RoleBadge role={currentUser.role} />
            </div>

            {/* â•â•â• ÃREA DE MENSAJES â•â•â• */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" data-testid="container-messages"
              style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.08) transparent" }}>

              {/* Estado vacÃ­o */}
              {activeMessages.length === 0 && (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center min-h-[200px]">
                  <div className={cx("flex h-14 w-14 items-center justify-center rounded-2xl",
                    isGold ? "bg-yellow-500/10 text-yellow-400" : "bg-indigo-500/10 text-indigo-400")}>
                    {isGold ? <Crown className="h-7 w-7" /> : <MessageSquare className="h-7 w-7" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white/60">No hay mensajes aÃºn</p>
                    <p className="text-xs text-white/30">SÃ© el primero en escribir algo</p>
                  </div>
                </div>
              )}

              {/* Mensajes */}
              {activeMessages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isOwn={msg.userId === currentUser.id}
                  isGold={isGold}
                  onShare={setShareMsg}
                />
              ))}

              {/* Typing */}
              <AnimatePresence>
                {typingUsers.length > 0 && <TypingIndicator users={typingUsers} />}
              </AnimatePresence>

              <div ref={bottomRef} />
            </div>

            {/* â•â•â• INPUT â•â•â• */}
            <ChatInput
              onSend={handleSend}
              onTyping={handleTyping}
              isGold={isGold}
              disabled={isGold && !canUseGold}
            />

            {/* â•â•â• MODALES INTERNOS â•â•â• */}
            <AnimatePresence>
              {showGoldModal  && <GoldSubscribeModal  onClose={() => setShowGoldModal(false)}  onSubscribe={handleSubscribe} />}
              {showCreateRoom && <CreateRoomModal      onClose={() => setShowCreateRoom(false)} onCreate={handleCreateRoom} canCreateGold={canUseGold} />}
              {shareMsg       && <ShareModal           message={shareMsg}                       onClose={() => setShareMsg(null)} />}
            </AnimatePresence>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// DEMO â€” para ver el componente aislado
// Uso: <GlobalChatRoomDemo />
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function GlobalChatRoomDemo() {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<UserRole>("free");

  const demoUser: ChatUser = { id: "demo-user", username: "TÃº (Demo)", role, isOnline: true };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8"
      style={{ background: "linear-gradient(135deg, #0f0c1a 0%, #1a103a 50%, #1a0a2e 100%)" }}>

      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold text-white">Global Chat Room</h1>
        <p className="text-sm text-white/40">Premium chat con soporte Classic &amp; Gold</p>
      </div>

      {/* Selector de rol para demo */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-white/30">Rol demo:</span>
        {(["free", "gold", "admin"] as UserRole[]).map((r) => (
          <button key={r} onClick={() => setRole(r)}
            className={cx("px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer capitalize border",
              role === r
                ? r === "gold"  ? "border-yellow-500 bg-yellow-600/40 text-yellow-300"
                  : r === "admin" ? "border-red-500 bg-red-600/30 text-red-300"
                  : "border-indigo-500 bg-indigo-600/40 text-indigo-300"
                : "border-white/10 text-white/30"
            )}>
            {r}
          </button>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap justify-center">
        <button onClick={() => setOpen(true)} data-testid="button-open-classic"
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 cursor-pointer active:scale-95 transition-all">
          <MessageSquare className="h-4 w-4" /> Abrir Classic Chat
        </button>
        <button onClick={() => setOpen(true)} data-testid="button-open-gold"
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-yellow-500/30 cursor-pointer active:scale-95 transition-all">
          <Crown className="h-4 w-4" /> Abrir Gold Chat
        </button>
      </div>

      <GlobalChatRoom
        isOpen={open}
        onClose={() => setOpen(false)}
        currentUser={demoUser}
        defaultRoom="classic"
      />
    </div>
  );
}
