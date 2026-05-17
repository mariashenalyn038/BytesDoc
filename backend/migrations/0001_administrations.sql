-- =============================================================================
-- Migration 0001: extract `documents.administration` (text) into its own table
-- =============================================================================
-- Effect:
--   * Adds `administrations(id, name, start_date, end_date, created_at)`
--   * Seeds it from every DISTINCT non-empty value in `documents.administration`
--   * Adds `documents.administration_id uuid` FK
--   * Backfills the FK by matching name (case-insensitive, trimmed)
--   * Drops the old text column
--   * Enables RLS: any authenticated user can read; only chief_minister can write
--
-- This script is idempotent — running it twice is safe.
-- The whole migration runs inside a single transaction; if any safety check
-- fails, NOTHING is applied.
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 0 — PREFLIGHT (run these BEFORE the migration, separately)
-- ─────────────────────────────────────────────────────────────────────────────
-- Paste each query individually into the Supabase SQL editor and inspect.
-- Do NOT run the migration block below until these look right.

-- 0a. What distinct administration values exist today, and how many docs each?
--     If you see typos (e.g. "Admin A" and "admin a "), clean them up first
--     by UPDATEing documents.administration to a canonical spelling.
--
--   SELECT
--     administration,
--     count(*) AS doc_count
--   FROM documents
--   GROUP BY administration
--   ORDER BY doc_count DESC;

-- 0b. Any document with an empty/null administration? These will block the
--     final NOT NULL step. Either fix them or accept that the migration
--     leaves administration_id NULL on those rows.
--
--   SELECT id, title, administration
--   FROM documents
--   WHERE administration IS NULL OR btrim(administration) = '';


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 1 — RUN THE MIGRATION (everything below, as one block)
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN;

-- 1. Create the administrations table
CREATE TABLE IF NOT EXISTS administrations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  start_date  date NOT NULL,
  end_date    date,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Prevent duplicate administrations like "Admin A" vs "admin a"
CREATE UNIQUE INDEX IF NOT EXISTS administrations_name_lower_uniq
  ON administrations (lower(name));

-- 2. Seed administrations from existing distinct values in documents.
--    Only inserts rows that don't already exist (idempotent).
--    Uses '2024-01-01' as a placeholder start_date — the admin can edit
--    real dates from the Administrations settings panel after migration.
INSERT INTO administrations (name, start_date)
SELECT DISTINCT btrim(d.administration), DATE '2024-01-01'
FROM documents d
WHERE d.administration IS NOT NULL
  AND btrim(d.administration) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM administrations a
    WHERE lower(a.name) = lower(btrim(d.administration))
  );

-- 3. Add the nullable FK column on documents (skip if it already exists)
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS administration_id uuid;

-- 4. Backfill the FK by case-insensitive name match
UPDATE documents d
SET administration_id = a.id
FROM administrations a
WHERE d.administration_id IS NULL
  AND d.administration IS NOT NULL
  AND lower(btrim(d.administration)) = lower(a.name);

-- 5. Safety check — abort the whole transaction if any document still has
--    a non-empty administration text but no matching administration_id.
--    Only runs while the old text column is still present (post-migration
--    re-run is a no-op).
DO $$
DECLARE
  unmatched int;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'documents'
      AND column_name = 'administration'
  ) THEN
    SELECT count(*) INTO unmatched
    FROM documents
    WHERE administration IS NOT NULL
      AND btrim(administration) <> ''
      AND administration_id IS NULL;

    IF unmatched > 0 THEN
      RAISE EXCEPTION
        'Aborting migration: % document rows have a non-empty administration text but no matching administration_id. Inspect with:  SELECT id, title, administration FROM documents WHERE administration_id IS NULL AND btrim(administration) <> ''''; ',
        unmatched;
    END IF;
  END IF;
END $$;

-- 6. Add the FK constraint (idempotent via DO block)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'documents_administration_id_fk'
      AND table_name = 'documents'
  ) THEN
    ALTER TABLE documents
      ADD CONSTRAINT documents_administration_id_fk
      FOREIGN KEY (administration_id)
      REFERENCES administrations(id)
      ON DELETE RESTRICT;
  END IF;
END $$;

-- 7. Helpful index for filter queries
CREATE INDEX IF NOT EXISTS documents_administration_id_idx
  ON documents (administration_id);

-- 8. Set NOT NULL on the FK — but only if every existing row is populated.
--    If some docs have NULL administration, leave the column nullable for now
--    and the operator can clean those up via the settings page.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM documents WHERE administration_id IS NULL) THEN
    ALTER TABLE documents
      ALTER COLUMN administration_id SET NOT NULL;
  ELSE
    RAISE NOTICE
      'administration_id left NULLABLE because some documents have NULL. Inspect: SELECT id, title FROM documents WHERE administration_id IS NULL;';
  END IF;
END $$;

-- 9. Drop the old text column
ALTER TABLE documents DROP COLUMN IF EXISTS administration;

-- 10. RLS — any authenticated user can read; only chief_minister can write.
--     Backend uses the service-role key so it bypasses these anyway;
--     this is defense-in-depth for any direct anon-key access.
ALTER TABLE administrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS administrations_read ON administrations;
CREATE POLICY administrations_read
  ON administrations
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS administrations_write_admin ON administrations;
CREATE POLICY administrations_write_admin
  ON administrations
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

-- 2a. Confirm administrations were seeded
--
--   SELECT id, name, start_date, end_date FROM administrations ORDER BY name;

-- 2b. Confirm every document is linked to an administration
--
--   SELECT count(*) AS total,
--          count(administration_id) AS linked,
--          count(*) - count(administration_id) AS unlinked
--   FROM documents;

-- 2c. Confirm the old column is gone
--
--   SELECT column_name FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'documents'
--   ORDER BY ordinal_position;

-- 2d. Confirm RLS policies are active
--
--   SELECT policyname, cmd, roles
--   FROM pg_policies
--   WHERE schemaname = 'public' AND tablename = 'administrations';
