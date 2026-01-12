-- ========================================
-- DATA CONSISTENCY CHECKS
-- ========================================
-- These queries help identify any data inconsistencies that may have occurred
-- before implementing atomic RPC transactions.
--
-- Run these in Supabase SQL Editor to check your data integrity.
-- ========================================

-- ========================================
-- CHECK 1: Products with quantity mismatches
-- ========================================
-- Compares actual product quantity with calculated quantity from history
-- Any mismatch indicates a failed transaction (product updated but history not inserted, or vice versa)

SELECT
  p.id,
  p.name,
  p.sku,
  p.quantity AS actual_quantity,
  COALESCE(
    (SELECT h.quantity FROM history h WHERE h.product_id = p.id AND h.action = 'created' LIMIT 1),
    0
  ) +
  COALESCE(
    (SELECT SUM(h.quantity) FROM history h WHERE h.product_id = p.id AND h.action = 'stock_in'),
    0
  ) -
  COALESCE(
    (SELECT SUM(h.quantity) FROM history h WHERE h.product_id = p.id AND h.action = 'stock_out'),
    0
  ) AS expected_quantity_from_history,
  p.quantity - (
    COALESCE(
      (SELECT h.quantity FROM history h WHERE h.product_id = p.id AND h.action = 'created' LIMIT 1),
      0
    ) +
    COALESCE(
      (SELECT SUM(h.quantity) FROM history h WHERE h.product_id = p.id AND h.action = 'stock_in'),
      0
    ) -
    COALESCE(
      (SELECT SUM(h.quantity) FROM history h WHERE h.product_id = p.id AND h.action = 'stock_out'),
      0
    )
  ) AS difference
FROM products p
WHERE p.quantity != (
  COALESCE(
    (SELECT h.quantity FROM history h WHERE h.product_id = p.id AND h.action = 'created' LIMIT 1),
    0
  ) +
  COALESCE(
    (SELECT SUM(h.quantity) FROM history h WHERE h.product_id = p.id AND h.action = 'stock_in'),
    0
  ) -
  COALESCE(
    (SELECT SUM(h.quantity) FROM history h WHERE h.product_id = p.id AND h.action = 'stock_out'),
    0
  )
)
ORDER BY ABS(p.quantity - (
  COALESCE(
    (SELECT h.quantity FROM history h WHERE h.product_id = p.id AND h.action = 'created' LIMIT 1),
    0
  ) +
  COALESCE(
    (SELECT SUM(h.quantity) FROM history h WHERE h.product_id = p.id AND h.action = 'stock_in'),
    0
  ) -
  COALESCE(
    (SELECT SUM(h.quantity) FROM history h WHERE h.product_id = p.id AND h.action = 'stock_out'),
    0
  )
)) DESC;

-- ========================================
-- CHECK 2: Products without creation history
-- ========================================
-- Products should have a 'created' action in history
-- Missing entries indicate the history insert failed during product creation

SELECT
  p.id,
  p.name,
  p.sku,
  p.quantity,
  p.created_at,
  'Missing creation history' AS issue
FROM products p
WHERE NOT EXISTS (
  SELECT 1 FROM history h
  WHERE h.product_id = p.id
  AND h.action = 'created'
)
ORDER BY p.created_at DESC;

-- ========================================
-- CHECK 3: Orphaned history entries
-- ========================================
-- History entries where product_id is NULL but product_name suggests it wasn't a delete
-- (Should only be NULL for deleted products or when ON DELETE SET NULL triggered)

SELECT
  h.id,
  h.product_id,
  h.product_name,
  h.action,
  h.quantity,
  h.notes,
  h.created_at,
  CASE
    WHEN h.action = 'deleted' THEN 'Expected (product was deleted)'
    ELSE 'Unexpected orphan - possible inconsistency'
  END AS status
FROM history h
WHERE h.product_id IS NULL
AND h.action != 'deleted'
ORDER BY h.created_at DESC;

-- ========================================
-- CHECK 4: Recent stock operations summary
-- ========================================
-- Shows recent stock-in and stock-out operations
-- Useful to identify patterns of when inconsistencies occurred

SELECT
  h.id,
  h.product_id,
  h.product_name,
  h.action,
  h.quantity,
  h.notes,
  h.contact_person,
  h.created_at,
  p.quantity AS current_product_quantity,
  CASE
    WHEN p.id IS NULL AND h.product_id IS NOT NULL THEN 'Product deleted but history points to it'
    WHEN p.id IS NULL AND h.product_id IS NULL THEN 'Product deleted (expected)'
    WHEN p.id IS NOT NULL THEN 'Product exists'
    ELSE 'Unknown state'
  END AS product_status
FROM history h
LEFT JOIN products p ON h.product_id = p.id
WHERE h.action IN ('stock_in', 'stock_out')
ORDER BY h.created_at DESC
LIMIT 50;

-- ========================================
-- CHECK 5: Count of history entries by action
-- ========================================
-- Overview of all history actions in the system

SELECT
  action,
  COUNT(*) AS count,
  COUNT(CASE WHEN product_id IS NULL THEN 1 END) AS orphaned_count,
  COUNT(CASE WHEN product_id IS NOT NULL THEN 1 END) AS valid_count
FROM history
GROUP BY action
ORDER BY action;

-- ========================================
-- CHECK 6: Products with unusual quantity changes
-- ========================================
-- Finds products where stock operations don't explain the current quantity
-- Could indicate manual updates or failed transactions

WITH product_history AS (
  SELECT
    p.id,
    p.name,
    p.sku,
    p.quantity AS actual_quantity,
    COUNT(CASE WHEN h.action = 'stock_in' THEN 1 END) AS stock_in_count,
    COUNT(CASE WHEN h.action = 'stock_out' THEN 1 END) AS stock_out_count,
    COUNT(CASE WHEN h.action = 'updated' THEN 1 END) AS update_count,
    COALESCE(SUM(CASE WHEN h.action = 'stock_in' THEN h.quantity ELSE 0 END), 0) AS total_stock_in,
    COALESCE(SUM(CASE WHEN h.action = 'stock_out' THEN h.quantity ELSE 0 END), 0) AS total_stock_out
  FROM products p
  LEFT JOIN history h ON h.product_id = p.id
  GROUP BY p.id, p.name, p.sku, p.quantity
)
SELECT
  *,
  actual_quantity - (total_stock_in - total_stock_out) AS unexplained_difference
FROM product_history
WHERE actual_quantity != (total_stock_in - total_stock_out)
OR update_count > 0  -- Products that were manually updated
ORDER BY ABS(actual_quantity - (total_stock_in - total_stock_out)) DESC;

-- ========================================
-- CHECK 7: Timeline of potential inconsistencies
-- ========================================
-- Groups potential issues by date to identify when problems occurred
-- Useful to determine if issues happened before or after RPC implementation

SELECT
  DATE(h.created_at) AS date,
  COUNT(*) AS total_operations,
  COUNT(CASE WHEN h.action = 'stock_in' THEN 1 END) AS stock_in_operations,
  COUNT(CASE WHEN h.action = 'stock_out' THEN 1 END) AS stock_out_operations,
  COUNT(CASE WHEN h.product_id IS NULL AND h.action NOT IN ('deleted') THEN 1 END) AS potential_orphans
FROM history h
WHERE h.action IN ('stock_in', 'stock_out', 'created', 'updated', 'deleted')
GROUP BY DATE(h.created_at)
ORDER BY date DESC
LIMIT 30;

-- ========================================
-- INTERPRETATION GUIDE
-- ========================================
--
-- CHECK 1: If this returns rows, you have quantity mismatches
--   - difference > 0: Product has MORE quantity than history suggests
--   - difference < 0: Product has LESS quantity than history suggests
--   - This indicates failed transactions before RPC implementation
--
-- CHECK 2: Products without 'created' history entry
--   - Indicates history insert failed during product creation
--
-- CHECK 3: Orphaned history entries (product_id = NULL, action != 'deleted')
--   - Should be rare; indicates inconsistency
--   - Expected for deleted products (ON DELETE SET NULL)
--
-- CHECK 4: Shows recent stock operations
--   - Look for patterns of missing history or deleted products
--
-- CHECK 5: Overview of history actions
--   - orphaned_count should be small and mostly for 'deleted' action
--
-- CHECK 6: Products with unexplained quantity differences
--   - Large differences indicate missing history entries
--   - update_count > 0 shows manual quantity changes
--
-- CHECK 7: Timeline of issues
--   - potential_orphans should be 0 after RPC implementation
--   - Use this to identify when inconsistencies occurred
--
-- ========================================
-- REMEDIATION
-- ========================================
-- If you find inconsistencies:
-- 1. Document the findings (screenshot the query results)
-- 2. For minor differences: Create manual history entries to explain the gap
-- 3. For major differences: Investigate specific products/dates
-- 4. Going forward: All operations use RPC, so no new inconsistencies will occur
-- ========================================
