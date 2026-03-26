/**
 * usePublishQueuedPosts
 *
 * Publishes the next queued post for a given official account.
 * Moves the post from status="queued" → status="published"
 * and creates a corresponding row in post_metrics.
 *
 * Calls the Supabase Edge Function "publish-post" if available.
 * Falls back to a direct DB update when the function isn't deployed.
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

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePublishQueuedPosts(): UsePublishQueuedPostsReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const publish = useCallback(
    async (params: PublishParams): Promise<PublishResult> => {
      const { account } = params;

      setIsLoading(true);
      setError(null);

      try {
        // ── Attempt Edge Function ─────────────────────────────────────────
        const { data: fnData, error: fnError } = await supabaseClient.functions.invoke<
          PublishResult
        >("publish-post", {
          body: { account },
        });

        if (!fnError && fnData) {
          console.log(
            `✅ [usePublishQueuedPosts] Edge Function published ${fnData.published} post(s)`
          );
          return fnData;
        }

        // ── Fallback: direct DB update ────────────────────────────────────
        if (fnError) {
          console.warn(
            `⚠️ [usePublishQueuedPosts] Edge Function unavailable (${fnError.message}). Using direct update fallback.`
          );
        }

        // Pick the oldest queued post for this account
        const { data: candidates, error: selectErr } = await supabaseClient
          .from("content_queue")
          .select("id, category, account, topic")
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
        const publishedAt = new Date().toISOString();
        const hourOfDay   = new Date().getHours();

        // Mark as published
        const { error: updateErr } = await supabaseClient
          .from("content_queue")
          .update({
            status:       "published",
            published_at: publishedAt,
          })
          .eq("id", post.id);

        if (updateErr) throw new Error(updateErr.message);

        // Insert initial metrics row (impressions/clicks start at 0;
        // your analytics pipeline or webhook will update them later)
        const { error: metricsErr } = await supabaseClient
          .from("post_metrics")
          .insert({
            queue_id:    post.id,
            category:    post.category as Category,
            account:     post.account as OfficialAccount,
            topic:       post.topic,
            impressions: 0,
            clicks:      0,
            wld_earned:  0,
            published_at: publishedAt,
            hour_of_day:  hourOfDay,
          });

        if (metricsErr) {
          // Non-fatal: metrics row can be created later
          console.warn(
            `⚠️ [usePublishQueuedPosts] Metrics insert failed: ${metricsErr.message}`
          );
        }

        console.log(
          `✅ [usePublishQueuedPosts] Published post ${post.id} via ${account}`
        );
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
