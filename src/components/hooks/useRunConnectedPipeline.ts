/**
 * useRunConnectedPipeline
 *
 * Triggers the content generation pipeline via a Supabase Edge Function
 * ("generate-posts"). The function generates AI-crafted posts and inserts
 * them into the content_queue table with status = "queued".
 *
 * Falls back to a direct DB insert if the Edge Function is not deployed yet,
 * so the hook is usable during local development.
 */

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

// ─── Content templates (fallback when Edge Function not deployed) ─────────────
