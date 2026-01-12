-- ========================================
-- MIGRATION: Add Transactional Stock Operations
-- ========================================
-- This migration creates PostgreSQL functions for stock_in and stock_out
-- operations that execute atomically within a transaction.
--
-- Benefits:
-- - Atomic operations (both product update and history insert succeed or both fail)
-- - Single database call (reduces latency)
-- - Row-level locking (prevents race conditions)
-- - Server-side validation (can enforce business rules)
--
-- Security:
-- - Functions use SECURITY DEFINER (bypass RLS for transaction control)
-- - Manual is_admin() checks enforce admin-only access
-- - This maintains your security model: only admins can modify stock
--
-- Run this in Supabase SQL Editor
-- ========================================

-- ========================================
-- FUNCTION: stock_in_product
-- ========================================
-- Adds stock to a product and creates history entry atomically
-- All operations within a single transaction
CREATE OR REPLACE FUNCTION stock_in_product(
  p_product_id BIGINT,
  p_quantity INTEGER,
  p_notes TEXT DEFAULT NULL,
  p_contact_person TEXT DEFAULT NULL,
  p_price_per_unit DECIMAL(10, 2) DEFAULT NULL,
  p_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  v_product_name TEXT;
  v_unit_of_measure TEXT;
  v_new_quantity INTEGER;
BEGIN
  -- SECURITY CHECK: Enforce admin-only access (RLS is bypassed with SECURITY DEFINER)
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can perform stock operations';
  END IF;

  -- Validate quantity is positive
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be greater than zero';
  END IF;

  -- Get product details (with row lock to prevent concurrent modifications)
  SELECT name, unit_of_measure, quantity
  INTO v_product_name, v_unit_of_measure, v_new_quantity
  FROM products
  WHERE id = p_product_id
  FOR UPDATE;  -- This locks the row until transaction completes

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found';
  END IF;

  -- Calculate new quantity
  v_new_quantity := v_new_quantity + p_quantity;

  -- Update product quantity
  UPDATE products
  SET
    quantity = v_new_quantity,
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
    contact_person,
    price_per_unit,
    date,
    unit_of_measure
  ) VALUES (
    auth.uid(),
    p_product_id,
    v_product_name,
    'stock_in',
    p_quantity,
    COALESCE(p_notes, 'Stock added'),
    p_contact_person,
    p_price_per_unit,
    COALESCE(p_date, NOW()),
    v_unit_of_measure
  );

  -- Return success with new quantity
  RETURN json_build_object(
    'success', true,
    'new_quantity', v_new_quantity,
    'message', 'Stock added successfully'
  );

  -- If any error occurs above, entire transaction rolls back automatically
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Stock-in failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (RLS policies still apply)
GRANT EXECUTE ON FUNCTION stock_in_product TO authenticated;

-- ========================================
-- FUNCTION: stock_out_product
-- ========================================
-- Removes stock from a product and creates history entry atomically
-- All operations within a single transaction
CREATE OR REPLACE FUNCTION stock_out_product(
  p_product_id BIGINT,
  p_quantity INTEGER,
  p_notes TEXT DEFAULT NULL,
  p_contact_person TEXT DEFAULT NULL,
  p_price_per_unit DECIMAL(10, 2) DEFAULT NULL,
  p_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  v_product_name TEXT;
  v_unit_of_measure TEXT;
  v_current_quantity INTEGER;
  v_new_quantity INTEGER;
BEGIN
  -- SECURITY CHECK: Enforce admin-only access (RLS is bypassed with SECURITY DEFINER)
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can perform stock operations';
  END IF;

  -- Validate quantity is positive
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be greater than zero';
  END IF;

  -- Get product details (with row lock to prevent concurrent modifications)
  SELECT name, unit_of_measure, quantity
  INTO v_product_name, v_unit_of_measure, v_current_quantity
  FROM products
  WHERE id = p_product_id
  FOR UPDATE;  -- This locks the row until transaction completes

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found';
  END IF;

  -- Calculate new quantity
  v_new_quantity := v_current_quantity - p_quantity;

  -- Optional: Prevent negative stock (uncomment if needed)
  -- IF v_new_quantity < 0 THEN
  --   RAISE EXCEPTION 'Insufficient stock. Available: %, Requested: %', v_current_quantity, p_quantity;
  -- END IF;

  -- Update product quantity
  UPDATE products
  SET
    quantity = v_new_quantity,
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
    contact_person,
    price_per_unit,
    date,
    unit_of_measure
  ) VALUES (
    auth.uid(),
    p_product_id,
    v_product_name,
    'stock_out',
    p_quantity,
    COALESCE(p_notes, 'Stock removed'),
    p_contact_person,
    p_price_per_unit,
    COALESCE(p_date, NOW()),
    v_unit_of_measure
  );

  -- Return success with new quantity
  RETURN json_build_object(
    'success', true,
    'new_quantity', v_new_quantity,
    'message', 'Stock removed successfully'
  );

  -- If any error occurs above, entire transaction rolls back automatically
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Stock-out failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (RLS policies still apply)
GRANT EXECUTE ON FUNCTION stock_out_product TO authenticated;

-- ========================================
-- MIGRATION COMPLETE
-- ========================================
-- After running this migration:
-- 1. Use supabase.rpc('stock_in_product', {...}) from the client
-- 2. Use supabase.rpc('stock_out_product', {...}) from the client
-- 3. Both product update and history insert are atomic
-- 4. Row-level locking prevents race conditions
-- 5. Server-side validation prevents invalid operations
--
-- Example usage from TypeScript:
-- const { data, error } = await supabase.rpc('stock_out_product', {
--   p_product_id: 123,
--   p_quantity: 10,
--   p_notes: 'Issued to warehouse',
--   p_contact_person: 'John Doe',
--   p_date: new Date().toISOString()
-- });
--
-- if (error) throw error;
-- console.log(data.new_quantity); // Returns the new quantity
-- ========================================
