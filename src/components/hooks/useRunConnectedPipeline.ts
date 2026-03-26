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
import { supabaseClient } from "../lib/supabase";
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

const CONTENT_TEMPLATES: Record<Category, string[]> = {
  crypto_news: [
    "🚨 Breaking: {topic} — what this means for the market and how you can position yourself now.",
    "📰 Latest on {topic}. Here's the breakdown and what analysts are watching closely.",
    "💡 {topic} — the signal everyone in crypto missed this week.",
