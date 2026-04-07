-- ============================================================================
-- H APP — SCHEMA COMPLETO UNIFICADO (SAFE FOR EXISTING DBs)
-- Ejecutar en: Supabase → SQL Editor → New Query
-- Fecha: 2026-04-07
--
-- SAFE: usa CREATE TABLE IF NOT EXISTS + ALTER TABLE ADD COLUMN IF NOT EXISTS
-- para que funcione tanto en DBs vacías como existentes.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. PROFILES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id                 TEXT        PRIMARY KEY,
  username           TEXT,
  bio                TEXT        DEFAULT '',
  avatar_url         TEXT,
  tier               TEXT        DEFAULT 'free',
  verified           BOOLEAN     DEFAULT FALSE,
  verification_level TEXT,
  nullifier_hash     TEXT,
  orb_verified_at    TIMESTAMPTZ,
  wallet_address     TEXT,
  wallet_verified    BOOLEAN     DEFAULT FALSE,
  wallet_verified_at TIMESTAMPTZ,
  reputation_score   INTEGER     DEFAULT 0,
  name               TEXT,
  country            TEXT,
  state              TEXT,
  city               TEXT,
  country_selected_at TIMESTAMPTZ,
  birth_date         TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_level TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nullifier_hash TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS orb_verified_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS wallet_address TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS wallet_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS wallet_verified_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS reputation_score INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS country_selected_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birth_date TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'free';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. POSTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS posts (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id       TEXT        REFERENCES profiles(id) ON DELETE CASCADE,
  content         TEXT        NOT NULL DEFAULT '',
  image_url       TEXT,
  likes           INTEGER     DEFAULT 0,
  views           INTEGER     DEFAULT 0,
  score           DOUBLE PRECISION DEFAULT 0,
  is_ad           BOOLEAN     DEFAULT FALSE,
  ad_budget       DOUBLE PRECISION DEFAULT 0,
  ad_impressions  INTEGER     DEFAULT 0,
  ad_clicks       INTEGER     DEFAULT 0,
  language        TEXT        DEFAULT 'es',
  visibility_score DOUBLE PRECISION DEFAULT 1,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE posts ADD COLUMN IF NOT EXISTS author_id TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS content TEXT DEFAULT '';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS likes INTEGER DEFAULT 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS score DOUBLE PRECISION DEFAULT 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_ad BOOLEAN DEFAULT FALSE;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS ad_budget DOUBLE PRECISION DEFAULT 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS ad_impressions INTEGER DEFAULT 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS ad_clicks INTEGER DEFAULT 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'es';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS visibility_score DOUBLE PRECISION DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_posts_author  ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_score   ON posts(score DESC);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. COMMENTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comments (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID        REFERENCES posts(id) ON DELETE CASCADE,
  user_id    TEXT        REFERENCES profiles(id) ON DELETE CASCADE,
  content    TEXT        NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE comments ADD COLUMN IF NOT EXISTS post_id UUID;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS content TEXT DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. LIKES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS likes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID        REFERENCES posts(id) ON DELETE CASCADE,
  user_id    TEXT        REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_likes_post ON likes(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_user ON likes(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. FOLLOWS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS follows (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id  TEXT        REFERENCES profiles(id) ON DELETE CASCADE,
  following_id TEXT        REFERENCES profiles(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower  ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. BLOCKS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blocks (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id  TEXT        REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id  TEXT        REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. REPORTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id TEXT        REFERENCES profiles(id) ON DELETE CASCADE,
  post_id     UUID        REFERENCES posts(id) ON DELETE CASCADE,
  user_id     TEXT        REFERENCES profiles(id) ON DELETE CASCADE,
  reason      TEXT        DEFAULT '',
  status      TEXT        DEFAULT 'pending',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. NOTIFICATIONS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT        REFERENCES profiles(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL DEFAULT 'general',
  message     TEXT        NOT NULL DEFAULT '',
  read        BOOLEAN     DEFAULT FALSE,
  metadata    JSONB       DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_notifications_user    ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. MESSAGES (DMs)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id       TEXT        REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id     TEXT        REFERENCES profiles(id) ON DELETE CASCADE,
  content         TEXT        NOT NULL DEFAULT '',
  attachment_url  TEXT,
  attachment_type TEXT,
  read            BOOLEAN     DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_type TEXT;

CREATE INDEX IF NOT EXISTS idx_messages_sender   ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);

CREATE TABLE IF NOT EXISTS dm_messages (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id TEXT        NOT NULL,
  sender_id       TEXT        NOT NULL,
  content         TEXT        NOT NULL DEFAULT '',
  attachment_url  TEXT,
  read            BOOLEAN     DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE dm_messages ADD COLUMN IF NOT EXISTS attachment_url TEXT;

CREATE INDEX IF NOT EXISTS idx_dm_messages_convo ON dm_messages(conversation_id);

CREATE TABLE IF NOT EXISTS conversation_unread_counts (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id TEXT        NOT NULL,
  user_id         TEXT        NOT NULL,
  unread_count    INTEGER     DEFAULT 0,
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. CHAT ROOMS & GLOBAL CHAT
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_rooms (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL DEFAULT '',
  creator_id  TEXT        NOT NULL,
  type        TEXT        DEFAULT 'public',
  tier        TEXT        DEFAULT 'free',
  max_members INTEGER     DEFAULT 100,
  is_active   BOOLEAN     DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'free';
ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS max_members INTEGER DEFAULT 100;
ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS global_chat_messages (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     UUID        REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id     TEXT        NOT NULL,
  username    TEXT        DEFAULT 'anon',
  avatar_url  TEXT,
  content     TEXT        NOT NULL DEFAULT '',
  type        TEXT        DEFAULT 'text',
  reply_to    UUID,
  metadata    JSONB       DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE global_chat_messages ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE global_chat_messages ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'text';
ALTER TABLE global_chat_messages ADD COLUMN IF NOT EXISTS reply_to UUID;
ALTER TABLE global_chat_messages ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_global_chat_room    ON global_chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_global_chat_created ON global_chat_messages(created_at DESC);

CREATE TABLE IF NOT EXISTS room_credits (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    TEXT        NOT NULL,
  room_id    UUID        REFERENCES chat_rooms(id) ON DELETE CASCADE,
  credits    INTEGER     DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, room_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. SUBSCRIPTIONS & UPGRADES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         TEXT        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type            TEXT        NOT NULL DEFAULT 'premium_chat',
  status          TEXT        DEFAULT 'active',
  transaction_id  TEXT,
  nullifier_hash  TEXT,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS nullifier_hash TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);

CREATE TABLE IF NOT EXISTS upgrades (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         TEXT        NOT NULL,
  type            TEXT        NOT NULL DEFAULT '',
  transaction_id  TEXT        UNIQUE,
  status          TEXT        DEFAULT 'pending',
  amount_wld      DOUBLE PRECISION DEFAULT 0,
  verified_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE upgrades ADD COLUMN IF NOT EXISTS amount_wld DOUBLE PRECISION DEFAULT 0;
ALTER TABLE upgrades ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_upgrades_user ON upgrades(user_id);
CREATE INDEX IF NOT EXISTS idx_upgrades_tx   ON upgrades(transaction_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 12. USER BALANCES & FINANCIAL
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_balances (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    TEXT        NOT NULL UNIQUE,
  wld        DOUBLE PRECISION DEFAULT 0,
  usdc       DOUBLE PRECISION DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS balances (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    TEXT        NOT NULL,
  currency   TEXT        NOT NULL DEFAULT 'WLD',
  amount     DOUBLE PRECISION DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, currency)
);

CREATE TABLE IF NOT EXISTS withdrawals (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         TEXT        NOT NULL,
  amount          DOUBLE PRECISION NOT NULL DEFAULT 0,
  currency        TEXT        DEFAULT 'WLD',
  wallet_address  TEXT        NOT NULL DEFAULT '',
  transaction_id  TEXT,
  status          TEXT        DEFAULT 'pending',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_tokens (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT        NOT NULL,
  wld_balance DOUBLE PRECISION DEFAULT 0,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_reputation (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    TEXT        NOT NULL UNIQUE,
  score      INTEGER     DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS referral_tokens (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id  TEXT        NOT NULL,
  referee_id   TEXT,
  code         TEXT        NOT NULL UNIQUE,
  redeemed     BOOLEAN     DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 13. CONTENT & METRICS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS content_queue (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  account      TEXT        NOT NULL DEFAULT '',
  category     TEXT,
  topic        TEXT,
  content      TEXT        NOT NULL DEFAULT '',
  image_url    TEXT,
  status       TEXT        DEFAULT 'queued',
  published_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE content_queue ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE content_queue ADD COLUMN IF NOT EXISTS topic TEXT;
ALTER TABLE content_queue ADD COLUMN IF NOT EXISTS content TEXT DEFAULT '';

CREATE TABLE IF NOT EXISTS post_metrics (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID,
  queue_id    UUID,
  impressions INTEGER     DEFAULT 0,
  clicks      INTEGER     DEFAULT 0,
  likes       INTEGER     DEFAULT 0,
  shares      INTEGER     DEFAULT 0,
  category    TEXT,
  account     TEXT,
  hour_of_day INTEGER,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE post_metrics ADD COLUMN IF NOT EXISTS queue_id UUID;
ALTER TABLE post_metrics ADD COLUMN IF NOT EXISTS likes INTEGER DEFAULT 0;
ALTER TABLE post_metrics ADD COLUMN IF NOT EXISTS shares INTEGER DEFAULT 0;
ALTER TABLE post_metrics ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE post_metrics ADD COLUMN IF NOT EXISTS account TEXT;
ALTER TABLE post_metrics ADD COLUMN IF NOT EXISTS hour_of_day INTEGER;

CREATE TABLE IF NOT EXISTS trends_cache (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  key        TEXT        NOT NULL UNIQUE,
  data       JSONB       DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 14. TOKENS (bonding curve platform)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tokens (
  id                 TEXT PRIMARY KEY,
  name               TEXT NOT NULL DEFAULT '',
  symbol             TEXT NOT NULL DEFAULT '',
  emoji              TEXT DEFAULT '🌟',
  creator_id         TEXT NOT NULL DEFAULT '',
  creator_name       TEXT DEFAULT 'anon',
  price_wld          DOUBLE PRECISION DEFAULT 0.0000005,
  price_usdc         DOUBLE PRECISION DEFAULT 0.0000015,
  market_cap         DOUBLE PRECISION DEFAULT 0,
  holders            INTEGER DEFAULT 0,
  curve_percent      DOUBLE PRECISION DEFAULT 0,
  change_24h         DOUBLE PRECISION DEFAULT 0,
  volume_24h         DOUBLE PRECISION DEFAULT 0,
  total_supply       BIGINT DEFAULT 100000000,
  circulating_supply BIGINT DEFAULT 0,
  locked_supply      BIGINT DEFAULT 0,
  burned_supply      BIGINT DEFAULT 0,
  lock_duration_days INTEGER DEFAULT 0,
  description        TEXT DEFAULT '',
  is_trending        BOOLEAN DEFAULT FALSE,
  tags               JSONB DEFAULT '["New"]'::JSONB,
  buy_pressure       INTEGER DEFAULT 50,
  avatar_url         TEXT,
  total_wld_in_curve DOUBLE PRECISION DEFAULT 0,
  treasury_balance   DOUBLE PRECISION DEFAULT 0,
  graduated          BOOLEAN DEFAULT FALSE,
  graduated_at       TIMESTAMPTZ,
  graduation_pool_wld     DOUBLE PRECISION DEFAULT 0,
  graduation_treasury_wld DOUBLE PRECISION DEFAULT 0,
  contract_address   TEXT,
  socials            JSONB,
  creation_fee_wld   DOUBLE PRECISION DEFAULT 5,
  creation_fee_tx    TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tokens ADD COLUMN IF NOT EXISTS emoji TEXT DEFAULT '🌟';
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS creator_name TEXT DEFAULT 'anon';
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS locked_supply BIGINT DEFAULT 0;
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS burned_supply BIGINT DEFAULT 0;
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS lock_duration_days INTEGER DEFAULT 0;
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS is_trending BOOLEAN DEFAULT FALSE;
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '["New"]'::JSONB;
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS buy_pressure INTEGER DEFAULT 50;
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS total_wld_in_curve DOUBLE PRECISION DEFAULT 0;
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS treasury_balance DOUBLE PRECISION DEFAULT 0;
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS graduated BOOLEAN DEFAULT FALSE;
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS graduated_at TIMESTAMPTZ;
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS graduation_pool_wld DOUBLE PRECISION DEFAULT 0;
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS graduation_treasury_wld DOUBLE PRECISION DEFAULT 0;
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS contract_address TEXT;
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS socials JSONB;
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS creation_fee_wld DOUBLE PRECISION DEFAULT 5;
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS creation_fee_tx TEXT;

CREATE INDEX IF NOT EXISTS idx_tokens_creator   ON tokens(creator_id);
CREATE INDEX IF NOT EXISTS idx_tokens_symbol    ON tokens(symbol);
CREATE INDEX IF NOT EXISTS idx_tokens_trending  ON tokens(is_trending) WHERE is_trending = TRUE;
CREATE INDEX IF NOT EXISTS idx_tokens_graduated ON tokens(graduated);
CREATE INDEX IF NOT EXISTS idx_tokens_created   ON tokens(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tokens_marketcap ON tokens(market_cap DESC);
CREATE INDEX IF NOT EXISTS idx_tokens_volume    ON tokens(volume_24h DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 15. HOLDINGS — user token balances
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS holdings (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       TEXT NOT NULL,
  token_id      TEXT NOT NULL REFERENCES tokens(id) ON DELETE CASCADE,
  token_name    TEXT,
  token_symbol  TEXT,
  token_emoji   TEXT DEFAULT '🌟',
  amount        BIGINT DEFAULT 0,
  avg_buy_price DOUBLE PRECISION DEFAULT 0,
  current_price DOUBLE PRECISION DEFAULT 0,
  value         DOUBLE PRECISION DEFAULT 0,
  pnl           DOUBLE PRECISION DEFAULT 0,
  pnl_percent   DOUBLE PRECISION DEFAULT 0,
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, token_id)
);

ALTER TABLE holdings ADD COLUMN IF NOT EXISTS token_name TEXT;
ALTER TABLE holdings ADD COLUMN IF NOT EXISTS token_symbol TEXT;
ALTER TABLE holdings ADD COLUMN IF NOT EXISTS token_emoji TEXT DEFAULT '🌟';
ALTER TABLE holdings ADD COLUMN IF NOT EXISTS avg_buy_price DOUBLE PRECISION DEFAULT 0;
ALTER TABLE holdings ADD COLUMN IF NOT EXISTS current_price DOUBLE PRECISION DEFAULT 0;
ALTER TABLE holdings ADD COLUMN IF NOT EXISTS value DOUBLE PRECISION DEFAULT 0;
ALTER TABLE holdings ADD COLUMN IF NOT EXISTS pnl DOUBLE PRECISION DEFAULT 0;
ALTER TABLE holdings ADD COLUMN IF NOT EXISTS pnl_percent DOUBLE PRECISION DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_holdings_user  ON holdings(user_id);
CREATE INDEX IF NOT EXISTS idx_holdings_token ON holdings(token_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 16. TOKEN_ACTIVITY
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS token_activity (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type         TEXT NOT NULL DEFAULT 'buy',
  user_id      TEXT NOT NULL DEFAULT '',
  username     TEXT DEFAULT 'anon',
  token_id     TEXT NOT NULL DEFAULT '',
  token_symbol TEXT,
  amount       DOUBLE PRECISION DEFAULT 0,
  price        DOUBLE PRECISION,
  total        DOUBLE PRECISION,
  timestamp    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE token_activity ADD COLUMN IF NOT EXISTS token_symbol TEXT;
ALTER TABLE token_activity ADD COLUMN IF NOT EXISTS username TEXT DEFAULT 'anon';

CREATE INDEX IF NOT EXISTS idx_activity_token     ON token_activity(token_id);
CREATE INDEX IF NOT EXISTS idx_activity_user      ON token_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_timestamp ON token_activity(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_activity_type      ON token_activity(type);

-- ─────────────────────────────────────────────────────────────────────────────
-- 17. AIRDROPS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS airdrops (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token_id         TEXT NOT NULL,
  token_name       TEXT,
  token_symbol     TEXT,
  token_emoji      TEXT DEFAULT '🌟',
  title            TEXT NOT NULL DEFAULT '',
  description      TEXT DEFAULT '',
  total_amount     BIGINT DEFAULT 0,
  claimed_amount   BIGINT DEFAULT 0,
  daily_amount     BIGINT DEFAULT 0,
  participants     INTEGER DEFAULT 0,
  max_participants INTEGER DEFAULT 1000,
  end_date         TIMESTAMPTZ,
  is_active        BOOLEAN DEFAULT TRUE,
  cooldown_hours   INTEGER DEFAULT 24,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE airdrops ADD COLUMN IF NOT EXISTS token_name TEXT;
ALTER TABLE airdrops ADD COLUMN IF NOT EXISTS token_symbol TEXT;
ALTER TABLE airdrops ADD COLUMN IF NOT EXISTS token_emoji TEXT DEFAULT '🌟';
ALTER TABLE airdrops ADD COLUMN IF NOT EXISTS daily_amount BIGINT DEFAULT 0;
ALTER TABLE airdrops ADD COLUMN IF NOT EXISTS cooldown_hours INTEGER DEFAULT 24;

CREATE INDEX IF NOT EXISTS idx_airdrops_token  ON airdrops(token_id);
CREATE INDEX IF NOT EXISTS idx_airdrops_active ON airdrops(is_active) WHERE is_active = TRUE;

-- ─────────────────────────────────────────────────────────────────────────────
-- 18. AIRDROP_CLAIMS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS airdrop_claims (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  airdrop_id UUID REFERENCES airdrops(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL DEFAULT '',
  amount     BIGINT DEFAULT 0,
  claimed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_claims_airdrop_user ON airdrop_claims(airdrop_id, user_id);
CREATE INDEX IF NOT EXISTS idx_claims_airdrop      ON airdrop_claims(airdrop_id);
CREATE INDEX IF NOT EXISTS idx_claims_user          ON airdrop_claims(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 19. AIRDROP_POOLS & AIRDROP_LINKS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS airdrop_pools (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id    TEXT NOT NULL DEFAULT '',
  token_id      TEXT NOT NULL,
  total_tokens  BIGINT DEFAULT 0,
  remaining     BIGINT DEFAULT 0,
  cost_wld      DOUBLE PRECISION DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_airdrop_pools_creator ON airdrop_pools(creator_id);

CREATE TABLE IF NOT EXISTS airdrop_links (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pool_id     UUID REFERENCES airdrop_pools(id) ON DELETE CASCADE,
  creator_id  TEXT NOT NULL DEFAULT '',
  token_id    TEXT NOT NULL DEFAULT '',
  code        TEXT NOT NULL UNIQUE,
  amount      BIGINT DEFAULT 0,
  max_claims  INTEGER DEFAULT 1,
  claims      INTEGER DEFAULT 0,
  is_active   BOOLEAN DEFAULT TRUE,
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE airdrop_links ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_airdrop_links_code    ON airdrop_links(code);
CREATE INDEX IF NOT EXISTS idx_airdrop_links_creator ON airdrop_links(creator_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 20. TOKEN_PAYMENTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS token_payments (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id TEXT NOT NULL UNIQUE,
  user_id        TEXT NOT NULL DEFAULT '',
  action         TEXT NOT NULL DEFAULT '',
  status         TEXT DEFAULT 'accepted',
  verified_at    TIMESTAMPTZ DEFAULT NOW(),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_tx   ON token_payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payments_user ON token_payments(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 21. PAYMENT_ORDERS & LEDGER
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payment_orders (
  id               TEXT PRIMARY KEY DEFAULT 'ord_' || substr(md5(random()::text), 1, 12),
  user_id          TEXT NOT NULL DEFAULT '',
  username         TEXT NOT NULL DEFAULT 'anon',
  token_id         TEXT NOT NULL DEFAULT '',
  token_symbol     TEXT NOT NULL DEFAULT '',
  amount_wld       NUMERIC NOT NULL DEFAULT 0,
  estimated_tokens NUMERIC NOT NULL DEFAULT 0,
  spot_price       NUMERIC NOT NULL DEFAULT 0,
  reference        TEXT UNIQUE NOT NULL,
  transaction_id   TEXT,
  status           TEXT NOT NULL DEFAULT 'pending',
  type             TEXT NOT NULL DEFAULT 'buy',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  completed_at     TIMESTAMPTZ,
  error_message    TEXT
);

ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS token_symbol TEXT NOT NULL DEFAULT '';
ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS estimated_tokens NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS spot_price NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS error_message TEXT;

CREATE INDEX IF NOT EXISTS idx_payment_orders_user      ON payment_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_status    ON payment_orders(status);
CREATE INDEX IF NOT EXISTS idx_payment_orders_reference ON payment_orders(reference);

CREATE TABLE IF NOT EXISTS ledger (
  id           TEXT PRIMARY KEY DEFAULT 'tk_' || substr(md5(random()::text), 1, 14),
  order_id     TEXT REFERENCES payment_orders(id),
  type         TEXT NOT NULL DEFAULT '',
  user_id      TEXT NOT NULL DEFAULT '',
  username     TEXT NOT NULL DEFAULT 'anon',
  token_id     TEXT,
  token_symbol TEXT DEFAULT '',
  amount_wld   NUMERIC NOT NULL DEFAULT 0,
  direction    TEXT NOT NULL DEFAULT '',
  description  TEXT NOT NULL DEFAULT '',
  metadata     JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ledger ADD COLUMN IF NOT EXISTS token_symbol TEXT DEFAULT '';
ALTER TABLE ledger ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_ledger_order   ON ledger(order_id);
CREATE INDEX IF NOT EXISTS idx_ledger_user    ON ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_ledger_token   ON ledger(token_id);
CREATE INDEX IF NOT EXISTS idx_ledger_type    ON ledger(type);
CREATE INDEX IF NOT EXISTS idx_ledger_created ON ledger(created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 22. PRICE_SNAPSHOTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS price_snapshots (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token_id   TEXT NOT NULL,
  price_wld  DOUBLE PRECISION NOT NULL DEFAULT 0,
  price_usdc DOUBLE PRECISION NOT NULL DEFAULT 0,
  supply     BIGINT DEFAULT 0,
  volume     DOUBLE PRECISION DEFAULT 0,
  type       TEXT DEFAULT 'trade',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE price_snapshots ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'trade';
ALTER TABLE price_snapshots ADD COLUMN IF NOT EXISTS volume DOUBLE PRECISION DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_snapshots_token ON price_snapshots(token_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_time  ON price_snapshots(token_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 23. RPC FUNCTIONS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION increment_holders(tid TEXT)
RETURNS void AS $$
BEGIN
  UPDATE tokens SET holders = holders + 1 WHERE id = tid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_holders(tid TEXT)
RETURNS void AS $$
BEGIN
  UPDATE tokens SET holders = GREATEST(holders - 1, 0) WHERE id = tid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_24h_change(tid TEXT)
RETURNS void AS $$
DECLARE
  old_price DOUBLE PRECISION;
  new_price DOUBLE PRECISION;
  pct       DOUBLE PRECISION;
BEGIN
  SELECT price_wld INTO old_price
  FROM price_snapshots
  WHERE token_id = tid AND created_at <= (NOW() - INTERVAL '24 hours')
  ORDER BY created_at DESC LIMIT 1;

  SELECT price_wld INTO new_price FROM tokens WHERE id = tid;

  IF old_price IS NOT NULL AND old_price > 0 THEN
    pct := ((new_price - old_price) / old_price) * 100;
  ELSE
    pct := 0;
  END IF;

  UPDATE tokens SET change_24h = pct WHERE id = tid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_buy_pressure(tid TEXT)
RETURNS void AS $$
DECLARE
  total_txns INTEGER;
  buy_txns   INTEGER;
  pressure   INTEGER;
BEGIN
  SELECT count(*) INTO total_txns
  FROM token_activity
  WHERE token_id = tid AND timestamp > (NOW() - INTERVAL '24 hours');

  SELECT count(*) INTO buy_txns
  FROM token_activity
  WHERE token_id = tid AND type = 'buy' AND timestamp > (NOW() - INTERVAL '24 hours');

  IF total_txns > 0 THEN
    pressure := ROUND((buy_txns::NUMERIC / total_txns::NUMERIC) * 100);
  ELSE
    pressure := 50;
  END IF;

  UPDATE tokens SET buy_pressure = pressure WHERE id = tid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_ad_impression(pid UUID)
RETURNS void AS $$
BEGIN
  UPDATE posts SET ad_impressions = COALESCE(ad_impressions, 0) + 1 WHERE id = pid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_post_views(pid UUID)
RETURNS void AS $$
BEGIN
  UPDATE posts SET views = COALESCE(views, 0) + 1 WHERE id = pid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────────────────────
-- 24. ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts                ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments             ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes                ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows              ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks               ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports              ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages             ENABLE ROW LEVEL SECURITY;
ALTER TABLE dm_messages          ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms           ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_credits         ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE upgrades             ENABLE ROW LEVEL SECURITY;
ALTER TABLE tokens               ENABLE ROW LEVEL SECURITY;
ALTER TABLE holdings             ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_activity       ENABLE ROW LEVEL SECURITY;
ALTER TABLE airdrops             ENABLE ROW LEVEL SECURITY;
ALTER TABLE airdrop_claims       ENABLE ROW LEVEL SECURITY;
ALTER TABLE airdrop_pools        ENABLE ROW LEVEL SECURITY;
ALTER TABLE airdrop_links        ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_payments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_orders       ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger               ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_snapshots      ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'profiles_read_all') THEN
    CREATE POLICY profiles_read_all ON profiles FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'profiles_insert') THEN
    CREATE POLICY profiles_insert ON profiles FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'profiles_update') THEN
    CREATE POLICY profiles_update ON profiles FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'posts_read_all') THEN
    CREATE POLICY posts_read_all ON posts FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'posts_insert') THEN
    CREATE POLICY posts_insert ON posts FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'posts_update') THEN
    CREATE POLICY posts_update ON posts FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'comments_read_all') THEN
    CREATE POLICY comments_read_all ON comments FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'comments_insert') THEN
    CREATE POLICY comments_insert ON comments FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'likes_read_all') THEN
    CREATE POLICY likes_read_all ON likes FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'likes_insert') THEN
    CREATE POLICY likes_insert ON likes FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'likes_delete') THEN
    CREATE POLICY likes_delete ON likes FOR DELETE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'follows_read_all') THEN
    CREATE POLICY follows_read_all ON follows FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'follows_insert') THEN
    CREATE POLICY follows_insert ON follows FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'follows_delete') THEN
    CREATE POLICY follows_delete ON follows FOR DELETE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'blocks_insert') THEN
    CREATE POLICY blocks_insert ON blocks FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'reports_insert') THEN
    CREATE POLICY reports_insert ON reports FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'notifications_read_all') THEN
    CREATE POLICY notifications_read_all ON notifications FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'messages_read_all') THEN
    CREATE POLICY messages_read_all ON messages FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'messages_insert') THEN
    CREATE POLICY messages_insert ON messages FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'dm_messages_read_all') THEN
    CREATE POLICY dm_messages_read_all ON dm_messages FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'dm_messages_insert') THEN
    CREATE POLICY dm_messages_insert ON dm_messages FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'chat_rooms_read_all') THEN
    CREATE POLICY chat_rooms_read_all ON chat_rooms FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'chat_rooms_insert') THEN
    CREATE POLICY chat_rooms_insert ON chat_rooms FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'global_chat_read_all') THEN
    CREATE POLICY global_chat_read_all ON global_chat_messages FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'global_chat_insert') THEN
    CREATE POLICY global_chat_insert ON global_chat_messages FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tokens_read_all') THEN
    CREATE POLICY tokens_read_all ON tokens FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tokens_insert') THEN
    CREATE POLICY tokens_insert ON tokens FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tokens_update') THEN
    CREATE POLICY tokens_update ON tokens FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'holdings_read_all') THEN
    CREATE POLICY holdings_read_all ON holdings FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'holdings_insert') THEN
    CREATE POLICY holdings_insert ON holdings FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'holdings_update') THEN
    CREATE POLICY holdings_update ON holdings FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'holdings_delete') THEN
    CREATE POLICY holdings_delete ON holdings FOR DELETE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'activity_read_all') THEN
    CREATE POLICY activity_read_all ON token_activity FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'activity_insert') THEN
    CREATE POLICY activity_insert ON token_activity FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'airdrops_read_all') THEN
    CREATE POLICY airdrops_read_all ON airdrops FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'airdrops_insert') THEN
    CREATE POLICY airdrops_insert ON airdrops FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'airdrops_update') THEN
    CREATE POLICY airdrops_update ON airdrops FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'claims_read_all') THEN
    CREATE POLICY claims_read_all ON airdrop_claims FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'claims_insert') THEN
    CREATE POLICY claims_insert ON airdrop_claims FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'payments_read_all') THEN
    CREATE POLICY payments_read_all ON token_payments FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'payments_insert') THEN
    CREATE POLICY payments_insert ON token_payments FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'orders_read_all') THEN
    CREATE POLICY orders_read_all ON payment_orders FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'orders_insert') THEN
    CREATE POLICY orders_insert ON payment_orders FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'orders_update') THEN
    CREATE POLICY orders_update ON payment_orders FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ledger_read_all') THEN
    CREATE POLICY ledger_read_all ON ledger FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ledger_insert') THEN
    CREATE POLICY ledger_insert ON ledger FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'snapshots_read_all') THEN
    CREATE POLICY snapshots_read_all ON price_snapshots FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'snapshots_insert') THEN
    CREATE POLICY snapshots_insert ON price_snapshots FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'airdrop_pools_read_all') THEN
    CREATE POLICY airdrop_pools_read_all ON airdrop_pools FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'airdrop_pools_insert') THEN
    CREATE POLICY airdrop_pools_insert ON airdrop_pools FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'airdrop_pools_update') THEN
    CREATE POLICY airdrop_pools_update ON airdrop_pools FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'airdrop_links_read_all') THEN
    CREATE POLICY airdrop_links_read_all ON airdrop_links FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'airdrop_links_insert') THEN
    CREATE POLICY airdrop_links_insert ON airdrop_links FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'airdrop_links_update') THEN
    CREATE POLICY airdrop_links_update ON airdrop_links FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'room_credits_read_all') THEN
    CREATE POLICY room_credits_read_all ON room_credits FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'room_credits_insert') THEN
    CREATE POLICY room_credits_insert ON room_credits FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'room_credits_update') THEN
    CREATE POLICY room_credits_update ON room_credits FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'subscriptions_read_all') THEN
    CREATE POLICY subscriptions_read_all ON subscriptions FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'subscriptions_insert') THEN
    CREATE POLICY subscriptions_insert ON subscriptions FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'upgrades_read_all') THEN
    CREATE POLICY upgrades_read_all ON upgrades FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'upgrades_insert') THEN
    CREATE POLICY upgrades_insert ON upgrades FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'content_queue_read_all') THEN
    CREATE POLICY content_queue_read_all ON content_queue FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'content_queue_insert') THEN
    CREATE POLICY content_queue_insert ON content_queue FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'content_queue_update') THEN
    CREATE POLICY content_queue_update ON content_queue FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'content_queue_delete') THEN
    CREATE POLICY content_queue_delete ON content_queue FOR DELETE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'post_metrics_read_all') THEN
    CREATE POLICY post_metrics_read_all ON post_metrics FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'post_metrics_insert') THEN
    CREATE POLICY post_metrics_insert ON post_metrics FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'withdrawals_read_all') THEN
    CREATE POLICY withdrawals_read_all ON withdrawals FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'withdrawals_insert') THEN
    CREATE POLICY withdrawals_insert ON withdrawals FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'conversation_unread_read') THEN
    CREATE POLICY conversation_unread_read ON conversation_unread_counts FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'conversation_unread_insert') THEN
    CREATE POLICY conversation_unread_insert ON conversation_unread_counts FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'conversation_unread_update') THEN
    CREATE POLICY conversation_unread_update ON conversation_unread_counts FOR UPDATE USING (true);
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 25. ENABLE RLS ON REMAINING TABLES
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE content_queue           ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_metrics            ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_balances           ENABLE ROW LEVEL SECURITY;
ALTER TABLE balances                ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals             ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tokens             ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reputation         ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_tokens         ENABLE ROW LEVEL SECURITY;
ALTER TABLE trends_cache            ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_unread_counts ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- DONE. All tables, columns, indexes, RPC functions, RLS + write policies.
-- Safe to run multiple times on existing databases.
-- ============================================================================
