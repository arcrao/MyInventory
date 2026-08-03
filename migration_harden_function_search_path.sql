-- ========================================
-- MIGRATION: Harden search_path on SECURITY DEFINER functions
-- ========================================
-- Fixes the issue Supabase's linter reports as function_search_path_mutable.
--
-- The problem
-- -----------
-- A SECURITY DEFINER function runs with the privileges of its owner. If it does
-- not pin its own search_path, unqualified names inside the body (tables, other
-- functions, operators) are resolved using the CALLER's search_path. A caller
-- who can create objects in a schema that sits earlier on that path can
-- therefore shadow a name the function relies on and have their own code run
-- with the owner's privileges. This is the standard privilege-escalation vector
-- for definer-rights functions.
--
-- The existing is_admin(), is_super_admin() and product/stock RPCs were all
-- created without a search_path setting. The fire extinguisher functions added
-- in migration_add_fire_extinguishers.sql already set it.
--
-- The fix
-- -------
-- ALTER FUNCTION ... SET search_path attaches the setting WITHOUT touching the
-- function body. Nothing about what these functions do changes - deliberately
-- so, since reproducing each body here would risk silently reverting a later
-- fix (for example the ur.role disambiguation in
-- migration_fix_is_admin_ambiguous_column.sql).
--
-- The DO block below discovers the functions rather than hardcoding their
-- signatures, so it stays correct regardless of argument lists and is safe to
-- re-run: functions that already pin a search_path are skipped.
--
-- Note this targets SECURITY DEFINER functions only. Functions that run with
-- INVOKER rights (the default) - such as update_updated_at_column(),
-- get_fire_extinguisher_summary() and get_fire_extinguisher_areas() - carry no
-- privilege escalation risk from a mutable search_path, because they already
-- run as the caller.
--
-- Run this in Supabase SQL Editor
-- ========================================

DO $$
DECLARE
  fn RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef                       -- SECURITY DEFINER only
      AND NOT EXISTS (                      -- skip any that already pin it
        SELECT 1
        FROM unnest(coalesce(p.proconfig, ARRAY[]::TEXT[])) AS cfg
        WHERE cfg LIKE 'search_path=%'
      )
    ORDER BY 1
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', fn.signature);
    RAISE NOTICE 'Hardened search_path on %', fn.signature;
    v_count := v_count + 1;
  END LOOP;

  IF v_count = 0 THEN
    RAISE NOTICE 'No SECURITY DEFINER functions needed hardening.';
  ELSE
    RAISE NOTICE 'Hardened % function(s).', v_count;
  END IF;
END $$;

-- ========================================
-- MIGRATION COMPLETE
-- ========================================
-- Expected to harden: is_admin, is_super_admin, add_product_with_history,
-- update_product_with_history, delete_product_with_history, stock_in_product,
-- stock_out_product (and any other definer-rights function present).
--
-- Verify - every SECURITY DEFINER function should now list a search_path in
-- proconfig, and no row should come back with NULL:
--
--   SELECT p.proname,
--          p.prosecdef AS security_definer,
--          p.proconfig
--     FROM pg_proc p
--     JOIN pg_namespace n ON n.oid = p.pronamespace
--    WHERE n.nspname = 'public' AND p.prosecdef
--    ORDER BY p.proname;
--
-- Then re-run the Supabase linter: the function_search_path_mutable warnings
-- should be gone.
--
-- Behaviour is unchanged - only the resolution context of unqualified names
-- inside these functions is now fixed rather than caller-controlled.
-- ========================================
