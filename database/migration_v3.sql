-- ============================================================
-- STACKWEB Online Voting System
-- Database Migration v3
-- Generated: 2026-09-14
-- ============================================================
-- Run in Supabase SQL Editor (or via psql).
-- Each section is idempotent (safe to re-run).
-- ============================================================

-- ── 1. SETTINGS TABLE ────────────────────────────────────────
ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS maintenance_mode       BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS operator_enabled       BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS max_tokens_per_batch   INTEGER DEFAULT 50,
  ADD COLUMN IF NOT EXISTS token_expiry_hrs       INTEGER DEFAULT 24;

-- Ensure a default settings row exists
INSERT INTO settings (maintenance_mode, operator_enabled, max_tokens_per_batch, token_expiry_hrs)
SELECT false, true, 50, 24
WHERE NOT EXISTS (SELECT 1 FROM settings LIMIT 1);


-- ── 2. ELECTIONS TABLE ───────────────────────────────────────
ALTER TABLE elections
  ADD COLUMN IF NOT EXISTS max_voters    INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS allow_abstain BOOLEAN DEFAULT FALSE;


-- ── 3. VOTERS TABLE ──────────────────────────────────────────
ALTER TABLE voters
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_voters_expires_at
  ON voters (expires_at)
  WHERE status = 'unused';

CREATE INDEX IF NOT EXISTS idx_voters_election_status
  ON voters (election_id, status);


-- ── 4. CANDIDATES TABLE ──────────────────────────────────────
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS manifesto TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_candidates_active
  ON candidates (position_id, is_active);


-- ── 5. AUDIT_LOGS TABLE ──────────────────────────────────────
ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS ip_address TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS user_agent TEXT DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_logs_admin
  ON audit_logs (admin_id, created_at DESC);


-- ── 6. PROFILES TABLE ────────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS full_name TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS role      TEXT DEFAULT 'admin';


-- ── 7. DB VIEWS ──────────────────────────────────────────────

-- candidate_standings: pre-aggregated vote counts, ranked per position
-- FIX: DROP first because CREATE OR REPLACE cannot rename existing columns
DROP VIEW IF EXISTS candidate_standings CASCADE;
CREATE VIEW candidate_standings AS
SELECT
  c.id          AS candidate_id,
  c.name        AS candidate_name,
  c.photo_url,
  c.bio,
  c.is_active,
  p.id          AS position_id,
  p.title       AS position_title,
  p.election_id,
  p.order_index,
  COUNT(v.id)   AS vote_count,
  RANK() OVER (
    PARTITION BY p.id
    ORDER BY COUNT(v.id) DESC
  )             AS rank_in_position
FROM   candidates c
JOIN   positions  p ON p.id = c.position_id
LEFT JOIN votes   v ON v.candidate_id = c.id
WHERE  c.is_active = TRUE
GROUP  BY c.id, c.name, c.photo_url, c.bio, c.is_active,
          p.id, p.title, p.election_id, p.order_index;


-- election_summary: turnout stats, excludes revoked tokens
-- FIX: DROP first because CREATE OR REPLACE cannot rename existing columns
DROP VIEW IF EXISTS election_summary CASCADE;
CREATE VIEW election_summary AS
SELECT
  e.id,
  e.name,
  e.status,
  e.starts_at,
  e.ends_at,
  e.created_at,
  COUNT(DISTINCT vt.id) FILTER (WHERE vt.status <> 'revoked') AS total_voters,
  COUNT(DISTINCT vt.id) FILTER (WHERE vt.status = 'used')     AS votes_cast,
  CASE
    WHEN COUNT(DISTINCT vt.id) FILTER (WHERE vt.status <> 'revoked') = 0 THEN 0
    ELSE ROUND(
      COUNT(DISTINCT vt.id) FILTER (WHERE vt.status = 'used')::NUMERIC /
      COUNT(DISTINCT vt.id) FILTER (WHERE vt.status <> 'revoked') * 100,
      2
    )
  END AS turnout_pct
FROM   elections e
LEFT JOIN voters vt ON vt.election_id = e.id
GROUP  BY e.id, e.name, e.status, e.starts_at, e.ends_at, e.created_at;


-- ── 8. RLS POLICIES ──────────────────────────────────────────

-- Settings
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins_read_settings"  ON settings;
DROP POLICY IF EXISTS "admins_write_settings" ON settings;
CREATE POLICY "admins_read_settings"  ON settings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "admins_write_settings" ON settings FOR ALL    USING (auth.role() = 'authenticated');

-- Audit logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins_read_audit_logs" ON audit_logs;
CREATE POLICY "admins_read_audit_logs" ON audit_logs FOR SELECT USING (auth.role() = 'authenticated');

-- Voters (anon can read for token validation via RPC)
ALTER TABLE voters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "voters_read_policy" ON voters;
CREATE POLICY "voters_read_policy" ON voters FOR SELECT USING (TRUE);

-- Votes
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "voters_insert_vote" ON votes;
DROP POLICY IF EXISTS "admins_read_votes"  ON votes;
CREATE POLICY "voters_insert_vote" ON votes FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "admins_read_votes"  ON votes FOR SELECT USING (auth.role() = 'authenticated');


-- ── 9. RPC: get_elections_for_tokens ─────────────────────────
-- Operators (anon) call this to list elections available for
-- token generation. SECURITY DEFINER bypasses RLS safely.

-- FIX: DROP first — CREATE OR REPLACE cannot change return type of existing function
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


-- ── 10. TOKEN AUTO-EXPIRY (optional pg_cron job) ─────────────
-- Uncomment if pg_cron extension is enabled on your project:
--
-- SELECT cron.schedule('expire-tokens', '*/5 * * * *', $$
--   UPDATE voters
--   SET    status = 'expired'
--   WHERE  status = 'unused'
--     AND  expires_at IS NOT NULL
--     AND  expires_at < NOW();
-- $$);

-- ============================================================
-- END OF MIGRATION v3
-- ============================================================
