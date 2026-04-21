-- =============================================================================
--  2026-04-20-orb-uniqueness.sql
-- =============================================================================
--  Garantía atómica anti-replay para verificación Orb.
--
--  Problema cerrado:
--    El nullifier_hash de una prueba Orb identifica de forma única a una
--    persona real (Worldcoin Orb). Sin esta restricción, dos cuentas distintas
--    podrían acabar con el mismo nullifier bajo una race condition (chequeo
--    manual + UPDATE no es atómico).
--
--  Esta restricción asegura que la base de datos rechace en transacción
--  cualquier intento de duplicar nullifier_hash entre filas distintas.
--  api/verifyOrbStatus.mjs maneja el código de error 23505 y devuelve
--  HTTP 403 ORB_ALREADY_LINKED al cliente.
--
--  EJECUCIÓN:
--    Aplicar UNA sola vez sobre la BD de Supabase desde el SQL editor:
--      Supabase → SQL Editor → New query → pegar este archivo → Run.
-- =============================================================================

-- 1) Limpieza preventiva: detectar duplicados existentes antes de añadir el
--    constraint. Si esta consulta devuelve filas, hay que resolverlas
--    manualmente antes de continuar (decidir qué cuenta conserva el nullifier).
DO $$
DECLARE
  dup_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO dup_count FROM (
    SELECT nullifier_hash
    FROM profiles
    WHERE nullifier_hash IS NOT NULL
    GROUP BY nullifier_hash
    HAVING COUNT(*) > 1
  ) AS dups;

  IF dup_count > 0 THEN
    RAISE EXCEPTION
      'No se puede añadir unique_nullifier: hay % nullifier_hash duplicados en profiles. Resuélvelos primero.',
      dup_count;
  END IF;
END $$;

-- 2) UNIQUE constraint sobre nullifier_hash. NULLs se permiten múltiples
--    (cuentas no-Orb-verificadas tienen nullifier_hash = NULL).
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS unique_nullifier;

ALTER TABLE profiles
  ADD CONSTRAINT unique_nullifier UNIQUE (nullifier_hash);

-- 3) (Opcional pero recomendado) índice parcial para consultas rápidas
--    "¿este nullifier ya está vinculado a alguien?".
CREATE INDEX IF NOT EXISTS idx_profiles_nullifier_hash
  ON profiles (nullifier_hash)
  WHERE nullifier_hash IS NOT NULL;
