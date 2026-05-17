-- =============================================================================
-- Migration 0002: add a managed `categories` lookup table
-- =============================================================================
-- Effect:
--   * Adds `categories(id, name, created_at)`
--   * Seeds it with the 5 categories that were hardcoded in the backend:
--       Proposals, Permits, Budgets, Reports, Financial Records
--   * Enables RLS: any authenticated user can read; only chief_minister can write
--
-- Note (scope decision):
--   * documents.category stays as TEXT for now. The backend will validate
--     incoming category strings against names in this table on upload/edit.
--   * Promoting documents.category to a UUID FK (like administrations) is a
--     separate, larger migration that touches every row and every read path,
--     and is deliberately out of scope for this change.
--
-- This script is idempotent — running it twice is safe.
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 1 — RUN THE MIGRATION (everything below, as one block)
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN;

-- 1. Create the categories table
CREATE TABLE IF NOT EXISTS categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Prevent duplicate categories like "Proposals" vs "proposals "
CREATE UNIQUE INDEX IF NOT EXISTS categories_name_lower_uniq
  ON categories (lower(name));

-- 2. Seed with the previously-hardcoded category names. Idempotent — only
--    inserts rows whose lower(name) isn't already present.
INSERT INTO categories (name)
SELECT s.v FROM (VALUES
  ('Proposals'),
  ('Permits'),
  ('Budgets'),
  ('Reports'),
  ('Financial Records')
) AS s(v)
WHERE NOT EXISTS (
  SELECT 1 FROM categories c WHERE lower(c.name) = lower(s.v)
);

-- 3. RLS — any authenticated user can read; only chief_minister can write.
--    The backend uses the service-role key so it bypasses these anyway;
--    this is defense-in-depth for any direct anon-key access.
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS categories_read ON categories;
CREATE POLICY categories_read
  ON categories
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS categories_write_admin ON categories;
CREATE POLICY categories_write_admin
  ON categories
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

-- 2a. Confirm categories were seeded
--
--   SELECT id, name FROM categories ORDER BY name;

-- 2b. Confirm RLS policies are active
--
--   SELECT policyname, cmd, roles
--   FROM pg_policies
--   WHERE schemaname = 'public' AND tablename = 'categories';
