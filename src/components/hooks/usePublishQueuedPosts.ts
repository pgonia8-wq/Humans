/**
 * usePublishQueuedPosts
 */

import { useState, useCallback } from "react";
import type { OfficialAccount } from "../lib/database.types";

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

export function usePublishQueuedPosts(): UsePublishQueuedPostsReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const publish = useCallback(
    async (params: PublishParams): Promise<PublishResult> => {
      const { account } = params;

      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/publishQueuedPost", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ account }),
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Publish API failed");
        }

        return { published: data.published ?? 0 };

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
