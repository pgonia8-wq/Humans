/**
 * usePublishQueuedPosts
 */

import { useState, useCallback } from "react";
import { supabase } from "../../supabaseClient";
import type { Category, OfficialAccount } from "../lib/database.types";

export interface PublishParams {
  account: OfficialAccount;
}

export interface PublishResult {
  published: number;
}

export interface UsePublishQueuedPostsReturn {
  publish: (params: PublishParams) => Promise<PublishResult>;
  isLoading: boolean;
  error: string | null;
}

// Metadatos de las cuentas oficiales de la app.
// No requieren World ID — son cuentas internas del sistema SEEDS.
// El user_id es el nombre de la cuenta, único y estable.
const OFFICIAL_ACCOUNT_META: Record<OfficialAccount, { username: string; avatar_url: string }> = {
  "@news":     { username: "H News",     avatar_url: "" },
  "@crypto":   { username: "H Crypto",   avatar_url: "" },
  "@trading":  { username: "H Trading",  avatar_url: "" },
  "@memes":    { username: "H Memes",    avatar_url: "" },
  "@builders": { username: "H Builders", avatar_url: "" },
};

/**
 * Garantiza que exista un perfil en la tabla profiles para la cuenta oficial.
 * Si ya existe, no hace nada (onConflict: ignore).
 * Si no existe, lo crea con los metadatos básicos.
 */
async function ensureOfficialProfile(account: OfficialAccount): Promise<void> {
  const meta = OFFICIAL_ACCOUNT_META[account];
  if (!meta) return;

  await supabase
    .from("profiles")
    .upsert(
      {
        id:        account,           // "@news", "@crypto", etc.
        username:  meta.username,
        verified:  false,             // cuentas de app, no de Worldcoin
        tier:      "official",
      },
      { onConflict: "id", ignoreDuplicates: true }
    );
}

export function usePublishQueuedPosts(): UsePublishQueuedPostsReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const publish = useCallback(
    async (params: PublishParams): Promise<PublishResult> => {
      const { account } = params;

      setIsLoading(true);
      setError(null);

      try {
        // ── Intentar Edge Function primero ───────────────────────────────────
        const { data: fnData, error: fnError } = await supabase.functions.invoke<PublishResult>(
          "publish-post",
          { body: { account } }
        );

        if (!fnError && fnData) {
          console.log(
            `✅ [usePublishQueuedPosts] Edge Function published ${fnData.published} post(s)`
          );
          return fnData;
        }

        if (fnError) {
          console.warn(
            `⚠️ [usePublishQueuedPosts] Edge Function unavailable (${fnError.message}). Using fallback.`
          );
        }

        // ── Fallback: insertar directamente en posts ──────────────────────────

        // FIX 1: "content" incluido en el select
        const { data: candidates, error: selectErr } = await supabase
          .from("content_queue")
          .select("id, category, account, topic, content")
          .eq("status", "queued")
          .eq("account", account)
          .order("created_at", { ascending: true })
          .limit(1);

        if (selectErr) throw new Error(selectErr.message);

        if (!candidates || candidates.length === 0) {
          console.log(`📭 [usePublishQueuedPosts] No queued posts for ${account}`);
          return { published: 0 };
        }

        const post = candidates[0];

// 👇 usar el created_at original del queue
        const publishedAt = post.created_at;
        const hourOfDay = new Date(publishedAt).getHours();
        // Garantizar que el perfil oficial existe antes de insertar el post.
        // Si ya existe, esta operación no hace nada.
        await ensureOfficialProfile(account);

        // Marcar como publicado en content_queue
        const { error: updateErr } = await supabase
          .from("content_queue")
          .update({ status: "published", published_at: publishedAt })
          .eq("id", post.id);

        if (updateErr) throw new Error(updateErr.message);

        // FIX 2: insertar en la tabla "posts" para que aparezca en el feed
        const { error: postInsertErr } = await supabase
          .from("posts")
          .insert({
            user_id:          account,       // "@news", "@crypto", etc.
            content:          post.content,
            image_url:        null,
            timestamp:        publishedAt,
            deleted_flag:     false,
            visibility_score: 1,
          });

        if (postInsertErr) {
          console.error(
            `❌ [usePublishQueuedPosts] Error insertando en posts: ${postInsertErr.message}`
          );
        } else {
          console.log(`📰 [usePublishQueuedPosts] Post visible en feed para ${account}`);
        }

        // Registrar métricas
        const { error: metricsErr } = await supabase
          .from("post_metrics")
          .insert({
            queue_id:     post.id,
            category:     post.category as Category,
            account:      post.account as OfficialAccount,
            topic:        post.topic,
            impressions:  0,
            clicks:       0,
            wld_earned:   0,
            published_at: publishedAt,
            hour_of_day:  hourOfDay,
          });

        if (metricsErr) {
          console.warn(
            `⚠️ [usePublishQueuedPosts] Metrics insert failed: ${metricsErr.message}`
          );
        }

        console.log(`✅ [usePublishQueuedPosts] Published post ${post.id} via ${account}`);
        return { published: 1 };

      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown publish error";
        console.error("❌ [usePublishQueuedPosts] Error:", message);
        setError(message);
        return { published: 0 };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { publish, isLoading, error };
}
