import { useState, useCallback } from "react";
import { supabase } from "../../supabaseClient";
import type { Category, OfficialAccount } from "../lib/database.types";

export interface RunPipelineParams {
  category: Category;
  account: OfficialAccount;
  topic: string;
  count: number;
}

export interface RunPipelineResult {
  queued: number;
  topics: string[];
}

export interface UseRunConnectedPipelineReturn {
  run: (params: RunPipelineParams) => Promise<RunPipelineResult>;
  isLoading: boolean;
  error: string | null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useRunConnectedPipeline(): UseRunConnectedPipelineReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (params: RunPipelineParams): Promise<RunPipelineResult> => {
      const { category, account, topic, count } = params;

      setIsLoading(true);
      setError(null);

      try {
        // ── 1. Llamar Edge Function ─────────────────────────────
        const { data: fnData, error: fnError } =
          await supabase.functions.invoke<any>("generate-posts", {
            body: { category, account, topic, count },
          });

        // ── 2. SI responde bien → insertar en DB SIEMPRE ────────
        if (!fnError && fnData && fnData.posts) {
          const rows = fnData.posts.map((p: any, i: number) => ({
            category,
            account,
            topic: i === 0 ? topic : `${topic} — angle ${i + 1}`,
            content: p.content,
            status: "queued" as const,
            published_at: null,
            scheduled_at: null,
          }));

          const { error: insertErr } = await supabase
            .from("content_queue")
            .insert(rows);

          if (insertErr) {
            console.error("❌ Insert failed after AI:", insertErr.message);
            throw insertErr;
          }

          return {
            queued: rows.length,
            topics: rows.map((r) => r.topic),
          };
        }

        // ── 3. Fallback si falla Edge Function ──────────────────
        if (fnError) {
          console.warn(
            `⚠️ [Pipeline] Edge Function failed (${fnError.message}). Using fallback.`
          );
        }

        const topics: string[] = [];

        const rows = Array.from({ length: count }, (_, i) => {
          const postTopic = i === 0 ? topic : `${topic} — angle ${i + 1}`;
          topics.push(postTopic);

          return {
            category,
            account,
            topic: postTopic,
            content: `[Fallback] ${postTopic} — ${category} insight.`,
            status: "queued" as const,
            published_at: null,
            scheduled_at: null,
          };
        });

        const { data: inserted, error: insertErr } = await supabase
          .from("content_queue")
          .insert(rows)
          .select("id");

        if (insertErr) throw new Error(insertErr.message);

        return {
          queued: inserted?.length ?? 0,
          topics,
        };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unknown pipeline error";

        console.error("❌ [Pipeline] Error:", message);
        setError(message);

        return { queued: 0, topics: [] };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { run, isLoading, error };
}
