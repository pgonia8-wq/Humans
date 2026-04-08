
  import type { ChatMessage } from "./chatTypes";

  export function cx(...c: (string | false | undefined | null)[]): string {
    return c.filter(Boolean).join(" ");
  }

  export function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "ahora";
    if (mins < 60) return mins + "m";
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + "h";
    const days = Math.floor(hrs / 24);
    if (days < 7) return days + "d";
    return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  }

  export function timeStr(iso: string): string {
    return new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  }

  export function dateSeparator(iso: string): string {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return "Hoy";
    if (d.toDateString() === yesterday.toDateString()) return "Ayer";
    return d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
  }

  export function initials(name: string): string {
    return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  }

  export function canEditMsg(createdAt: string): boolean {
    return Date.now() - new Date(createdAt).getTime() < 15 * 60 * 1000;
  }

  export function isImageFile(type?: string): boolean {
    return !!type && type.startsWith("image/");
  }

  export function generatePayReference(): string {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    const h = (n: number) => Math.random().toString(16).slice(2, 2 + n).padStart(n, "0");
    return `${h(8)}-${h(4)}-4${h(3)}-8${h(3)}-${h(12)}`;
  }

  export async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 12000): Promise<Response> {
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

  export function rowToMessage(row: Record<string, unknown>): ChatMessage {
    const rawProfile = row.profiles;
    const profile = (Array.isArray(rawProfile) ? rawProfile[0] : rawProfile) as { username?: string; avatar_url?: string } | null | undefined;
    const senderId = String(row.sender_id ?? row.user_id ?? "");
    const resolvedUsername = profile?.username
      ? String(profile.username)
      : (row.username ? String(row.username) : (senderId ? `@${senderId.slice(0, 6)}` : "Anon"));
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
      replyToUsername:  row.reply_to_username ? String(row.reply_to_username) : undefined,
      editedAt:        row.edited_at         ? String(row.edited_at)         : undefined,
      deletedForAll:   row.deleted_for_all   ? Boolean(row.deleted_for_all)  : undefined,
      ephemeral:       row.ephemeral         ? Boolean(row.ephemeral)        : undefined,
      createdAt:       String(row.created_at ?? new Date().toISOString()),
      status:          "sent",
    };
  }

  export function shouldGroupWithPrev(msg: ChatMessage, prev?: ChatMessage): boolean {
    if (!prev) return false;
    if (prev.userId !== msg.userId) return false;
    const diff = new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime();
    return diff < 3 * 60 * 1000;
  }

  export function isDifferentDay(a: string, b: string): boolean {
    return new Date(a).toDateString() !== new Date(b).toDateString();
  }
  