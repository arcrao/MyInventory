-- ========================================
-- MIGRATION: Add Transactional Product CRUD Operations
-- ========================================
-- This migration creates PostgreSQL functions for add, update, and delete
-- product operations that execute atomically within a transaction.
--
-- Benefits:
-- - Atomic operations (both product operation and history insert succeed or both fail)
-- - Single database call (reduces latency)
-- - Row-level locking for updates/deletes (prevents race conditions)
-- - Server-side validation (enforces business rules)
--
-- Security:
-- - Functions use SECURITY DEFINER (bypass RLS for transaction control)
-- - Manual is_admin() checks enforce admin-only access
-- - This maintains your security model: only admins can modify products
--
-- Run this in Supabase SQL Editor
-- ========================================

-- ========================================
-- FUNCTION: add_product_with_history
-- ========================================
-- Creates a new product and history entry atomically
-- All operations within a single transaction
CREATE OR REPLACE FUNCTION add_product_with_history(
  p_name TEXT,
  p_sku TEXT,
  p_quantity INTEGER,
  p_min_stock INTEGER,
  p_price DECIMAL(10, 2),
  p_category_id UUID DEFAULT NULL,
  p_location_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_brand TEXT DEFAULT NULL,
  p_specification TEXT DEFAULT NULL,
  p_unit_of_measure TEXT DEFAULT 'pcs'
)
RETURNS json AS $$
DECLARE
  v_product_id BIGINT;
  v_user_id UUID;
BEGIN
  -- SECURITY CHECK: Enforce admin-only access (RLS is bypassed with SECURITY DEFINER)
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can add products';
  END IF;

  -- Get current user ID
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Validate required fields
  IF p_name IS NULL OR p_name = '' THEN
    RAISE EXCEPTION 'Product name is required';
  END IF;

  IF p_sku IS NULL OR p_sku = '' THEN
    RAISE EXCEPTION 'Product SKU is required';
  END IF;

  -- Insert product
  INSERT INTO products (
    user_id,
    name,
    sku,
    quantity,
    min_stock,
    price,
    category_id,
    location_id,
    description,
    brand,
    specification,
    unit_of_measure
  ) VALUES (
    v_user_id,
    p_name,
    p_sku,
    p_quantity,
    p_min_stock,
    p_price,
    p_category_id,
    p_location_id,
    p_description,
    p_brand,
    p_specification,
    p_unit_of_measure
  )
  RETURNING id INTO v_product_id;

  -- Insert history entry
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
    v_product_id,
    p_name,
    'created',
    p_quantity,
    'Product created',
    p_unit_of_measure
  );

  -- Return success with product ID
  RETURN json_build_object(
    'success', true,
    'product_id', v_product_id,
    'message', 'Product created successfully'
  );

  -- If any error occurs above, entire transaction rolls back automatically
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to add product: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (RLS policies still apply via is_admin check)
GRANT EXECUTE ON FUNCTION add_product_with_history TO authenticated;

-- ========================================
-- FUNCTION: update_product_with_history
-- ========================================
-- Updates a product and creates history entry atomically
-- All operations within a single transaction
CREATE OR REPLACE FUNCTION update_product_with_history(
  p_product_id BIGINT,
  p_name TEXT DEFAULT NULL,
  p_sku TEXT DEFAULT NULL,
  p_quantity INTEGER DEFAULT NULL,
  p_min_stock INTEGER DEFAULT NULL,
  p_price DECIMAL(10, 2) DEFAULT NULL,
  p_category_id UUID DEFAULT NULL,
  p_location_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_brand TEXT DEFAULT NULL,
  p_specification TEXT DEFAULT NULL,
  p_unit_of_measure TEXT DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  v_user_id UUID;
  v_old_record RECORD;
  v_changes TEXT[];
  v_notes TEXT;
BEGIN
  -- SECURITY CHECK: Enforce admin-only access (RLS is bypassed with SECURITY DEFINER)
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can update products';
  END IF;

  -- Get current user ID
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Get old product values (with row lock to prevent concurrent modifications)
  SELECT * INTO v_old_record
  FROM products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found';
  END IF;

  -- Track what changed
  v_changes := ARRAY[]::TEXT[];

  IF p_name IS NOT NULL AND p_name != v_old_record.name THEN
    v_changes := array_append(v_changes, 'Name: ' || p_name);
  END IF;

  IF p_price IS NOT NULL AND p_price != v_old_record.price THEN
    v_changes := array_append(v_changes, 'Price: ₹' || p_price::TEXT);
  END IF;

  IF p_min_stock IS NOT NULL AND p_min_stock != v_old_record.min_stock THEN
    v_changes := array_append(v_changes, 'Min Stock: ' || p_min_stock::TEXT);
  END IF;

  IF p_brand IS NOT NULL AND p_brand != v_old_record.brand THEN
    v_changes := array_append(v_changes, 'Brand: ' || p_brand);
  END IF;

  IF p_sku IS NOT NULL AND p_sku != v_old_record.sku THEN
    v_changes := array_append(v_changes, 'SKU: ' || p_sku);
  END IF;

  IF p_category_id IS DISTINCT FROM v_old_record.category_id THEN
    v_changes := array_append(v_changes, 'Category updated');
  END IF;

  IF p_location_id IS DISTINCT FROM v_old_record.location_id THEN
    v_changes := array_append(v_changes, 'Location updated');
  END IF;

  -- Build notes
  IF array_length(v_changes, 1) > 0 THEN
    v_notes := 'Updated: ' || array_to_string(v_changes, ', ');
  ELSE
    v_notes := 'Product details updated';
  END IF;

  -- Update product (only update fields that were provided)
  UPDATE products
  SET
    name = COALESCE(p_name, name),
    sku = COALESCE(p_sku, sku),
    quantity = COALESCE(p_quantity, quantity),
    min_stock = COALESCE(p_min_stock, min_stock),
    price = COALESCE(p_price, price),
    category_id = CASE WHEN p_category_id IS NULL THEN category_id ELSE p_category_id END,
    location_id = CASE WHEN p_location_id IS NULL THEN location_id ELSE p_location_id END,
    description = COALESCE(p_description, description),
    brand = COALESCE(p_brand, brand),
    specification = COALESCE(p_specification, specification),
    unit_of_measure = COALESCE(p_unit_of_measure, unit_of_measure),
    updated_at = NOW()
  WHERE id = p_product_id;

  -- Insert history entry
  INSERT INTO history (
    user_id,
    product_id,
    product_name,
    action,
    quantity,
    notes,
    price_per_unit,
    unit_of_measure
  ) VALUES (
    v_user_id,
    p_product_id,
    COALESCE(p_name, v_old_record.name),
    'updated',
    0,
    v_notes,
    COALESCE(p_price, v_old_record.price),
    COALESCE(p_unit_of_measure, v_old_record.unit_of_measure)
  );

  -- Return success
  RETURN json_build_object(
    'success', true,
    'message', 'Product updated successfully'
  );

  -- If any error occurs above, entire transaction rolls back automatically
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to update product: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (RLS policies still apply via is_admin check)
GRANT EXECUTE ON FUNCTION update_product_with_history TO authenticated;

-- ========================================
-- FUNCTION: delete_product_with_history
-- ========================================
-- Deletes a product after creating history entry atomically
-- All operations within a single transaction
CREATE OR REPLACE FUNCTION delete_product_with_history(
  p_product_id BIGINT
)
RETURNS json AS $$
DECLARE
  v_user_id UUID;
  v_product_record RECORD;
BEGIN
  -- SECURITY CHECK: Enforce admin-only access (RLS is bypassed with SECURITY DEFINER)
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can delete products';
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

-- Grant execute permission to authenticated users (RLS policies still apply via is_admin check)
GRANT EXECUTE ON FUNCTION delete_product_with_history TO authenticated;

-- ========================================
-- MIGRATION COMPLETE
-- ========================================
-- After running this migration:
-- 1. Use supabase.rpc('add_product_with_history', {...}) from the client
-- 2. Use supabase.rpc('update_product_with_history', {...}) from the client
-- 3. Use supabase.rpc('delete_product_with_history', {...}) from the client
-- 4. All product operations and history inserts are atomic
-- 5. Row-level locking prevents race conditions
-- 6. Server-side validation prevents invalid operations
-- 7. Admin-only access is enforced via is_admin() checks
--
-- Example usage from TypeScript:
--
-- // Add product
-- const { data, error } = await supabase.rpc('add_product_with_history', {
--   p_name: 'Widget',
--   p_sku: 'WDG-001',
--   p_quantity: 100,
--   p_min_stock: 10,
--   p_price: 99.99,
--   p_unit_of_measure: 'pcs'
-- });
--
-- // Update product
-- const { data, error } = await supabase.rpc('update_product_with_history', {
--   p_product_id: 123,
--   p_price: 89.99,
--   p_quantity: 150
-- });
--
-- // Delete product
-- const { data, error } = await supabase.rpc('delete_product_with_history', {
--   p_product_id: 123
-- });
-- ========================================
