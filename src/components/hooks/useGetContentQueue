/**
 * 
 *
 * Fetches the current content queue (status = "queued") and
 * performance metrics for all published posts.
 *
 * Refreshes automatically every 60 seconds via polling.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../../supabaseClient";
import type { ContentQueueRow, PostMetricsRow } from "../lib/database.types";

export interface ContentQueueItem {
  id: string;
  category: ContentQueueRow["category"];
  account: ContentQueueRow["account"];
  topic: string;
  content: string;
  created_at: string;
  scheduled_at: string | null;
}

export interface PostMetrics {
  id: string;
  category: ContentQueueRow["category"];
  account: ContentQueueRow["account"];
  topic: string;
  impressions: number;
  clicks: number;
  wld_earned: number;
  created_at: number; // unix ms — aligned with AutonomousGrowthBrain expectations
  hour: number;       // 0–23
}

export interface UseGetContentQueueReturn {
  queue: ContentQueueItem[];
  metrics: PostMetrics[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const POLL_INTERVAL_MS = 60_000; // 60 seconds

export function useGetContentQueue(): UseGetContentQueueReturn {
  const [queue, setQueue]     = useState<ContentQueueItem[]>([]);
  const [metrics, setMetrics] = useState<PostMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch queued posts
      const { data: queueData, error: queueErr } = await supabaseClient
        .from("content_queue")
        .select("id, category, account, topic, content, created_at, scheduled_at")
        .eq("status", "queued")
        .order("created_at", { ascending: true });

      if (queueErr) throw new Error(queueErr.message);

      // Fetch performance metrics for published posts
      const { data: metricsData, error: metricsErr } = await supabaseClient
        .from("post_metrics")
        .select(
          "id, queue_id, category, account, topic, impressions, clicks, wld_earned, published_at, hour_of_day"
        )
        .order("published_at", { ascending: false })
        .limit(500);

      if (metricsErr) throw new Error(metricsErr.message);

      const mappedQueue: ContentQueueItem[] = (queueData ?? []).map(
        (row: ContentQueueRow) => ({
          id:           row.id,
          category:     row.category,
          account:      row.account,
          topic:        row.topic,
          content:      row.content,
          created_at:   row.created_at,
          scheduled_at: row.scheduled_at,
        })
      );

      const mappedMetrics: PostMetrics[] = (metricsData ?? []).map(
        (row: PostMetricsRow) => ({
          id:          row.id,
          category:    row.category,
          account:     row.account,
          topic:       row.topic,
          impressions: row.impressions,
          clicks:      row.clicks,
          wld_earned:  row.wld_earned,
          created_at:  new Date(row.published_at).getTime(),
          hour:        row.hour_of_day,
        })
      );

      setQueue(mappedQueue);
      setMetrics(mappedMetrics);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("❌ [useGetContentQueue] Fetch failed:", message);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAll();

    pollTimer.current = setInterval(() => {
      void fetchAll();
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, [fetchAll]);

  return { queue, metrics, isLoading, error, refetch: fetchAll };
}
