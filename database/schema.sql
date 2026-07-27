-- STACKWEB Online Voting System - Database Schema
-- Run this entire file in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- PROFILES (Admin users, linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'superadmin')),
  full_name   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- ELECTIONS
CREATE TABLE IF NOT EXISTS elections (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  description     TEXT,
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','paused','closed')),
  starts_at       TIMESTAMPTZ,
  ends_at         TIMESTAMPTZ,
  started_at      TIMESTAMPTZ,
  closed_at       TIMESTAMPTZ,
  public_results  BOOLEAN NOT NULL DEFAULT FALSE,
  allow_abstain   BOOLEAN NOT NULL DEFAULT FALSE,
  created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_elections_status ON elections(status);

-- POSITIONS (within an election)
CREATE TABLE IF NOT EXISTS positions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  election_id  UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  order_index  INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_positions_election ON positions(election_id);

-- CANDIDATES
CREATE TABLE IF NOT EXISTS candidates (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  position_id  UUID NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  bio          TEXT,
  manifesto    TEXT,
  photo_url    TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  order_index  INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_candidates_position ON candidates(position_id);

-- VOTERS (token holders)
CREATE TABLE IF NOT EXISTS voters (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  election_id   UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  token         TEXT NOT NULL UNIQUE,
  student_name  TEXT NOT NULL DEFAULT 'Voter',
  email         TEXT,
  class         TEXT,
  status        TEXT NOT NULL DEFAULT 'unused' CHECK (status IN ('unused','used','revoked','expired')),
  used_at       TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_voters_election ON voters(election_id);
CREATE INDEX IF NOT EXISTS idx_voters_token    ON voters(token);
CREATE INDEX IF NOT EXISTS idx_voters_status   ON voters(status);

-- VOTES (anonymous)
CREATE TABLE IF NOT EXISTS votes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  election_id   UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  position_id   UUID NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  candidate_id  UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  voter_id      UUID REFERENCES voters(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_votes_election  ON votes(election_id);
CREATE INDEX IF NOT EXISTS idx_votes_position  ON votes(position_id);
CREATE INDEX IF NOT EXISTS idx_votes_candidate ON votes(candidate_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_votes_voter_position
  ON votes(voter_id, position_id)
  WHERE voter_id IS NOT NULL;

-- AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action       TEXT NOT NULL,
  description  TEXT,
  metadata     JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action  ON audit_logs(action);

-- SETTINGS (single row)
CREATE TABLE IF NOT EXISTS settings (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_name      TEXT,
  school_motto     TEXT,
  school_logo_url  TEXT,
  primary_color    TEXT DEFAULT '#4f46e5',
  secondary_color  TEXT DEFAULT '#14b8a6',
  results_public   BOOLEAN DEFAULT FALSE,
  allow_abstain    BOOLEAN DEFAULT FALSE,
  show_bios        BOOLEAN DEFAULT TRUE,
  show_photos      BOOLEAN DEFAULT TRUE,
  token_expiry_hrs INTEGER DEFAULT 24,
  operator_username TEXT DEFAULT 'tokenstaff',
  operator_password TEXT DEFAULT 'ChangeMe123',
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO settings (school_name, primary_color, secondary_color)
  VALUES ('My School', '#4f46e5', '#14b8a6')
  ON CONFLICT DO NOTHING;

-- ROW LEVEL SECURITY
ALTER TABLE profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE elections  ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE voters     ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings   ENABLE ROW LEVEL SECURITY;

-- Helper: is this an admin?
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin','superadmin')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- PROFILES policies
CREATE POLICY "Admins read profiles"   ON profiles FOR SELECT USING (is_admin());
CREATE POLICY "Admins update profiles" ON profiles FOR UPDATE USING (auth.uid() = id);

-- ELECTIONS policies
CREATE POLICY "Admin manage elections" ON elections FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Public read elections"  ON elections FOR SELECT USING (status IN ('active','closed'));

-- POSITIONS policies
CREATE POLICY "Admin manage positions" ON positions FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Public read positions"  ON positions FOR SELECT USING (
  EXISTS (SELECT 1 FROM elections WHERE id = positions.election_id AND status IN ('active','closed'))
);

-- CANDIDATES policies
-- Only admins (role = 'admin' or 'superadmin') may insert/update/delete candidates.
CREATE POLICY "Admins manage candidates" ON candidates FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Public read candidates"  ON candidates FOR SELECT USING (
  is_active = TRUE
  AND EXISTS (SELECT 1 FROM positions pos
    JOIN elections e ON e.id = pos.election_id
    WHERE pos.id = candidates.position_id
    AND e.status IN ('active','closed')
  )
);

-- VOTERS policies
-- Admins can fully manage voters.
-- Anonymous users (voter login flow) can read non-revoked voter rows to validate their token.
CREATE POLICY "Admin manage voters"     ON voters FOR ALL    USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Public read active voters" ON voters FOR SELECT USING (status != 'revoked');
CREATE POLICY "Anyone update own voter" ON voters FOR UPDATE USING (TRUE) WITH CHECK (TRUE);

-- VOTES policies
CREATE POLICY "Admin read votes"   ON votes FOR SELECT USING (is_admin());
CREATE POLICY "Public read votes"  ON votes FOR SELECT USING (
  EXISTS (SELECT 1 FROM elections WHERE id = votes.election_id AND (public_results OR status = 'closed'))
);
CREATE POLICY "Anyone insert vote" ON votes FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM elections WHERE id = votes.election_id AND status = 'active')
);

-- AUDIT LOGS policies
CREATE POLICY "Admin all audit"      ON audit_logs FOR ALL    USING (is_admin());
CREATE POLICY "Service audit insert" ON audit_logs FOR INSERT WITH CHECK (TRUE);

-- SETTINGS policies
CREATE POLICY "Admin manage settings" ON settings FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Service read settings" ON settings FOR SELECT USING (TRUE);

-- VIEWS
CREATE OR REPLACE VIEW election_summary AS
SELECT
  e.id, e.name, e.status, e.starts_at, e.ends_at, e.public_results,
  COUNT(DISTINCT v.id)  AS total_voters,
  COUNT(DISTINCT vt.id) AS total_votes,
  CASE
    WHEN COUNT(DISTINCT v.id) > 0
    THEN ROUND((COUNT(DISTINCT vt.id)::NUMERIC / COUNT(DISTINCT v.id)) * 100, 1)
    ELSE 0
  END AS turnout_pct
FROM elections e
LEFT JOIN voters v  ON v.election_id = e.id
LEFT JOIN votes  vt ON vt.election_id = e.id
GROUP BY e.id;

CREATE OR REPLACE VIEW candidate_standings AS
SELECT
  c.id, c.name, c.photo_url,
  p.title AS position,
  e.id    AS election_id,
  e.name  AS election_name,
  COUNT(vt.id) AS vote_count,
  RANK() OVER (PARTITION BY p.id ORDER BY COUNT(vt.id) DESC) AS rank_in_position
FROM candidates c
JOIN positions p ON p.id = c.position_id
JOIN elections e ON e.id = p.election_id
LEFT JOIN votes vt ON vt.candidate_id = c.id
WHERE c.is_active = TRUE
GROUP BY c.id, c.name, c.photo_url, p.id, p.title, e.id, e.name;

-- OPERATOR PORTAL FUNCTIONS
-- Returns election names for the operator token portal (no sensitive details)
CREATE OR REPLACE FUNCTION get_elections_for_tokens()
RETURNS TABLE(id UUID, name TEXT, status TEXT) AS $$
  SELECT id, name, status
  FROM elections
  WHERE status IN ('draft', 'active', 'paused')
  ORDER BY created_at DESC;
$$ LANGUAGE sql SECURITY DEFINER STABLE;
GRANT EXECUTE ON FUNCTION get_elections_for_tokens TO anon;

-- Generates voter tokens and inserts them into the voters table
CREATE OR REPLACE FUNCTION generate_voter_tokens(
  p_election_id UUID,
  p_count       INT,
  p_prefix      TEXT DEFAULT 'SW'
)
RETURNS TABLE(token TEXT, student_name TEXT) AS $$
DECLARE
  i         INT;
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION generate_voter_tokens TO anon;
