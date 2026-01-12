-- ========================================
-- MIGRATION: Add is_super_admin() function and restrict product deletion
-- ========================================
-- This migration creates a new is_super_admin() function and updates
-- delete_product_with_history() to only allow super_admins to delete products.
--
-- Security model:
-- - super_admin: Can delete products (most privileged)
-- - admin: Can add, update, stock-in, stock-out (but NOT delete)
-- - user: Read-only access
--
-- Run this in Supabase SQL Editor
-- ========================================

-- ========================================
-- FUNCTION: is_super_admin
-- ========================================
-- Checks if the current user has super_admin role
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_email TEXT;
  user_role TEXT;
BEGIN
  -- Get current user's email
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = auth.uid();

  -- Check if any user with this email is super_admin
  SELECT ur.role INTO user_role
  FROM user_roles ur
  JOIN auth.users au ON au.id = ur.user_id
  WHERE au.email = user_email
    AND ur.role = 'super_admin'
  LIMIT 1;

  RETURN user_role = 'super_admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION is_super_admin TO authenticated;

-- ========================================
-- UPDATE: delete_product_with_history
-- ========================================
-- Update to use is_super_admin() instead of is_admin()
-- Now only super_admins can delete products
CREATE OR REPLACE FUNCTION delete_product_with_history(
  p_product_id BIGINT
)
RETURNS json AS $$
DECLARE
  v_user_id UUID;
  v_product_record RECORD;
BEGIN
  -- SECURITY CHECK: Enforce super_admin-only access for deletion
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Only super administrators can delete products';
  END IF;

  -- Get current user ID
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Get product details (with row lock to prevent concurrent modifications)
  SELECT * INTO v_product_record
  FROM products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found';
  END IF;

  -- Insert history entry BEFORE deleting the product
  INSERT INTO history (
    user_id,
    product_id,
    product_name,
    action,
    quantity,
    notes,
    unit_of_measure
  ) VALUES (
    v_user_id,
    p_product_id,
    v_product_record.name,
    'deleted',
    0,
    'Product deleted',
    v_product_record.unit_of_measure
  );

  -- Delete the product (product_id in history will become NULL due to ON DELETE SET NULL)
  DELETE FROM products
  WHERE id = p_product_id;

  -- Return success
  RETURN json_build_object(
    'success', true,
    'message', 'Product deleted successfully'
  );

  -- If any error occurs above, entire transaction rolls back automatically
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to delete product: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- MIGRATION COMPLETE
-- ========================================
-- After running this migration:
-- 1. is_super_admin() function is available for use
-- 2. Only super_admins can delete products via delete_product_with_history()
-- 3. Regular admins can still: add, update, stock-in, stock-out
-- 4. Regular admins will get error: "Only super administrators can delete products"
--
-- Role hierarchy:
-- - super_admin: Full access (add, update, delete, stock operations, name changes)
-- - admin: Almost full access (add, update, stock operations, but NOT delete or name changes)
-- - user: Read-only access
-- ========================================
