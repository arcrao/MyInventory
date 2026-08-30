-- ========================================
-- MIGRATION: Require an Inventory Role to View Inventory Data
-- ========================================
-- Makes Inventory access symmetric with Gym (see
-- migration_add_gym_checkin.sql, which already requires an explicit
-- gym_roles row to view or modify anything in Gym).
--
-- Today, Products/Categories/Locations/History can be VIEWED by ANY
-- signed-in Supabase user, even one who was never assigned a row in
-- user_roles - the SELECT policies only check "auth.uid() IS NOT NULL".
-- That means a user created only for Gym access would still be able to
-- browse all Inventory data. This migration closes that gap: viewing
-- Inventory now requires an explicit user_roles row (role 'user',
-- 'admin', or 'super_admin' - any of them qualifies to view).
--
-- SAFETY: Before tightening the policies, this backfills a 'user' role
-- for every existing auth user who doesn't already have one, so nobody
-- who currently relies on implicit view access loses it when this runs.
-- Anyone created AFTER this migration needs to be explicitly assigned a
-- role (same as the existing admin bootstrap flow) before they can see
-- any Inventory data.
--
-- Run this in Supabase SQL Editor
-- ========================================

-- Preserve current access: give every existing auth user an explicit
-- 'user' role if they don't already have one of their own.
INSERT INTO user_roles (user_id, role)
SELECT id, 'user' FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- Helper: does the current user have ANY inventory role at all
-- (view-only 'user', 'admin', or 'super_admin')?
CREATE OR REPLACE FUNCTION is_inventory_user()
RETURNS BOOLEAN AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role FROM user_roles WHERE user_id = auth.uid();
  RETURN v_role IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Products
DROP POLICY IF EXISTS "All authenticated users can view products" ON products;
CREATE POLICY "Inventory users can view products"
  ON products FOR SELECT
  USING (is_inventory_user());

-- Categories
DROP POLICY IF EXISTS "All authenticated users can view categories" ON categories;
CREATE POLICY "Inventory users can view categories"
  ON categories FOR SELECT
  USING (is_inventory_user());

-- Locations
DROP POLICY IF EXISTS "All authenticated users can view locations" ON locations;
CREATE POLICY "Inventory users can view locations"
  ON locations FOR SELECT
  USING (is_inventory_user());

-- History
DROP POLICY IF EXISTS "All authenticated users can view history" ON history;
CREATE POLICY "Inventory users can view history"
  ON history FOR SELECT
  USING (is_inventory_user());

-- ========================================
-- MIGRATION COMPLETE
-- ========================================
-- After running this:
-- 1. Everyone who already had (or was just backfilled into) a
--    user_roles row keeps seeing Inventory exactly as before.
-- 2. A brand-new signup with no user_roles row can no longer view any
--    Inventory data until an admin assigns them a role, e.g.:
--      INSERT INTO user_roles (user_id, role)
--      VALUES ('their-user-id-here', 'user')
--      ON CONFLICT (user_id) DO UPDATE SET role = 'user';
-- 3. Write access (INSERT/UPDATE/DELETE) is unchanged - still gated by
--    is_admin() (role 'admin'/'super_admin'), same as before.
-- 4. Gym access is unaffected - it already required an explicit
--    gym_roles row.
-- ========================================
