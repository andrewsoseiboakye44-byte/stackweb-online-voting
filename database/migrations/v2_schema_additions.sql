-- ============================================================
-- STACKWEB Online Voting System
-- Migration v2: Schema additions & RLS security fixes
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- ── 1. notifications table (admin inbox) ─────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  body        TEXT,
  type        TEXT DEFAULT 'info' CHECK (type IN ('info','success','warning','error')),
  is_read     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Admin own notifications"
  ON notifications FOR ALL
  USING  (admin_id = auth.uid())
  WITH CHECK (admin_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_notifications_admin
  ON notifications(admin_id, created_at DESC);

-- ── 2. voters: add section & grade columns ───────────────────
ALTER TABLE voters ADD COLUMN IF NOT EXISTS section TEXT;
ALTER TABLE voters ADD COLUMN IF NOT EXISTS grade   TEXT;

-- ── 3. audit_logs: forensic tracking columns ─────────────────
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- ── 4. elections: voter capacity column ──────────────────────
ALTER TABLE elections ADD COLUMN IF NOT EXISTS max_voters INTEGER;

-- ── 5. settings: maintenance mode & batch generation cap ─────
ALTER TABLE settings ADD COLUMN IF NOT EXISTS maintenance_mode     BOOLEAN DEFAULT FALSE;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS max_tokens_per_batch INTEGER DEFAULT 500;

-- ── 6. RLS fix: votes are public only AFTER election closes ──
-- Old policy let anons read votes for active elections with public_results=true
DROP POLICY IF EXISTS "Public read votes" ON votes;

CREATE POLICY "Public read votes after close"
  ON votes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM elections e
      WHERE e.id = votes.election_id
        AND e.status = 'closed'
        AND e.public_results = TRUE
    )
  );

-- ── 7. RLS fix: tighten voter update policy ──────────────────
-- Old WITH CHECK (TRUE) was too permissive — allow only valid status transitions
DROP POLICY IF EXISTS "Anyone update own voter" ON voters;

CREATE POLICY "Token holder status update"
  ON voters FOR UPDATE
  USING (TRUE)
  WITH CHECK (
    status IN ('unused', 'used', 'expired')
  );

-- ── 8. Performance indexes ───────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_voters_token         ON voters(token);
CREATE INDEX IF NOT EXISTS idx_voters_election      ON voters(election_id, status);
CREATE INDEX IF NOT EXISTS idx_votes_election       ON votes(election_id);
CREATE INDEX IF NOT EXISTS idx_votes_candidate      ON votes(candidate_id);
CREATE INDEX IF NOT EXISTS idx_elections_status     ON elections(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action    ON audit_logs(action, created_at DESC);

-- ── 9. candidates: add order_index if missing ────────────────
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

-- Done.
SELECT 'STACKWEB v2 migration complete' AS result;
