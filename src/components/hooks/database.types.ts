export type Category =
  | "crypto_news"
  | "market_analysis"
  | "worldcoin_updates"
  | "trading_signals"
  | "tech"
  | "memecoins"
  | "world_news"
  | "sports"
  | "entertainment"
  | "lifestyle";

export type OfficialAccount =
  | "@news"
  | "@crypto"
  | "@trading"
  | "@memes"
  | "@builders"
  | "@sports"
  | "@entertainment"
  | "@world"
  | "@scanner";

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
