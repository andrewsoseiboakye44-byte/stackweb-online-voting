-- STACKWEB Online Voting System — Token Expiry Migration
-- Run this in Supabase SQL Editor if your database was created before v1.1.0
-- It is safe to run multiple times (uses IF NOT EXISTS / ON CONFLICT).

-- 1. Ensure expires_at column exists on voters table
ALTER TABLE voters
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- 2. Ensure token_expiry_hrs column exists on settings table
ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS token_expiry_hrs INTEGER DEFAULT 24;

-- 3. Drop the old generate_voter_tokens signature (3 args) before replacing with 4-arg version
--    PostgreSQL treats different argument lists as separate functions, so we must drop the old one first.
DROP FUNCTION IF EXISTS generate_voter_tokens(UUID, INT, TEXT);

-- 4. Create the updated generate_voter_tokens with expiry support
CREATE OR REPLACE FUNCTION generate_voter_tokens(
  p_election_id UUID,
  p_count       INT,
  p_prefix      TEXT DEFAULT 'SW',
  p_expiry_hrs  INT  DEFAULT 24
)
RETURNS TABLE(token TEXT, student_name TEXT) AS $$
DECLARE
  i         INT;
  new_token TEXT;
  v_name    TEXT;
  v_expires TIMESTAMPTZ;
BEGIN
  v_expires := NOW() + (p_expiry_hrs || ' hours')::INTERVAL;
  FOR i IN 1..LEAST(p_count, 500) LOOP
    new_token := upper(p_prefix) || '-' ||
      upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 4)) || '-' ||
      upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 4)) || '-' ||
      upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 4));
    v_name := 'Voter ' || i;
    INSERT INTO voters (election_id, token, student_name, expires_at)
    VALUES (p_election_id, new_token, v_name, v_expires)
    ON CONFLICT (token) DO NOTHING;
    RETURN QUERY SELECT new_token, v_name;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION generate_voter_tokens(UUID, INT, TEXT, INT) TO anon;

-- 4. Optional: auto-expire stale unused tokens via a scheduled DB function
--    (Call this from a Supabase cron job or pg_cron if available)
CREATE OR REPLACE FUNCTION expire_stale_tokens()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE voters
    SET status = 'expired'
  WHERE status = 'unused'
    AND expires_at IS NOT NULL
    AND expires_at < NOW();
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
