-- Migration: Preserve history when products are deleted
-- This migration:
-- 1. Adds product_name column to history table
-- 2. Backfills existing history with product names
-- 3. Changes foreign key constraint to SET NULL instead of CASCADE
-- so that history entries are preserved when products are deleted.

-- Step 1: Add product_name column to history table
ALTER TABLE history
ADD COLUMN IF NOT EXISTS product_name TEXT;

-- Step 2: Backfill product_name for all existing history entries
-- This captures product names before any products are deleted
UPDATE history h
SET product_name = p.name
FROM products p
WHERE h.product_id = p.id
  AND h.product_name IS NULL;

-- Step 3: Drop the existing foreign key constraint
ALTER TABLE history
DROP CONSTRAINT IF EXISTS history_product_id_fkey;

-- Step 4: Make product_id nullable (remove NOT NULL constraint)
ALTER TABLE history
ALTER COLUMN product_id DROP NOT NULL;

-- Step 5: Add the new foreign key constraint with ON DELETE SET NULL
ALTER TABLE history
ADD CONSTRAINT history_product_id_fkey
FOREIGN KEY (product_id)
REFERENCES products(id)
ON DELETE SET NULL;

-- Verification: Check how many history entries have product names
-- SELECT
--   COUNT(*) as total_entries,
--   COUNT(product_name) as entries_with_names,
--   COUNT(*) - COUNT(product_name) as entries_without_names
-- FROM history;

-- Note: With this change, when a product is deleted:
-- 1. The product row is removed from the products table
-- 2. The product_id in history entries is set to NULL
-- 3. The product_name column preserves the product name for audit trail
-- 4. History entries remain intact for compliance and reporting
