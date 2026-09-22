-- ═══════════════════════════════════════════════════════════════
-- STACKWEB Online Voting System
-- Master Fix SQL — migration_v4.sql
-- Generated: 2026-09-22
-- Run this ENTIRE file in Supabase SQL Editor.
-- All statements are safe to re-run (idempotent).
-- ═══════════════════════════════════════════════════════════════

-- ── 1. SETTINGS: Allow public read (voter pages need this) ────
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins_read_settings"  ON settings;
DROP POLICY IF EXISTS "public_read_settings"  ON settings;
DROP POLICY IF EXISTS "anon_read_settings"    ON settings;
DROP POLICY IF EXISTS "admins_write_settings" ON settings;
CREATE POLICY "public_read_settings"  ON settings FOR SELECT USING (TRUE);
CREATE POLICY "admins_write_settings" ON settings
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Add all missing settings columns
ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS school_name        TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS school_motto       TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS school_logo_url    TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS primary_color      TEXT    DEFAULT '#4f46e5',
  ADD COLUMN IF NOT EXISTS secondary_color    TEXT    DEFAULT '#14b8a6',
  ADD COLUMN IF NOT EXISTS results_public     BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS allow_abstain      BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS operator_username  TEXT    DEFAULT 'tokenstaff',
  ADD COLUMN IF NOT EXISTS operator_password  TEXT    DEFAULT 'ChangeMe123',
  ADD COLUMN IF NOT EXISTS token_expiry_secs  INTEGER DEFAULT 86400;

-- Ensure a default settings row exists
INSERT INTO settings (
  maintenance_mode, operator_enabled, max_tokens_per_batch,
  token_expiry_hrs, token_expiry_secs,
  primary_color, secondary_color, results_public, allow_abstain
)
SELECT false, true, 50, 24, 86400, '#4f46e5', '#14b8a6', true, true
WHERE NOT EXISTS (SELECT 1 FROM settings LIMIT 1);


-- ── 2. AUDIT LOGS: Anyone can insert, only admins can read ────
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins_read_audit_logs"   ON audit_logs;
DROP POLICY IF EXISTS "anyone_insert_audit"      ON audit_logs;
DROP POLICY IF EXISTS "admins_insert_audit_logs" ON audit_logs;
CREATE POLICY "admins_read_audit_logs" ON audit_logs
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "anyone_insert_audit" ON audit_logs
  FOR INSERT WITH CHECK (TRUE);


-- ── 3. VOTERS: Read for all, admin write, anon UPDATE for ─────
--    marking tokens as USED after voting (CRITICAL fix)
ALTER TABLE voters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "voters_read_policy"   ON voters;
DROP POLICY IF EXISTS "admins_write_voters"  ON voters;
DROP POLICY IF EXISTS "voters_update_status" ON voters;
CREATE POLICY "voters_read_policy" ON voters
  FOR SELECT USING (TRUE);
CREATE POLICY "admins_write_voters" ON voters
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "voters_update_status" ON voters
  FOR UPDATE USING (TRUE) WITH CHECK (TRUE);


-- ── 4. VOTES: Anyone inserts (voter action), admins read ──────
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "voters_insert_vote" ON votes;
DROP POLICY IF EXISTS "admins_read_votes"  ON votes;
CREATE POLICY "voters_insert_vote" ON votes
  FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "admins_read_votes" ON votes
  FOR SELECT USING (auth.role() = 'authenticated');


-- ── 5. ELECTIONS: Public read, admin write ────────────────────
ALTER TABLE elections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_elections"   ON elections;
DROP POLICY IF EXISTS "admins_manage_elections" ON elections;
CREATE POLICY "public_read_elections" ON elections
  FOR SELECT USING (TRUE);
CREATE POLICY "admins_manage_elections" ON elections
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- ── 6. POSITIONS: Public read, admin write ────────────────────
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_positions"   ON positions;
DROP POLICY IF EXISTS "admins_manage_positions" ON positions;
CREATE POLICY "public_read_positions" ON positions
  FOR SELECT USING (TRUE);
CREATE POLICY "admins_manage_positions" ON positions
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- ── 7. CANDIDATES: Public read, admin write ───────────────────
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_candidates"   ON candidates;
DROP POLICY IF EXISTS "admins_manage_candidates" ON candidates;
CREATE POLICY "public_read_candidates" ON candidates
  FOR SELECT USING (TRUE);
CREATE POLICY "admins_manage_candidates" ON candidates
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- ── 8. PROFILES: Users read own, admins read all ─────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_read_own_profile"   ON profiles;
DROP POLICY IF EXISTS "admins_read_profiles"     ON profiles;
DROP POLICY IF EXISTS "users_update_own_profile" ON profiles;
CREATE POLICY "users_read_own_profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "admins_read_profiles" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "users_update_own_profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);


-- ── 9. ANTI-DOUBLE-VOTE: DB-level unique constraint ───────────
--    Prevents same voter from voting twice for same position
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'unique_voter_position'
  ) THEN
    ALTER TABLE votes ADD CONSTRAINT unique_voter_position UNIQUE (voter_id, position_id);
  END IF;
END$$;


-- ── 10. UNIQUE TOKEN: Prevent token collisions across batches ─
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'unique_voter_token'
  ) THEN
    ALTER TABLE voters ADD CONSTRAINT unique_voter_token UNIQUE (token);
  END IF;
END$$;


-- ── 11. RPC for operators (bypasses RLS safely) ───────────────
DROP FUNCTION IF EXISTS get_elections_for_tokens();
CREATE OR REPLACE FUNCTION get_elections_for_tokens()
RETURNS SETOF elections
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM elections
  WHERE  status IN ('draft', 'active', 'paused')
  ORDER  BY created_at DESC;
$$;
GRANT EXECUTE ON FUNCTION get_elections_for_tokens() TO anon;


-- ═══════════════════════════════════════════════════════════════
-- END OF migration_v4.sql
-- After running, refresh your admin dashboard and test voting.
-- ═══════════════════════════════════════════════════════════════
