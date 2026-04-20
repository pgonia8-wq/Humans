-- ════════════════════════════════════════════════════════════════════════════
--  Trade Center & Totem Dashboard — Migración completa v2
--
--  ARQUITECTURA:
--    TotemBondingCurve (Solidity) = ÚNICA fuente de verdad
--    Backend = verificador / indexador únicamente
--
--  Tablas:
--    totems        → caché de métricas (NO fuente de verdad de supply/price)
--    totem_history → snapshots para charts
--    trades        → índice de trades on-chain, tx_hash UNIQUE (anti-replay)
--
--  Eliminado: totem_holdings (el contrato BondingCurve.balances() es la fuente)
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. TOTEMS (caché de métricas de UI) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS totems (
  address       TEXT        PRIMARY KEY,
  name          TEXT        NOT NULL,
  score         INTEGER     NOT NULL DEFAULT 0,
  influence     INTEGER     NOT NULL DEFAULT 1000,
  level         INTEGER     NOT NULL DEFAULT 1,
  badge         TEXT        NOT NULL DEFAULT 'Newcomer',
  price         FLOAT8      NOT NULL DEFAULT 0.00000055,
  supply        BIGINT      NOT NULL DEFAULT 0,
  volume_24h    FLOAT8      NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_totems_score      ON totems (score DESC);
CREATE INDEX IF NOT EXISTS idx_totems_price      ON totems (price DESC);
CREATE INDEX IF NOT EXISTS idx_totems_volume_24h ON totems (volume_24h DESC);
CREATE INDEX IF NOT EXISTS idx_totems_supply     ON totems (supply DESC);

-- ── 2. TOTEM_HISTORY (snapshots para gráficas de precio) ─────────────────────
CREATE TABLE IF NOT EXISTS totem_history (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  totem       TEXT        NOT NULL REFERENCES totems(address) ON DELETE CASCADE,
  score       INTEGER     NOT NULL DEFAULT 0,
  price       FLOAT8      NOT NULL DEFAULT 0,
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_totem_history_totem_ts ON totem_history (totem, timestamp DESC);

-- ── 3. TRADES (índice on-chain + anti-replay via tx_hash UNIQUE) ──────────────
--
-- tx_hash es UNIQUE: si ya existe → INSERT falla con code=23505 → anti-replay
-- El backend decodifica los valores reales desde los logs del contrato.
CREATE TABLE IF NOT EXISTS trades (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  "user"      TEXT        NOT NULL,
  totem       TEXT        NOT NULL REFERENCES totems(address) ON DELETE CASCADE,
  type        TEXT        NOT NULL CHECK (type IN ('buy', 'sell')),
  amount      FLOAT8      NOT NULL DEFAULT 0,   -- WLD (wldIn para buy, wldOut para sell)
  tokens      BIGINT      NOT NULL DEFAULT 0,   -- tokensOut para buy, tokensIn para sell
  tx_hash     TEXT        NOT NULL UNIQUE,      -- hash on-chain — UNIQUE = anti-replay
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trades_totem_ts   ON trades (totem, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_trades_user_totem ON trades ("user", totem);
CREATE INDEX IF NOT EXISTS idx_trades_ts         ON trades (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_trades_tx_hash    ON trades (tx_hash);

-- ── 4. RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE totems        ENABLE ROW LEVEL SECURITY;
ALTER TABLE totem_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades        ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "totems_read_public"         ON totems;
DROP POLICY IF EXISTS "totem_history_read_public"  ON totem_history;
DROP POLICY IF EXISTS "trades_read_public"         ON trades;

CREATE POLICY "totems_read_public"        ON totems         FOR SELECT USING (true);
CREATE POLICY "totem_history_read_public" ON totem_history  FOR SELECT USING (true);
CREATE POLICY "trades_read_public"        ON trades         FOR SELECT USING (true);
-- INSERT/UPDATE/DELETE solo desde service_role key (backend API)

-- ── 5. FUNCIÓN helper: recalcular nivel desde score on-chain ──────────────────
-- Llamada por el cron de sincronización de scores
CREATE OR REPLACE FUNCTION refresh_totem_level(p_address TEXT, p_score INTEGER)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  v_level INTEGER;
  v_badge TEXT;
BEGIN
  IF    p_score > 8000 THEN v_level := 5; v_badge := 'Legend';
  ELSIF p_score > 6000 THEN v_level := 4; v_badge := 'Champion';
  ELSIF p_score > 3000 THEN v_level := 3; v_badge := 'Warrior';
  ELSIF p_score > 1000 THEN v_level := 2; v_badge := 'Builder';
  ELSE                       v_level := 1; v_badge := 'Newcomer';
  END IF;

  UPDATE totems
  SET score = p_score, level = v_level, badge = v_badge
  WHERE address = lower(p_address);
END;
$$;

-- ── FIN ──────────────────────────────────────────────────────────────────────
