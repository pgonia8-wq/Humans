-- ============================================================================
-- H APP — SCHEMA COMPLETO UNIFICADO (100% IDEMPOTENTE)
-- Ejecutar en: Supabase → SQL Editor → New Query
-- Fecha: 2026-04-07
--
-- Cada tabla: CREATE TABLE IF NOT EXISTS + ALTER TABLE ADD COLUMN IF NOT EXISTS
-- para TODAS las columnas. Seguro para correr multiples veces.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. PROFILES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY
);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'free';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE;
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
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. POSTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
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
ALTER TABLE posts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_posts_author  ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_score   ON posts(score DESC);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. COMMENTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE comments ADD COLUMN IF NOT EXISTS post_id UUID;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS content TEXT DEFAULT '';
ALTER TABLE comments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. LIKES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE likes ADD COLUMN IF NOT EXISTS post_id UUID;
ALTER TABLE likes ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE likes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_likes_post ON likes(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_user ON likes(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. FOLLOWS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE follows ADD COLUMN IF NOT EXISTS follower_id TEXT;
ALTER TABLE follows ADD COLUMN IF NOT EXISTS following_id TEXT;
ALTER TABLE follows ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_follows_follower  ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. BLOCKS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE blocks ADD COLUMN IF NOT EXISTS blocker_id TEXT;
ALTER TABLE blocks ADD COLUMN IF NOT EXISTS blocked_id TEXT;
ALTER TABLE blocks ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. REPORTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE reports ADD COLUMN IF NOT EXISTS reporter_id TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS post_id UUID;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS reason TEXT DEFAULT '';
ALTER TABLE reports ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE reports ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. NOTIFICATIONS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'general';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS message TEXT DEFAULT '';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT FALSE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_notifications_user    ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. MESSAGES (DMs)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_id TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS receiver_id TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS content TEXT DEFAULT '';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_type TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_messages_sender   ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);

CREATE TABLE IF NOT EXISTS dm_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE dm_messages ADD COLUMN IF NOT EXISTS conversation_id TEXT;
ALTER TABLE dm_messages ADD COLUMN IF NOT EXISTS sender_id TEXT;
ALTER TABLE dm_messages ADD COLUMN IF NOT EXISTS content TEXT DEFAULT '';
ALTER TABLE dm_messages ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE dm_messages ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT FALSE;
ALTER TABLE dm_messages ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_dm_messages_convo ON dm_messages(conversation_id);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'conversation_unread_counts') THEN
    DROP VIEW conversation_unread_counts;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS conversation_unread_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE conversation_unread_counts ADD COLUMN IF NOT EXISTS conversation_id TEXT;
ALTER TABLE conversation_unread_counts ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE conversation_unread_counts ADD COLUMN IF NOT EXISTS unread_count INTEGER DEFAULT 0;
ALTER TABLE conversation_unread_counts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. CHAT ROOMS & GLOBAL CHAT
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS name TEXT DEFAULT '';
ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS creator_id TEXT;
ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'public';
ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'free';
ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS max_members INTEGER DEFAULT 100;
ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS global_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE global_chat_messages ADD COLUMN IF NOT EXISTS room_id UUID;
ALTER TABLE global_chat_messages ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE global_chat_messages ADD COLUMN IF NOT EXISTS username TEXT DEFAULT 'anon';
ALTER TABLE global_chat_messages ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE global_chat_messages ADD COLUMN IF NOT EXISTS content TEXT DEFAULT '';
ALTER TABLE global_chat_messages ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'text';
ALTER TABLE global_chat_messages ADD COLUMN IF NOT EXISTS reply_to UUID;
ALTER TABLE global_chat_messages ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE global_chat_messages ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_global_chat_room    ON global_chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_global_chat_created ON global_chat_messages(created_at DESC);

CREATE TABLE IF NOT EXISTS room_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE room_credits ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE room_credits ADD COLUMN IF NOT EXISTS room_id UUID;
ALTER TABLE room_credits ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 0;
ALTER TABLE room_credits ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. SUBSCRIPTIONS & UPGRADES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'premium_chat';
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS transaction_id TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS nullifier_hash TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);

CREATE TABLE IF NOT EXISTS upgrades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE upgrades ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE upgrades ADD COLUMN IF NOT EXISTS type TEXT DEFAULT '';
ALTER TABLE upgrades ADD COLUMN IF NOT EXISTS transaction_id TEXT;
ALTER TABLE upgrades ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE upgrades ADD COLUMN IF NOT EXISTS amount_wld DOUBLE PRECISION DEFAULT 0;
ALTER TABLE upgrades ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE upgrades ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_upgrades_user ON upgrades(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 12. USER BALANCES & FINANCIAL
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE user_balances ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE user_balances ADD COLUMN IF NOT EXISTS wld DOUBLE PRECISION DEFAULT 0;
ALTER TABLE user_balances ADD COLUMN IF NOT EXISTS usdc DOUBLE PRECISION DEFAULT 0;
ALTER TABLE user_balances ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE balances ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE balances ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'WLD';
ALTER TABLE balances ADD COLUMN IF NOT EXISTS amount DOUBLE PRECISION DEFAULT 0;
ALTER TABLE balances ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS amount DOUBLE PRECISION DEFAULT 0;
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'WLD';
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS wallet_address TEXT DEFAULT '';
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS transaction_id TEXT;
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS user_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE user_tokens ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE user_tokens ADD COLUMN IF NOT EXISTS wld_balance DOUBLE PRECISION DEFAULT 0;
ALTER TABLE user_tokens ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS user_reputation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE user_reputation ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE user_reputation ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0;
ALTER TABLE user_reputation ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS referral_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE referral_tokens ADD COLUMN IF NOT EXISTS referrer_id TEXT;
ALTER TABLE referral_tokens ADD COLUMN IF NOT EXISTS referee_id TEXT;
ALTER TABLE referral_tokens ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE referral_tokens ADD COLUMN IF NOT EXISTS redeemed BOOLEAN DEFAULT FALSE;
ALTER TABLE referral_tokens ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- ─────────────────────────────────────────────────────────────────────────────
-- 13. CONTENT & METRICS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS content_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE content_queue ADD COLUMN IF NOT EXISTS account TEXT DEFAULT '';
ALTER TABLE content_queue ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE content_queue ADD COLUMN IF NOT EXISTS topic TEXT;
ALTER TABLE content_queue ADD COLUMN IF NOT EXISTS content TEXT DEFAULT '';
ALTER TABLE content_queue ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE content_queue ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'queued';
ALTER TABLE content_queue ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE content_queue ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS post_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE post_metrics ADD COLUMN IF NOT EXISTS post_id UUID;
ALTER TABLE post_metrics ADD COLUMN IF NOT EXISTS queue_id UUID;
ALTER TABLE post_metrics ADD COLUMN IF NOT EXISTS impressions INTEGER DEFAULT 0;
ALTER TABLE post_metrics ADD COLUMN IF NOT EXISTS clicks INTEGER DEFAULT 0;
ALTER TABLE post_metrics ADD COLUMN IF NOT EXISTS likes INTEGER DEFAULT 0;
ALTER TABLE post_metrics ADD COLUMN IF NOT EXISTS shares INTEGER DEFAULT 0;
ALTER TABLE post_metrics ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE post_metrics ADD COLUMN IF NOT EXISTS account TEXT;
ALTER TABLE post_metrics ADD COLUMN IF NOT EXISTS hour_of_day INTEGER;
ALTER TABLE post_metrics ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE post_metrics ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS trends_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE trends_cache ADD COLUMN IF NOT EXISTS key TEXT;
ALTER TABLE trends_cache ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}';
ALTER TABLE trends_cache ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ─────────────────────────────────────────────────────────────────────────────
-- 14. TOKENS (bonding curve platform)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tokens (
  id TEXT PRIMARY KEY
);

ALTER TABLE tokens ADD COLUMN IF NOT EXISTS name TEXT DEFAULT '';
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS symbol TEXT DEFAULT '';
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS emoji TEXT DEFAULT '🌟';
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS creator_id TEXT DEFAULT '';
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS creator_name TEXT DEFAULT 'anon';
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS price_wld DOUBLE PRECISION DEFAULT 0.0000005;
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS price_usdc DOUBLE PRECISION DEFAULT 0.0000015;
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS market_cap DOUBLE PRECISION DEFAULT 0;
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS holders INTEGER DEFAULT 0;
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS curve_percent DOUBLE PRECISION DEFAULT 0;
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS change_24h DOUBLE PRECISION DEFAULT 0;
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS volume_24h DOUBLE PRECISION DEFAULT 0;
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS total_supply BIGINT DEFAULT 100000000;
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS circulating_supply BIGINT DEFAULT 0;
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
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_tokens_creator   ON tokens(creator_id);
CREATE INDEX IF NOT EXISTS idx_tokens_symbol    ON tokens(symbol);
CREATE INDEX IF NOT EXISTS idx_tokens_trending  ON tokens(is_trending) WHERE is_trending = TRUE;
CREATE INDEX IF NOT EXISTS idx_tokens_graduated ON tokens(graduated);
CREATE INDEX IF NOT EXISTS idx_tokens_created   ON tokens(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tokens_marketcap ON tokens(market_cap DESC);
CREATE INDEX IF NOT EXISTS idx_tokens_volume    ON tokens(volume_24h DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 15. HOLDINGS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS holdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE holdings ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE holdings ADD COLUMN IF NOT EXISTS token_id TEXT;
ALTER TABLE holdings ADD COLUMN IF NOT EXISTS token_name TEXT;
ALTER TABLE holdings ADD COLUMN IF NOT EXISTS token_symbol TEXT;
ALTER TABLE holdings ADD COLUMN IF NOT EXISTS token_emoji TEXT DEFAULT '🌟';
ALTER TABLE holdings ADD COLUMN IF NOT EXISTS amount BIGINT DEFAULT 0;
ALTER TABLE holdings ADD COLUMN IF NOT EXISTS avg_buy_price DOUBLE PRECISION DEFAULT 0;
ALTER TABLE holdings ADD COLUMN IF NOT EXISTS current_price DOUBLE PRECISION DEFAULT 0;
ALTER TABLE holdings ADD COLUMN IF NOT EXISTS value DOUBLE PRECISION DEFAULT 0;
ALTER TABLE holdings ADD COLUMN IF NOT EXISTS pnl DOUBLE PRECISION DEFAULT 0;
ALTER TABLE holdings ADD COLUMN IF NOT EXISTS pnl_percent DOUBLE PRECISION DEFAULT 0;
ALTER TABLE holdings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_holdings_user  ON holdings(user_id);
CREATE INDEX IF NOT EXISTS idx_holdings_token ON holdings(token_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 16. TOKEN_ACTIVITY
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS token_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE token_activity ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'buy';
ALTER TABLE token_activity ADD COLUMN IF NOT EXISTS user_id TEXT DEFAULT '';
ALTER TABLE token_activity ADD COLUMN IF NOT EXISTS username TEXT DEFAULT 'anon';
ALTER TABLE token_activity ADD COLUMN IF NOT EXISTS token_id TEXT DEFAULT '';
ALTER TABLE token_activity ADD COLUMN IF NOT EXISTS token_symbol TEXT;
ALTER TABLE token_activity ADD COLUMN IF NOT EXISTS amount DOUBLE PRECISION DEFAULT 0;
ALTER TABLE token_activity ADD COLUMN IF NOT EXISTS price DOUBLE PRECISION;
ALTER TABLE token_activity ADD COLUMN IF NOT EXISTS total DOUBLE PRECISION;
ALTER TABLE token_activity ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_activity_token     ON token_activity(token_id);
CREATE INDEX IF NOT EXISTS idx_activity_user      ON token_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_timestamp ON token_activity(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_activity_type      ON token_activity(type);

-- ─────────────────────────────────────────────────────────────────────────────
-- 17. AIRDROPS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS airdrops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE airdrops ADD COLUMN IF NOT EXISTS token_id TEXT;
ALTER TABLE airdrops ADD COLUMN IF NOT EXISTS token_name TEXT;
ALTER TABLE airdrops ADD COLUMN IF NOT EXISTS token_symbol TEXT;
ALTER TABLE airdrops ADD COLUMN IF NOT EXISTS token_emoji TEXT DEFAULT '🌟';
ALTER TABLE airdrops ADD COLUMN IF NOT EXISTS title TEXT DEFAULT '';
ALTER TABLE airdrops ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE airdrops ADD COLUMN IF NOT EXISTS total_amount BIGINT DEFAULT 0;
ALTER TABLE airdrops ADD COLUMN IF NOT EXISTS claimed_amount BIGINT DEFAULT 0;
ALTER TABLE airdrops ADD COLUMN IF NOT EXISTS daily_amount BIGINT DEFAULT 0;
ALTER TABLE airdrops ADD COLUMN IF NOT EXISTS participants INTEGER DEFAULT 0;
ALTER TABLE airdrops ADD COLUMN IF NOT EXISTS max_participants INTEGER DEFAULT 1000;
ALTER TABLE airdrops ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;
ALTER TABLE airdrops ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE airdrops ADD COLUMN IF NOT EXISTS cooldown_hours INTEGER DEFAULT 24;
ALTER TABLE airdrops ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_airdrops_token  ON airdrops(token_id);
CREATE INDEX IF NOT EXISTS idx_airdrops_active ON airdrops(is_active) WHERE is_active = TRUE;

-- ─────────────────────────────────────────────────────────────────────────────
-- 18. AIRDROP_CLAIMS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS airdrop_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE airdrop_claims ADD COLUMN IF NOT EXISTS airdrop_id UUID;
ALTER TABLE airdrop_claims ADD COLUMN IF NOT EXISTS user_id TEXT DEFAULT '';
ALTER TABLE airdrop_claims ADD COLUMN IF NOT EXISTS amount BIGINT DEFAULT 0;
ALTER TABLE airdrop_claims ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_claims_airdrop_user ON airdrop_claims(airdrop_id, user_id);
CREATE INDEX IF NOT EXISTS idx_claims_airdrop      ON airdrop_claims(airdrop_id);
CREATE INDEX IF NOT EXISTS idx_claims_user          ON airdrop_claims(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 19. AIRDROP_POOLS & AIRDROP_LINKS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS airdrop_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE airdrop_pools ADD COLUMN IF NOT EXISTS creator_id TEXT DEFAULT '';
ALTER TABLE airdrop_pools ADD COLUMN IF NOT EXISTS token_id TEXT;
ALTER TABLE airdrop_pools ADD COLUMN IF NOT EXISTS total_tokens BIGINT DEFAULT 0;
ALTER TABLE airdrop_pools ADD COLUMN IF NOT EXISTS remaining BIGINT DEFAULT 0;
ALTER TABLE airdrop_pools ADD COLUMN IF NOT EXISTS cost_wld DOUBLE PRECISION DEFAULT 0;
ALTER TABLE airdrop_pools ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_airdrop_pools_creator ON airdrop_pools(creator_id);

CREATE TABLE IF NOT EXISTS airdrop_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE airdrop_links ADD COLUMN IF NOT EXISTS pool_id UUID;
ALTER TABLE airdrop_links ADD COLUMN IF NOT EXISTS creator_id TEXT DEFAULT '';
ALTER TABLE airdrop_links ADD COLUMN IF NOT EXISTS token_id TEXT DEFAULT '';
ALTER TABLE airdrop_links ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE airdrop_links ADD COLUMN IF NOT EXISTS amount BIGINT DEFAULT 0;
ALTER TABLE airdrop_links ADD COLUMN IF NOT EXISTS max_claims INTEGER DEFAULT 1;
ALTER TABLE airdrop_links ADD COLUMN IF NOT EXISTS claims INTEGER DEFAULT 0;
ALTER TABLE airdrop_links ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE airdrop_links ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE airdrop_links ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_airdrop_links_code    ON airdrop_links(code);
CREATE INDEX IF NOT EXISTS idx_airdrop_links_creator ON airdrop_links(creator_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 20. TOKEN_PAYMENTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS token_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE token_payments ADD COLUMN IF NOT EXISTS transaction_id TEXT;
ALTER TABLE token_payments ADD COLUMN IF NOT EXISTS user_id TEXT DEFAULT '';
ALTER TABLE token_payments ADD COLUMN IF NOT EXISTS action TEXT DEFAULT '';
ALTER TABLE token_payments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'accepted';
ALTER TABLE token_payments ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE token_payments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_payments_tx   ON token_payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payments_user ON token_payments(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 21. PAYMENT_ORDERS & LEDGER
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payment_orders (
  id TEXT PRIMARY KEY DEFAULT 'ord_' || substr(md5(random()::text), 1, 12)
);

ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS user_id TEXT DEFAULT '';
ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS username TEXT DEFAULT 'anon';
ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS token_id TEXT DEFAULT '';
ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS token_symbol TEXT DEFAULT '';
ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS amount_wld NUMERIC DEFAULT 0;
ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS estimated_tokens NUMERIC DEFAULT 0;
ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS spot_price NUMERIC DEFAULT 0;
ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS reference TEXT;
ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS transaction_id TEXT;
ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'buy';
ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS error_message TEXT;

CREATE INDEX IF NOT EXISTS idx_payment_orders_user      ON payment_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_status    ON payment_orders(status);
CREATE INDEX IF NOT EXISTS idx_payment_orders_reference ON payment_orders(reference);

CREATE TABLE IF NOT EXISTS ledger (
  id TEXT PRIMARY KEY DEFAULT 'tk_' || substr(md5(random()::text), 1, 14)
);

ALTER TABLE ledger ADD COLUMN IF NOT EXISTS order_id TEXT;
ALTER TABLE ledger ADD COLUMN IF NOT EXISTS type TEXT DEFAULT '';
ALTER TABLE ledger ADD COLUMN IF NOT EXISTS user_id TEXT DEFAULT '';
ALTER TABLE ledger ADD COLUMN IF NOT EXISTS username TEXT DEFAULT 'anon';
ALTER TABLE ledger ADD COLUMN IF NOT EXISTS token_id TEXT;
ALTER TABLE ledger ADD COLUMN IF NOT EXISTS token_symbol TEXT DEFAULT '';
ALTER TABLE ledger ADD COLUMN IF NOT EXISTS amount_wld NUMERIC DEFAULT 0;
ALTER TABLE ledger ADD COLUMN IF NOT EXISTS direction TEXT DEFAULT '';
ALTER TABLE ledger ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE ledger ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE ledger ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_ledger_order   ON ledger(order_id);
CREATE INDEX IF NOT EXISTS idx_ledger_user    ON ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_ledger_token   ON ledger(token_id);
CREATE INDEX IF NOT EXISTS idx_ledger_type    ON ledger(type);
CREATE INDEX IF NOT EXISTS idx_ledger_created ON ledger(created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 22. PRICE_SNAPSHOTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS price_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE price_snapshots ADD COLUMN IF NOT EXISTS token_id TEXT;
ALTER TABLE price_snapshots ADD COLUMN IF NOT EXISTS price_wld DOUBLE PRECISION DEFAULT 0;
ALTER TABLE price_snapshots ADD COLUMN IF NOT EXISTS price_usdc DOUBLE PRECISION DEFAULT 0;
ALTER TABLE price_snapshots ADD COLUMN IF NOT EXISTS supply BIGINT DEFAULT 0;
ALTER TABLE price_snapshots ADD COLUMN IF NOT EXISTS volume DOUBLE PRECISION DEFAULT 0;
ALTER TABLE price_snapshots ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'trade';
ALTER TABLE price_snapshots ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_snapshots_token ON price_snapshots(token_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_time  ON price_snapshots(token_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 23. RPC FUNCTIONS (DROP first to avoid parameter name conflicts)
-- ─────────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS increment_holders(TEXT);
CREATE FUNCTION increment_holders(tid TEXT)
RETURNS void AS $$
BEGIN
  UPDATE tokens SET holders = holders + 1 WHERE id = tid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP FUNCTION IF EXISTS decrement_holders(TEXT);
CREATE FUNCTION decrement_holders(tid TEXT)
RETURNS void AS $$
BEGIN
  UPDATE tokens SET holders = GREATEST(holders - 1, 0) WHERE id = tid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP FUNCTION IF EXISTS update_24h_change(TEXT);
CREATE FUNCTION update_24h_change(tid TEXT)
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

DROP FUNCTION IF EXISTS update_buy_pressure(TEXT);
CREATE FUNCTION update_buy_pressure(tid TEXT)
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

DROP FUNCTION IF EXISTS increment_ad_impression(UUID);
CREATE FUNCTION increment_ad_impression(pid UUID)
RETURNS void AS $$
BEGIN
  UPDATE posts SET ad_impressions = COALESCE(ad_impressions, 0) + 1 WHERE id = pid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP FUNCTION IF EXISTS increment_post_views(UUID);
CREATE FUNCTION increment_post_views(pid UUID)
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
ALTER TABLE content_queue        ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_metrics         ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_balances        ENABLE ROW LEVEL SECURITY;
ALTER TABLE balances             ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals          ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tokens          ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reputation      ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_tokens      ENABLE ROW LEVEL SECURITY;
ALTER TABLE trends_cache         ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_unread_counts ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- 25. RLS POLICIES (all idempotent)
-- ─────────────────────────────────────────────────────────────────────────────
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
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'blocks_read_all') THEN
    CREATE POLICY blocks_read_all ON blocks FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'blocks_insert') THEN
    CREATE POLICY blocks_insert ON blocks FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'reports_read_all') THEN
    CREATE POLICY reports_read_all ON reports FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'reports_insert') THEN
    CREATE POLICY reports_insert ON reports FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'notifications_read_all') THEN
    CREATE POLICY notifications_read_all ON notifications FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'notifications_insert') THEN
    CREATE POLICY notifications_insert ON notifications FOR INSERT WITH CHECK (true);
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
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'conversation_unread_read') THEN
    CREATE POLICY conversation_unread_read ON conversation_unread_counts FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'conversation_unread_insert') THEN
    CREATE POLICY conversation_unread_insert ON conversation_unread_counts FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'conversation_unread_update') THEN
    CREATE POLICY conversation_unread_update ON conversation_unread_counts FOR UPDATE USING (true);
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
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_balances_read_all') THEN
    CREATE POLICY user_balances_read_all ON user_balances FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_balances_insert') THEN
    CREATE POLICY user_balances_insert ON user_balances FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_balances_update') THEN
    CREATE POLICY user_balances_update ON user_balances FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'balances_read_all') THEN
    CREATE POLICY balances_read_all ON balances FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'balances_insert') THEN
    CREATE POLICY balances_insert ON balances FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'balances_update') THEN
    CREATE POLICY balances_update ON balances FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'withdrawals_read_all') THEN
    CREATE POLICY withdrawals_read_all ON withdrawals FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'withdrawals_insert') THEN
    CREATE POLICY withdrawals_insert ON withdrawals FOR INSERT WITH CHECK (true);
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
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_tokens_read_all') THEN
    CREATE POLICY user_tokens_read_all ON user_tokens FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_tokens_insert') THEN
    CREATE POLICY user_tokens_insert ON user_tokens FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_tokens_update') THEN
    CREATE POLICY user_tokens_update ON user_tokens FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_reputation_read_all') THEN
    CREATE POLICY user_reputation_read_all ON user_reputation FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_reputation_insert') THEN
    CREATE POLICY user_reputation_insert ON user_reputation FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'referral_tokens_read_all') THEN
    CREATE POLICY referral_tokens_read_all ON referral_tokens FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'referral_tokens_insert') THEN
    CREATE POLICY referral_tokens_insert ON referral_tokens FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'trends_cache_read_all') THEN
    CREATE POLICY trends_cache_read_all ON trends_cache FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'trends_cache_insert') THEN
    CREATE POLICY trends_cache_insert ON trends_cache FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'trends_cache_update') THEN
    CREATE POLICY trends_cache_update ON trends_cache FOR UPDATE USING (true);
  END IF;
END $$;

-- ============================================================================
-- DONE. 100% idempotente. Todas las tablas y columnas con IF NOT EXISTS.
-- Seguro para correr multiples veces en cualquier estado de la DB.
-- ============================================================================


  -- ═══════════════════════════════════════════════════════════════
  -- DASHBOARD: Ad Metrics, Campaigns, Profile monetization columns
  -- ═══════════════════════════════════════════════════════════════

  -- Ad Metrics table (core of dashboard analytics)
  CREATE TABLE IF NOT EXISTS ad_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    campaign_id UUID,
    user_id TEXT,
    type TEXT NOT NULL CHECK (type IN ('impression', 'click')),
    value DOUBLE PRECISION DEFAULT 0,
    creator_earning DOUBLE PRECISION DEFAULT 0,
    platform_earning DOUBLE PRECISION DEFAULT 0,
    country TEXT DEFAULT 'unknown',
    language TEXT DEFAULT 'unknown',
    interests TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_ad_metrics_post ON ad_metrics(post_id);
  CREATE INDEX IF NOT EXISTS idx_ad_metrics_campaign ON ad_metrics(campaign_id);
  CREATE INDEX IF NOT EXISTS idx_ad_metrics_created ON ad_metrics(created_at DESC);

  ALTER TABLE ad_metrics ENABLE ROW LEVEL SECURITY;
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ad_metrics_read_all') THEN
      CREATE POLICY ad_metrics_read_all ON ad_metrics FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ad_metrics_insert') THEN
      CREATE POLICY ad_metrics_insert ON ad_metrics FOR INSERT WITH CHECK (true);
    END IF;
  END $$;

  -- Campaigns table (advertiser mode)
  CREATE TABLE IF NOT EXISTS campaigns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    budget DOUBLE PRECISION DEFAULT 0,
    spent DOUBLE PRECISION DEFAULT 0,
    cpc DOUBLE PRECISION DEFAULT 0.01,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused')),
    category TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_campaigns_user ON campaigns(user_id);

  ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'campaigns_read_all') THEN
      CREATE POLICY campaigns_read_all ON campaigns FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'campaigns_insert') THEN
      CREATE POLICY campaigns_insert ON campaigns FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'campaigns_update') THEN
      CREATE POLICY campaigns_update ON campaigns FOR UPDATE USING (true);
    END IF;
  END $$;

  -- Posts: add monetized column
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS monetized BOOLEAN DEFAULT FALSE;

  -- Profiles: add monetization settings columns
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ads_enabled BOOLEAN DEFAULT TRUE;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sponsorships_enabled BOOLEAN DEFAULT FALSE;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ad_category TEXT DEFAULT 'Sin preferencia';
  