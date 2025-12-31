-- Migration: Preserve history when products are deleted
-- This migration changes the foreign key constraint to SET NULL instead of CASCADE
-- so that history entries are preserved when products are deleted.

-- Step 1: Drop the existing foreign key constraint
ALTER TABLE history
DROP CONSTRAINT IF EXISTS history_product_id_fkey;

-- Step 2: Make product_id nullable (remove NOT NULL constraint)
ALTER TABLE history
ALTER COLUMN product_id DROP NOT NULL;

-- Step 3: Add the new foreign key constraint with ON DELETE SET NULL
ALTER TABLE history
ADD CONSTRAINT history_product_id_fkey
FOREIGN KEY (product_id)
REFERENCES products(id)
ON DELETE SET NULL;

-- Note: With this change, when a product is deleted:
-- 1. The product row is removed from the products table
-- 2. The product_id in history entries is set to NULL
-- 3. The productName field (added in previous migration) preserves the product name
-- 4. History entries remain intact for audit trail purposes
