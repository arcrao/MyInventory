-- ========================================
-- FIX: Ambiguous column reference in is_admin() function
-- ========================================
-- This fixes the "column reference 'role' is ambiguous" error
-- by explicitly prefixing the role column with the table alias.
--
-- Run this in Supabase SQL Editor
-- ========================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_email TEXT;
  user_role TEXT;
BEGIN
  -- Get current user's email
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = auth.uid();

  -- Check if any user with this email is admin or super_admin
  -- FIX: Explicitly prefix 'role' with table alias 'ur' to avoid ambiguity
  SELECT ur.role INTO user_role
  FROM user_roles ur
  JOIN auth.users au ON au.id = ur.user_id
  WHERE au.email = user_email
    AND ur.role IN ('admin', 'super_admin')
  LIMIT 1;

  RETURN user_role IN ('admin', 'super_admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- MIGRATION COMPLETE
-- ========================================
-- The is_admin() function now explicitly references ur.role
-- to avoid ambiguity when joining user_roles with auth.users.
-- ========================================
