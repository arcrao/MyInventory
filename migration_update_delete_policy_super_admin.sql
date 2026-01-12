-- ========================================
-- MIGRATION: Update product DELETE policy to super_admin only
-- ========================================
-- This updates the RLS policy on products table to only allow
-- super_admins to delete products (not regular admins).
--
-- This complements the delete_product_with_history() RPC function
-- and ensures even direct DELETE queries are restricted.
--
-- Run this in Supabase SQL Editor
-- ========================================

-- Drop old policy
DROP POLICY IF EXISTS "Only admins can delete products" ON products;

-- Create new policy with super_admin restriction
CREATE POLICY "Only super admins can delete products"
  ON products FOR DELETE
  USING (is_super_admin());

-- ========================================
-- MIGRATION COMPLETE
-- ========================================
-- After running this migration:
-- 1. Only super_admins can delete products via RLS
-- 2. Regular admins will get permission denied on DELETE
-- 3. This works in conjunction with delete_product_with_history() RPC
-- 4. Two-layer security: RLS + RPC function check
-- ========================================
