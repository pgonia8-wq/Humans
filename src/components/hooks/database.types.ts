// database.types.ts
// Tipos compartidos entre AutonomousGrowthBrain y sus hooks.
// NO modificar sin actualizar AutonomousGrowthBrain.tsx también.

export type Category =
  | "crypto_news"
  | "market_analysis"
  | "worldcoin_updates"
  | "trading_signals"
  | "tech"
  | "memecoins";

export type OfficialAccount =
  | "@news"
  | "@crypto"
  | "@trading"
  | "@memes"
  | "@builders";

export interface ContentQueueRow {
  id: string;
  category: Category;
  account: OfficialAccount;
  topic: string;
  content: string;
  status: "queued" | "published" | "failed";
  published_at: string | null;
  scheduled_at: string | null;
  created_at: string;
}

export interface PostMetricsRow {
  id: string;
  category: Category;
  account: OfficialAccount;
  topic: string;
  impressions: number;
  clicks: number;
  wld_earned: number;
  published_at: string;
  hour_of_day: number;
  content_queue?: { content: string } | null;
}
