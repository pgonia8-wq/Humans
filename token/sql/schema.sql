-- ============================================================================
-- H TOKEN PLATFORM — COMPLETE SUPABASE SCHEMA
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. PROFILES — add ORB verification columns (idempotent)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS verified           boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS verification_level text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS orb_verified_at    timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS wallet_address     text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS wallet_verified    boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS wallet_verified_at timestamptz DEFAULT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. TOKENS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tokens (
  id                 text PRIMARY KEY,
  name               text NOT NULL,
  symbol             text NOT NULL,
  emoji              text DEFAULT '🌟',
  creator_id         text NOT NULL,
  creator_name       text DEFAULT 'anon',
  price_wld          double precision DEFAULT 0.0000005,
  price_usdc         double precision DEFAULT 0.0000015,
  market_cap         double precision DEFAULT 0,
  holders            integer DEFAULT 0,
  curve_percent      double precision DEFAULT 0,
  change_24h         double precision DEFAULT 0,
  volume_24h         double precision DEFAULT 0,
  total_supply       bigint DEFAULT 100000000,
  circulating_supply bigint DEFAULT 0,
  locked_supply      bigint DEFAULT 0,
  burned_supply      bigint DEFAULT 0,
  lock_duration_days integer DEFAULT 0,
  description        text DEFAULT '',
  is_trending        boolean DEFAULT false,
  tags               jsonb DEFAULT '["New"]'::jsonb,
  buy_pressure       integer DEFAULT 50,
  avatar_url         text,
  total_wld_in_curve double precision DEFAULT 0,
  treasury_balance   double precision DEFAULT 0,
  graduated                boolean DEFAULT false,
  graduated_at             timestamptz,
  graduation_pool_wld      double precision DEFAULT 0,
  graduation_treasury_wld  double precision DEFAULT 0,
  contract_address         text,
  socials            jsonb,
  creation_fee_wld   double precision DEFAULT 5,
  creation_fee_tx    text,
  created_at         timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tokens_creator     ON tokens(creator_id);
CREATE INDEX IF NOT EXISTS idx_tokens_symbol      ON tokens(symbol);
CREATE INDEX IF NOT EXISTS idx_tokens_trending    ON tokens(is_trending) WHERE is_trending = true;
CREATE INDEX IF NOT EXISTS idx_tokens_graduated   ON tokens(graduated);
CREATE INDEX IF NOT EXISTS idx_tokens_created     ON tokens(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tokens_marketcap   ON tokens(market_cap DESC);
CREATE INDEX IF NOT EXISTS idx_tokens_volume      ON tokens(volume_24h DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. HOLDINGS — user token balances
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS holdings (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       text NOT NULL,
  token_id      text NOT NULL REFERENCES tokens(id) ON DELETE CASCADE,
  token_name    text,
  token_symbol  text,
  token_emoji   text DEFAULT '🌟',
  amount        bigint DEFAULT 0,
  avg_buy_price double precision DEFAULT 0,
  current_price double precision DEFAULT 0,
  value         double precision DEFAULT 0,
  pnl           double precision DEFAULT 0,
  pnl_percent   double precision DEFAULT 0,
  updated_at    timestamptz DEFAULT now(),
  UNIQUE(user_id, token_id)
);

CREATE INDEX IF NOT EXISTS idx_holdings_user  ON holdings(user_id);
CREATE INDEX IF NOT EXISTS idx_holdings_token ON holdings(token_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. TOKEN_ACTIVITY — buy/sell/create/graduate log
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS token_activity (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  type         text NOT NULL CHECK (type IN ('buy', 'sell', 'create', 'graduate', 'airdrop_claim')),
  user_id      text NOT NULL,
  username     text DEFAULT 'anon',
  token_id     text NOT NULL REFERENCES tokens(id) ON DELETE CASCADE,
  token_symbol text,
  amount       double precision DEFAULT 0,
  price        double precision,
  total        double precision,
  timestamp    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_token     ON token_activity(token_id);
CREATE INDEX IF NOT EXISTS idx_activity_user      ON token_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_timestamp ON token_activity(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_activity_type      ON token_activity(type);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. AIRDROPS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS airdrops (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  token_id         text NOT NULL REFERENCES tokens(id) ON DELETE CASCADE,
  token_name       text,
  token_symbol     text,
  token_emoji      text DEFAULT '🌟',
  title            text NOT NULL,
  description      text DEFAULT '',
  total_amount     bigint DEFAULT 0,
  claimed_amount   bigint DEFAULT 0,
  daily_amount     bigint DEFAULT 0,
  participants     integer DEFAULT 0,
  max_participants integer DEFAULT 1000,
  end_date         timestamptz,
  is_active        boolean DEFAULT true,
  cooldown_hours   integer DEFAULT 24,
  created_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_airdrops_token  ON airdrops(token_id);
CREATE INDEX IF NOT EXISTS idx_airdrops_active ON airdrops(is_active) WHERE is_active = true;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. AIRDROP_CLAIMS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS airdrop_claims (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  airdrop_id uuid NOT NULL REFERENCES airdrops(id) ON DELETE CASCADE,
  user_id    text NOT NULL,
  amount     bigint DEFAULT 0,
  claimed_at timestamptz DEFAULT now()
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'airdrop_claims_airdrop_id_user_id_key'
      AND conrelid = 'airdrop_claims'::regclass
  ) THEN
    ALTER TABLE airdrop_claims DROP CONSTRAINT airdrop_claims_airdrop_id_user_id_key;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_claims_airdrop_user ON airdrop_claims(airdrop_id, user_id);

CREATE INDEX IF NOT EXISTS idx_claims_airdrop ON airdrop_claims(airdrop_id);
CREATE INDEX IF NOT EXISTS idx_claims_user    ON airdrop_claims(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. TOKEN_PAYMENTS — on-chain payment verification (anti-replay)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS token_payments (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id text NOT NULL UNIQUE,
  user_id        text NOT NULL,
  action         text NOT NULL,
  status         text DEFAULT 'accepted',
  verified_at    timestamptz DEFAULT now(),
  created_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_tx   ON token_payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payments_user ON token_payments(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. RPC FUNCTIONS — increment/decrement holders
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION increment_holders(tid text)
RETURNS void AS $$
BEGIN
  UPDATE tokens SET holders = holders + 1 WHERE id = tid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_holders(tid text)
RETURNS void AS $$
BEGIN
  UPDATE tokens SET holders = GREATEST(holders - 1, 0) WHERE id = tid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. RLS POLICIES (basic — service_role bypasses, anon reads tokens)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE tokens          ENABLE ROW LEVEL SECURITY;
ALTER TABLE holdings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_activity  ENABLE ROW LEVEL SECURITY;
ALTER TABLE airdrops        ENABLE ROW LEVEL SECURITY;
ALTER TABLE airdrop_claims  ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_payments  ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tokens_read_all' AND tablename = 'tokens') THEN
    CREATE POLICY tokens_read_all ON tokens FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'holdings_read_all' AND tablename = 'holdings') THEN
    CREATE POLICY holdings_read_all ON holdings FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'activity_read_all' AND tablename = 'token_activity') THEN
    CREATE POLICY activity_read_all ON token_activity FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'airdrops_read_all' AND tablename = 'airdrops') THEN
    CREATE POLICY airdrops_read_all ON airdrops FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'claims_read_all' AND tablename = 'airdrop_claims') THEN
    CREATE POLICY claims_read_all ON airdrop_claims FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'payments_read_all' AND tablename = 'token_payments') THEN
    CREATE POLICY payments_read_all ON token_payments FOR SELECT USING (true);
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. STORAGE BUCKETS (run these in Supabase Dashboard → Storage if needed)
-- ─────────────────────────────────────────────────────────────────────────────
-- INSERT INTO storage.buckets (id, name, public) VALUES ('token-avatars', 'token-avatars', true) ON CONFLICT DO NOTHING;
-- INSERT INTO storage.buckets (id, name, public) VALUES ('user-avatars', 'user-avatars', true) ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. PRICE_SNAPSHOTS — real candlestick / price history data
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS price_snapshots (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  token_id   text NOT NULL REFERENCES tokens(id) ON DELETE CASCADE,
  price_wld  double precision NOT NULL,
  price_usdc double precision NOT NULL,
  supply     bigint DEFAULT 0,
  volume     double precision DEFAULT 0,
  type       text DEFAULT 'trade',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_snapshots_token   ON price_snapshots(token_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_time    ON price_snapshots(token_id, created_at DESC);

ALTER TABLE price_snapshots ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'snapshots_read_all' AND tablename = 'price_snapshots') THEN
    CREATE POLICY snapshots_read_all ON price_snapshots FOR SELECT USING (true);
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 12. UPDATE_24H_CHANGE — function to recalculate 24h price change
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_24h_change(tid text)
RETURNS void AS $$
DECLARE
  old_price double precision;
  new_price double precision;
  pct       double precision;
BEGIN
  SELECT price_wld INTO old_price
  FROM price_snapshots
  WHERE token_id = tid AND created_at <= (now() - interval '24 hours')
  ORDER BY created_at DESC
  LIMIT 1;

  SELECT price_wld INTO new_price FROM tokens WHERE id = tid;

  IF old_price IS NOT NULL AND old_price > 0 THEN
    pct := ((new_price - old_price) / old_price) * 100;
  ELSE
    pct := 0;
  END IF;

  UPDATE tokens SET change_24h = pct WHERE id = tid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────────────────────
-- 13. UPDATE_BUY_PRESSURE — compute from recent activity
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_buy_pressure(tid text)
RETURNS void AS $$
DECLARE
  total_txns integer;
  buy_txns   integer;
  pressure   integer;
BEGIN
  SELECT count(*) INTO total_txns
  FROM token_activity
  WHERE token_id = tid AND timestamp > (now() - interval '24 hours');

  SELECT count(*) INTO buy_txns
  FROM token_activity
  WHERE token_id = tid AND type = 'buy' AND timestamp > (now() - interval '24 hours');

  IF total_txns > 0 THEN
    pressure := ROUND((buy_txns::numeric / total_txns::numeric) * 100);
  ELSE
    pressure := 50;
  END IF;

  UPDATE tokens SET buy_pressure = pressure WHERE id = tid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- DONE. All tables, indexes, RPC functions, and RLS policies are set up.
-- 
-- REQUIRED ENV VARS:
--   SUPABASE_URL
--   SUPABASE_SERVICE_ROLE_KEY
--   WORLDCOIN_APP_ID
--   WORLDCOIN_API_KEY
--   WORLDCOIN_ACTION_ID (default: "verify-user")
--   VITE_PAYMENT_RECEIVER (wallet address for creation fee)
-- ============================================================================
