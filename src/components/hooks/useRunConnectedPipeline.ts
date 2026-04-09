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
        // ── 1. Intentar Edge Function para generar contenido AI ──
        let aiPosts: any[] | null = null;
        try {
          const { data: fnData, error: fnError } =
            await supabase.functions.invoke<any>("generate-posts", {
              body: { category, account, topic, count },
            });

          if (!fnError && fnData && fnData.posts) {
            aiPosts = fnData.posts;
          } else if (fnError) {
            console.warn(`⚠️ [Pipeline] Edge Function unavailable (${fnError.message}). Using fallback content.`);
          }
        } catch (fnErr: any) {
          console.warn(`⚠️ [Pipeline] Edge Function error (${fnErr?.message}). Using fallback content.`);
        }

        // ── 2. Construir filas (AI o fallback) ──────────────────
        const topics: string[] = [];
        const rows = Array.from({ length: count }, (_, i) => {
          const postTopic = i === 0 ? topic : `${topic} — angle ${i + 1}`;
          topics.push(postTopic);

          return {
            category,
            account,
            topic: postTopic,
            content: aiPosts?.[i]?.content ?? `📊 ${postTopic} — ${category} insight.`,
          };
        });

        // ── 3. Insertar via API (usa service_role, evita RLS) ───
        const res = await fetch("/api/queueContent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows }),
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Queue API failed");

        return {
          queued: data.queued ?? 0,
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
