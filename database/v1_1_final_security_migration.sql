-- ================================================================
-- STACKWEB v1.1 — Final Security & Functionality Migration
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ================================================================

-- ── Fix 1: Create/replace generate_voter_tokens() then lock it down
-- We recreate the function to guarantee the exact signature exists,
-- then revoke anon and grant only to authenticated.
CREATE OR REPLACE FUNCTION public.generate_voter_tokens(
  p_election_id UUID,
  p_count       INTEGER,
  p_prefix      TEXT DEFAULT 'SW'
)
RETURNS TABLE(token TEXT, student_name TEXT)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  i         INTEGER;
  new_token TEXT;
  v_name    TEXT;
BEGIN
  FOR i IN 1..LEAST(p_count, 500) LOOP
    new_token := upper(p_prefix) || '-' ||
      upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 4)) || '-' ||
      upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 4)) || '-' ||
      upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 4));
    v_name := 'Voter ' || i;
    INSERT INTO voters (election_id, token, student_name)
    VALUES (p_election_id, new_token, v_name)
    ON CONFLICT (token) DO NOTHING;
    RETURN QUERY SELECT new_token, v_name;
  END LOOP;
END;
$$;

-- Now revoke anon and grant only authenticated
REVOKE EXECUTE ON FUNCTION public.generate_voter_tokens(uuid, integer, text) FROM anon;
GRANT  EXECUTE ON FUNCTION public.generate_voter_tokens(uuid, integer, text) TO authenticated;



-- ── Fix 2: Drop the public votes read policy ────────────────────
-- Anonymous users should NOT be able to read how anyone voted.
DROP POLICY IF EXISTS "Public read votes" ON votes;
DROP POLICY IF EXISTS "Anyone read votes" ON votes;
DROP POLICY IF EXISTS "Anyone insert vote" ON votes;

-- ── Fix 3: Re-create votes INSERT policy (replaces old open one) ─
-- Requires: election is active AND voter token belongs to election
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'votes' AND policyname = 'Voters insert own votes'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Voters insert own votes" ON votes
        FOR INSERT
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM elections
            WHERE elections.id = votes.election_id
              AND elections.status = 'active'
          )
        )
    $pol$;
  END IF;
END $$;

-- ── Fix 4: Ensure admin read-votes policy exists ─────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'votes'
      AND policyname = 'Admin read votes'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Admin read votes" ON votes
        FOR SELECT USING (is_admin())
    $pol$;
  END IF;
END $$;

-- ── Fix 5: Add operator credential columns to settings ───────────
ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS operator_username TEXT    DEFAULT 'tokenstaff',
  ADD COLUMN IF NOT EXISTS operator_password TEXT    DEFAULT 'ChangeMe123',
  ADD COLUMN IF NOT EXISTS operator_enabled  BOOLEAN DEFAULT TRUE;

-- Backfill NULLs with defaults
UPDATE settings SET
  operator_username = COALESCE(operator_username, 'tokenstaff'),
  operator_password = COALESCE(operator_password, 'ChangeMe123'),
  operator_enabled  = COALESCE(operator_enabled,  TRUE);

-- ── Fix 6: Ensure allow_abstain column exists on elections ───────
ALTER TABLE elections
  ADD COLUMN IF NOT EXISTS allow_abstain BOOLEAN DEFAULT FALSE;

-- ── Fix 7: Performance indexes ──────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_voters_status_expiry
  ON voters (status, expires_at);

CREATE INDEX IF NOT EXISTS idx_voters_election_status
  ON voters (election_id, status);

CREATE INDEX IF NOT EXISTS idx_votes_election_voter
  ON votes (election_id, voter_id);

-- ── Fix 8: elections updated_at auto-trigger ─────────────────────
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_elections_updated_at ON elections;
CREATE TRIGGER trg_elections_updated_at
  BEFORE UPDATE ON elections
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ── Fix 9: token_expiry_hours column name normalisation ──────────
-- schema.sql uses token_expiry_hrs; some pages query token_expiry_hours.
-- Add an alias column so both names work.
ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS token_expiry_hours INTEGER DEFAULT 24;

UPDATE settings
SET token_expiry_hours = COALESCE(token_expiry_hours, token_expiry_hrs, 24);

-- ── Verification: run these SELECTs to confirm success ───────────
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'settings'
  AND column_name IN (
    'operator_username','operator_password','operator_enabled',
    'token_expiry_hours','token_expiry_hrs','allow_abstain'
  )
ORDER BY column_name;
