-- ========================================
-- MIGRATION: Add Fire Extinguishers Register
-- ========================================
-- Adds a fire extinguisher register as a new tab in the application.
--
-- This migration is PURELY ADDITIVE. It does not ALTER, DROP or replace any
-- existing table, policy or function. In particular it CALLS is_admin() and
-- is_super_admin() but never redefines them, so existing product, history,
-- category and location behaviour is completely unaffected.
--
-- Key design points:
-- - Identity of an extinguisher is its physical position, not a serial number,
--   so records are keyed on AREA + LOCATION + EXTINGUISHER NO.
-- - unique_key is a STORED GENERATED column so the database (not client code)
--   is the single source of truth for that key, and ON CONFLICT has a real
--   unique index to target. Re-importing a corrected sheet updates rows
--   instead of creating duplicates.
-- - fire_extinguisher_history is append-only: it is granted SELECT and INSERT
--   only. With RLS enabled, the ABSENCE of UPDATE/DELETE policies is what makes
--   the audit trail immutable. This mirrors the existing history table.
--
-- Security:
-- - Two independent layers, because SECURITY DEFINER bypasses RLS:
--     1. RLS policies on the table (cover direct PostgREST calls from a browser)
--     2. An explicit role check as the first statement inside every RPC
-- - SELECT: any authenticated user       INSERT/UPDATE: is_admin()
-- - DELETE: is_super_admin() -- deliberately stricter, matching the products
--   table (see migration_update_delete_policy_super_admin.sql)
-- - Every SECURITY DEFINER function sets an explicit search_path, closing the
--   definer-rights privilege escalation vector that Supabase's linter flags as
--   function_search_path_mutable.
--
-- Run this in Supabase SQL Editor
-- ========================================

-- ========================================
-- TABLE: fire_extinguishers
-- ========================================
CREATE TABLE IF NOT EXISTS fire_extinguishers (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- The three columns that together identify a unit
  area TEXT NOT NULL,
  location TEXT NOT NULL,
  extinguisher_no TEXT NOT NULL,

  -- Composite unique ID, derived from the three key columns.
  -- Normalisation (collapse internal whitespace, trim, uppercase) means
  -- 'BLOCK 1' / '1 FLOOR ' / '1' and 'block 1' / ' 1  floor ' / '1'
  -- resolve to the same record. All three functions are IMMUTABLE, which a
  -- generated column requires.
  unique_key TEXT GENERATED ALWAYS AS (
    upper(btrim(regexp_replace(area,            '\s+', ' ', 'g'))) || '|' ||
    upper(btrim(regexp_replace(location,        '\s+', ' ', 'g'))) || '|' ||
    upper(btrim(regexp_replace(extinguisher_no, '\s+', ' ', 'g')))
  ) STORED,

  type TEXT,
  capacity TEXT,
  pressure TEXT,
  inspection_tag TEXT,
  safety_pin TEXT,
  refilled_date DATE,
  refilling_due_date DATE,
  remarks TEXT,

  -- Which sheet / uploaded file this row last came from
  source_sheet TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT fire_extinguishers_unique_key_unique UNIQUE (unique_key)
);

-- ========================================
-- TABLE: fire_extinguisher_history
-- ========================================
-- extinguisher_id is nullable with ON DELETE SET NULL and extinguisher_key
-- holds a denormalised snapshot, so the audit trail survives deletion of the
-- record it describes. Same technique as history.product_name.
CREATE TABLE IF NOT EXISTS fire_extinguisher_history (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  extinguisher_id BIGINT REFERENCES fire_extinguishers(id) ON DELETE SET NULL,
  extinguisher_key TEXT,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'imported')),
  changes TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- INDEXES
-- ========================================
CREATE INDEX IF NOT EXISTS idx_fire_extinguishers_user_id ON fire_extinguishers(user_id);
CREATE INDEX IF NOT EXISTS idx_fire_extinguishers_area ON fire_extinguishers(area);
CREATE INDEX IF NOT EXISTS idx_fire_extinguishers_due_date ON fire_extinguishers(refilling_due_date);
CREATE INDEX IF NOT EXISTS idx_fire_extinguisher_history_user_id ON fire_extinguisher_history(user_id);
CREATE INDEX IF NOT EXISTS idx_fire_extinguisher_history_ext_id ON fire_extinguisher_history(extinguisher_id);

-- ========================================
-- ROW LEVEL SECURITY
-- ========================================
ALTER TABLE fire_extinguishers ENABLE ROW LEVEL SECURITY;
ALTER TABLE fire_extinguisher_history ENABLE ROW LEVEL SECURITY;

-- Fire Extinguishers Policies
CREATE POLICY "All authenticated users can view fire extinguishers"
  ON fire_extinguishers FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can insert fire extinguishers"
  ON fire_extinguishers FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Only admins can update fire extinguishers"
  ON fire_extinguishers FOR UPDATE
  USING (is_admin());

-- Deliberately stricter than INSERT/UPDATE: a fire safety register is a
-- compliance record, so deletion is the most restricted action.
CREATE POLICY "Only super admins can delete fire extinguishers"
  ON fire_extinguishers FOR DELETE
  USING (is_super_admin());

-- Fire Extinguisher History Policies
-- SELECT and INSERT ONLY. There is intentionally no UPDATE or DELETE policy:
-- with RLS enabled that makes the audit trail immutable to all clients.
CREATE POLICY "All authenticated users can view extinguisher history"
  ON fire_extinguisher_history FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can insert extinguisher history"
  ON fire_extinguisher_history FOR INSERT
  WITH CHECK (is_admin());

-- ========================================
-- FUNCTION: add_fire_extinguisher_with_history
-- ========================================
CREATE OR REPLACE FUNCTION add_fire_extinguisher_with_history(
  p_area TEXT,
  p_location TEXT,
  p_extinguisher_no TEXT,
  p_type TEXT DEFAULT NULL,
  p_capacity TEXT DEFAULT NULL,
  p_pressure TEXT DEFAULT NULL,
  p_inspection_tag TEXT DEFAULT NULL,
  p_safety_pin TEXT DEFAULT NULL,
  p_refilled_date DATE DEFAULT NULL,
  p_refilling_due_date DATE DEFAULT NULL,
  p_remarks TEXT DEFAULT NULL,
  p_source_sheet TEXT DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  v_id BIGINT;
  v_key TEXT;
  v_user_id UUID;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can add fire extinguishers';
  END IF;

  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  IF p_area IS NULL OR btrim(p_area) = '' THEN
    RAISE EXCEPTION 'Area is required';
  END IF;

  IF p_location IS NULL OR btrim(p_location) = '' THEN
    RAISE EXCEPTION 'Location is required';
  END IF;

  IF p_extinguisher_no IS NULL OR btrim(p_extinguisher_no) = '' THEN
    RAISE EXCEPTION 'Extinguisher number is required';
  END IF;

  INSERT INTO fire_extinguishers (
    user_id, area, location, extinguisher_no, type, capacity, pressure,
    inspection_tag, safety_pin, refilled_date, refilling_due_date, remarks, source_sheet
  ) VALUES (
    v_user_id, btrim(p_area), btrim(p_location), btrim(p_extinguisher_no),
    p_type, p_capacity, p_pressure, p_inspection_tag, p_safety_pin,
    p_refilled_date, p_refilling_due_date, p_remarks, p_source_sheet
  )
  RETURNING id, unique_key INTO v_id, v_key;

  INSERT INTO fire_extinguisher_history (
    user_id, extinguisher_id, extinguisher_key, action, notes
  ) VALUES (
    v_user_id, v_id, v_key, 'created', 'Fire extinguisher record created'
  );

  RETURN json_build_object('id', v_id, 'unique_key', v_key);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ========================================
-- FUNCTION: update_fire_extinguisher_with_history
-- ========================================
CREATE OR REPLACE FUNCTION update_fire_extinguisher_with_history(
  p_id BIGINT,
  p_area TEXT,
  p_location TEXT,
  p_extinguisher_no TEXT,
  p_type TEXT DEFAULT NULL,
  p_capacity TEXT DEFAULT NULL,
  p_pressure TEXT DEFAULT NULL,
  p_inspection_tag TEXT DEFAULT NULL,
  p_safety_pin TEXT DEFAULT NULL,
  p_refilled_date DATE DEFAULT NULL,
  p_refilling_due_date DATE DEFAULT NULL,
  p_remarks TEXT DEFAULT NULL,
  p_source_sheet TEXT DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  v_old fire_extinguishers%ROWTYPE;
  v_key TEXT;
  v_user_id UUID;
  v_changes TEXT := '';
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can update fire extinguishers';
  END IF;

  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Row-level lock prevents concurrent-edit races
  SELECT * INTO v_old FROM fire_extinguishers WHERE id = p_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fire extinguisher not found';
  END IF;

  IF p_area IS NULL OR btrim(p_area) = ''
     OR p_location IS NULL OR btrim(p_location) = ''
     OR p_extinguisher_no IS NULL OR btrim(p_extinguisher_no) = '' THEN
    RAISE EXCEPTION 'Area, Location and Extinguisher No are required';
  END IF;

  -- Build a human-readable field diff for the audit trail
  IF btrim(p_area) IS DISTINCT FROM v_old.area THEN
    v_changes := v_changes || format('Area: %s -> %s; ', v_old.area, btrim(p_area));
  END IF;
  IF btrim(p_location) IS DISTINCT FROM v_old.location THEN
    v_changes := v_changes || format('Location: %s -> %s; ', v_old.location, btrim(p_location));
  END IF;
  IF btrim(p_extinguisher_no) IS DISTINCT FROM v_old.extinguisher_no THEN
    v_changes := v_changes || format('Extinguisher No: %s -> %s; ', v_old.extinguisher_no, btrim(p_extinguisher_no));
  END IF;
  IF p_type IS DISTINCT FROM v_old.type THEN
    v_changes := v_changes || format('Type: %s -> %s; ', coalesce(v_old.type, ''), coalesce(p_type, ''));
  END IF;
  IF p_capacity IS DISTINCT FROM v_old.capacity THEN
    v_changes := v_changes || format('Capacity: %s -> %s; ', coalesce(v_old.capacity, ''), coalesce(p_capacity, ''));
  END IF;
  IF p_pressure IS DISTINCT FROM v_old.pressure THEN
    v_changes := v_changes || format('Pressure: %s -> %s; ', coalesce(v_old.pressure, ''), coalesce(p_pressure, ''));
  END IF;
  IF p_inspection_tag IS DISTINCT FROM v_old.inspection_tag THEN
    v_changes := v_changes || format('Inspection Tag: %s -> %s; ', coalesce(v_old.inspection_tag, ''), coalesce(p_inspection_tag, ''));
  END IF;
  IF p_safety_pin IS DISTINCT FROM v_old.safety_pin THEN
    v_changes := v_changes || format('Safety Pin: %s -> %s; ', coalesce(v_old.safety_pin, ''), coalesce(p_safety_pin, ''));
  END IF;
  IF p_refilled_date IS DISTINCT FROM v_old.refilled_date THEN
    v_changes := v_changes || format('Refilled Date: %s -> %s; ', coalesce(v_old.refilled_date::TEXT, ''), coalesce(p_refilled_date::TEXT, ''));
  END IF;
  IF p_refilling_due_date IS DISTINCT FROM v_old.refilling_due_date THEN
    v_changes := v_changes || format('Refilling Due Date: %s -> %s; ', coalesce(v_old.refilling_due_date::TEXT, ''), coalesce(p_refilling_due_date::TEXT, ''));
  END IF;
  IF p_remarks IS DISTINCT FROM v_old.remarks THEN
    v_changes := v_changes || 'Remarks updated; ';
  END IF;

  IF v_changes = '' THEN
    v_changes := 'No field values changed';
  END IF;

  UPDATE fire_extinguishers SET
    area = btrim(p_area),
    location = btrim(p_location),
    extinguisher_no = btrim(p_extinguisher_no),
    type = p_type,
    capacity = p_capacity,
    pressure = p_pressure,
    inspection_tag = p_inspection_tag,
    safety_pin = p_safety_pin,
    refilled_date = p_refilled_date,
    refilling_due_date = p_refilling_due_date,
    remarks = p_remarks,
    source_sheet = coalesce(p_source_sheet, source_sheet),
    updated_at = NOW()
  WHERE id = p_id
  RETURNING unique_key INTO v_key;

  INSERT INTO fire_extinguisher_history (
    user_id, extinguisher_id, extinguisher_key, action, changes, notes
  ) VALUES (
    v_user_id, p_id, v_key, 'updated', v_changes, 'Fire extinguisher record updated'
  );

  RETURN json_build_object('id', p_id, 'unique_key', v_key, 'changes', v_changes);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ========================================
-- FUNCTION: delete_fire_extinguisher_with_history
-- ========================================
-- Requires is_super_admin(), agreeing with the DELETE policy above, so the RPC
-- is not a way around the stricter table policy.
CREATE OR REPLACE FUNCTION delete_fire_extinguisher_with_history(p_id BIGINT)
RETURNS json AS $$
DECLARE
  v_old fire_extinguishers%ROWTYPE;
  v_user_id UUID;
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Only super administrators can delete fire extinguishers';
  END IF;

  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  SELECT * INTO v_old FROM fire_extinguishers WHERE id = p_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fire extinguisher not found';
  END IF;

  -- History entry is written BEFORE the delete so the audit trail is complete.
  -- extinguisher_id becomes NULL via ON DELETE SET NULL; extinguisher_key
  -- preserves which unit this was.
  INSERT INTO fire_extinguisher_history (
    user_id, extinguisher_id, extinguisher_key, action, notes
  ) VALUES (
    v_user_id, p_id, v_old.unique_key, 'deleted', 'Fire extinguisher record deleted'
  );

  DELETE FROM fire_extinguishers WHERE id = p_id;

  RETURN json_build_object('id', p_id, 'unique_key', v_old.unique_key);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ========================================
-- FUNCTION: bulk_upsert_fire_extinguishers
-- ========================================
-- The import path. Insert/update only -- an import can NEVER delete a record,
-- so a row absent from an uploaded sheet is left untouched.
--
-- Uploaded CSV content is untrusted: it arrives as a parameterised JSONB
-- argument (never concatenated into SQL) and every row is re-validated here
-- rather than trusting the client's parsing.
CREATE OR REPLACE FUNCTION bulk_upsert_fire_extinguishers(p_rows JSONB)
RETURNS json AS $$
DECLARE
  v_user_id UUID;
  v_row JSONB;
  v_id BIGINT;
  v_key TEXT;
  v_inserted INTEGER := 0;
  v_updated INTEGER := 0;
  v_errors TEXT[] := ARRAY[]::TEXT[];
  v_was_insert BOOLEAN;
  v_index INTEGER := 0;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can import fire extinguishers';
  END IF;

  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' THEN
    RAISE EXCEPTION 'Import payload must be a JSON array';
  END IF;

  IF jsonb_array_length(p_rows) > 500 THEN
    RAISE EXCEPTION 'Import batch too large (max 500 rows per call)';
  END IF;

  FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows)
  LOOP
    v_index := v_index + 1;
    BEGIN
      -- Server-side re-validation of the three key columns
      IF coalesce(btrim(v_row->>'area'), '') = ''
         OR coalesce(btrim(v_row->>'location'), '') = ''
         OR coalesce(btrim(v_row->>'extinguisher_no'), '') = '' THEN
        v_errors := array_append(v_errors,
          format('Row %s: AREA, LOCATION and EXTINGUISHER NO are required', v_index));
        CONTINUE;
      END IF;

      INSERT INTO fire_extinguishers (
        user_id, area, location, extinguisher_no, type, capacity, pressure,
        inspection_tag, safety_pin, refilled_date, refilling_due_date, remarks, source_sheet
      ) VALUES (
        v_user_id,
        btrim(v_row->>'area'),
        btrim(v_row->>'location'),
        btrim(v_row->>'extinguisher_no'),
        nullif(btrim(coalesce(v_row->>'type', '')), ''),
        nullif(btrim(coalesce(v_row->>'capacity', '')), ''),
        nullif(btrim(coalesce(v_row->>'pressure', '')), ''),
        nullif(btrim(coalesce(v_row->>'inspection_tag', '')), ''),
        nullif(btrim(coalesce(v_row->>'safety_pin', '')), ''),
        nullif(v_row->>'refilled_date', '')::DATE,
        nullif(v_row->>'refilling_due_date', '')::DATE,
        nullif(btrim(coalesce(v_row->>'remarks', '')), ''),
        nullif(btrim(coalesce(v_row->>'source_sheet', '')), '')
      )
      ON CONFLICT (unique_key) DO UPDATE SET
        area = EXCLUDED.area,
        location = EXCLUDED.location,
        extinguisher_no = EXCLUDED.extinguisher_no,
        type = EXCLUDED.type,
        capacity = EXCLUDED.capacity,
        pressure = EXCLUDED.pressure,
        inspection_tag = EXCLUDED.inspection_tag,
        safety_pin = EXCLUDED.safety_pin,
        refilled_date = EXCLUDED.refilled_date,
        refilling_due_date = EXCLUDED.refilling_due_date,
        remarks = EXCLUDED.remarks,
        source_sheet = EXCLUDED.source_sheet,
        updated_at = NOW()
      RETURNING id, unique_key, (xmax = 0) INTO v_id, v_key, v_was_insert;

      IF v_was_insert THEN
        v_inserted := v_inserted + 1;
      ELSE
        v_updated := v_updated + 1;
      END IF;

      INSERT INTO fire_extinguisher_history (
        user_id, extinguisher_id, extinguisher_key, action, changes, notes
      ) VALUES (
        v_user_id, v_id, v_key, 'imported',
        CASE WHEN v_was_insert THEN 'Created by import' ELSE 'Updated by import' END,
        coalesce(nullif(btrim(coalesce(v_row->>'source_sheet', '')), ''), 'Imported from sheet')
      );

    EXCEPTION WHEN OTHERS THEN
      -- One bad row must not abort the whole batch
      v_errors := array_append(v_errors, format('Row %s: %s', v_index, SQLERRM));
    END;
  END LOOP;

  RETURN json_build_object(
    'inserted', v_inserted,
    'updated', v_updated,
    'errors', to_jsonb(v_errors)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ========================================
-- FUNCTION: get_fire_extinguisher_summary
-- ========================================
-- Powers the clickable stat cards above the table. Counts the WHOLE register
-- (optionally narrowed by the active filters), not just the current page.
--
-- Note this is STABLE and SECURITY INVOKER (the default) -- it only reads, so
-- RLS applies to the caller normally and there is no reason to grant it
-- definer rights.
--
-- The caller passes explicit date bounds rather than the function calling
-- CURRENT_DATE, so the badge the user sees, the rows the server returns and
-- these counts always agree, with no timezone/midnight drift between client
-- and server.
CREATE OR REPLACE FUNCTION get_fire_extinguisher_summary(
  p_today DATE,
  p_due_soon_date DATE,
  p_search TEXT DEFAULT NULL,
  p_area TEXT DEFAULT NULL,
  p_type TEXT DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  v_search TEXT := nullif(btrim(coalesce(p_search, '')), '');
BEGIN
  RETURN (
    SELECT json_build_object(
      'total',    count(*),
      'overdue',  count(*) FILTER (WHERE refilling_due_date IS NOT NULL AND refilling_due_date < p_today),
      'dueSoon',  count(*) FILTER (WHERE refilling_due_date IS NOT NULL AND refilling_due_date >= p_today AND refilling_due_date <= p_due_soon_date),
      'ok',       count(*) FILTER (WHERE refilling_due_date IS NOT NULL AND refilling_due_date > p_due_soon_date),
      'noDate',   count(*) FILTER (WHERE refilling_due_date IS NULL)
    )
    FROM fire_extinguishers
    WHERE (p_area IS NULL OR p_area = '' OR area = p_area)
      AND (p_type IS NULL OR p_type = '' OR type = p_type)
      AND (
        v_search IS NULL
        OR area ILIKE '%' || v_search || '%'
        OR location ILIKE '%' || v_search || '%'
        OR extinguisher_no ILIKE '%' || v_search || '%'
        OR coalesce(remarks, '') ILIKE '%' || v_search || '%'
      )
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- ========================================
-- FUNCTION: get_fire_extinguisher_areas
-- ========================================
-- Distinct areas, for the Area filter dropdown. Read-only, SECURITY INVOKER.
CREATE OR REPLACE FUNCTION get_fire_extinguisher_areas()
RETURNS TABLE(area TEXT) AS $$
  SELECT DISTINCT fe.area
  FROM fire_extinguishers fe
  WHERE fe.area IS NOT NULL AND btrim(fe.area) <> ''
  ORDER BY fe.area;
$$ LANGUAGE sql STABLE;

-- ========================================
-- GRANTS
-- ========================================
-- Matches the convention used by the existing product/stock RPC migrations.
-- Authorization is still enforced inside each function (and by RLS); these
-- grants only make the functions callable by a logged-in user.
GRANT EXECUTE ON FUNCTION add_fire_extinguisher_with_history TO authenticated;
GRANT EXECUTE ON FUNCTION update_fire_extinguisher_with_history TO authenticated;
GRANT EXECUTE ON FUNCTION delete_fire_extinguisher_with_history TO authenticated;
GRANT EXECUTE ON FUNCTION bulk_upsert_fire_extinguishers TO authenticated;
GRANT EXECUTE ON FUNCTION get_fire_extinguisher_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_fire_extinguisher_areas TO authenticated;

-- ========================================
-- MIGRATION COMPLETE
-- ========================================
-- After running this migration:
-- 1. fire_extinguishers and fire_extinguisher_history exist with RLS enabled
-- 2. unique_key is generated and UNIQUE, so re-imports upsert instead of
--    duplicating
-- 3. Any authenticated user can view/export; admins can add/edit/import;
--    only super admins can delete
-- 4. The audit trail cannot be modified or erased by any client
-- 5. No existing table, policy or function was altered
--
-- Verify with:
--   SELECT tablename, rowsecurity FROM pg_tables
--    WHERE tablename LIKE 'fire_extinguisher%';
--   SELECT tablename, policyname, cmd FROM pg_policies
--    WHERE tablename LIKE 'fire_extinguisher%' ORDER BY tablename, cmd;
--   -- fire_extinguisher_history must show SELECT and INSERT only:
--   SELECT proname, prosecdef, proconfig FROM pg_proc
--    WHERE proname LIKE '%fire_extinguisher%';
-- ========================================
