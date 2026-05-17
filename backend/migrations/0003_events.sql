-- =============================================================================
-- Migration 0003: add a managed `events` lookup table
-- =============================================================================
-- Effect:
--   * Adds `events(id, name, created_at)`
--   * Seeds it with the 4 events that were hardcoded in the frontend:
--       Freshmen Orientation, Election 2025, Foundation Day, General
--   * Enables RLS: any authenticated user can read; only chief_minister can write
--
-- Note (scope decision, same as migration 0002):
--   * documents.event stays as TEXT for now. The backend will validate
--     incoming event strings against names in this table on upload/edit.
--   * Promoting documents.event to a UUID FK is a separate, larger migration
--     and is deliberately out of scope for this change.
--
-- This script is idempotent — running it twice is safe.
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 1 — RUN THE MIGRATION (everything below, as one block)
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN;

-- 1. Create the events table
CREATE TABLE IF NOT EXISTS events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Prevent duplicate events like "Foundation Day" vs "foundation day "
CREATE UNIQUE INDEX IF NOT EXISTS events_name_lower_uniq
  ON events (lower(name));

-- 2. Seed with the previously-hardcoded event names. Idempotent — only
--    inserts rows whose lower(name) isn't already present.
INSERT INTO events (name)
SELECT s.v FROM (VALUES
  ('Freshmen Orientation'),
  ('Election 2025'),
  ('Foundation Day'),
  ('General')
) AS s(v)
WHERE NOT EXISTS (
  SELECT 1 FROM events e WHERE lower(e.name) = lower(s.v)
);

-- 3. RLS — any authenticated user can read; only chief_minister can write.
--    The backend uses the service-role key so it bypasses these anyway;
--    this is defense-in-depth for any direct anon-key access.
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS events_read ON events;
CREATE POLICY events_read
  ON events
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS events_write_admin ON events;
CREATE POLICY events_write_admin
  ON events
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE u.id = auth.uid()
        AND r.role_name = 'chief_minister'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE u.id = auth.uid()
        AND r.role_name = 'chief_minister'
    )
  );

COMMIT;


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 2 — POSTFLIGHT (run these AFTER the migration, separately, to verify)
-- ─────────────────────────────────────────────────────────────────────────────

-- 2a. Confirm events were seeded
--
--   SELECT id, name FROM events ORDER BY name;

-- 2b. Confirm RLS policies are active
--
--   SELECT policyname, cmd, roles
--   FROM pg_policies
--   WHERE schemaname = 'public' AND tablename = 'events';
