-- ========================================
-- MIGRATION: Remove User-level CASCADE DELETE
-- ========================================
-- This migration changes all user_id foreign keys from CASCADE to RESTRICT
-- to prevent accidental data loss when deleting user accounts.
--
-- BEFORE: Deleting a user deletes all their data (categories, products, history, etc.)
-- AFTER: Cannot delete a user if they have any associated data
--
-- Run this in Supabase SQL Editor
-- ========================================

-- 1. USER_ROLES table
ALTER TABLE user_roles
  DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;

ALTER TABLE user_roles
  ADD CONSTRAINT user_roles_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE RESTRICT;

-- 2. CATEGORIES table
ALTER TABLE categories
  DROP CONSTRAINT IF EXISTS categories_user_id_fkey;

ALTER TABLE categories
  ADD CONSTRAINT categories_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE RESTRICT;

-- 3. LOCATIONS table
ALTER TABLE locations
  DROP CONSTRAINT IF EXISTS locations_user_id_fkey;

ALTER TABLE locations
  ADD CONSTRAINT locations_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE RESTRICT;

-- 4. PRODUCTS table
ALTER TABLE products
  DROP CONSTRAINT IF EXISTS products_user_id_fkey;

ALTER TABLE products
  ADD CONSTRAINT products_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE RESTRICT;

-- 5. HISTORY table
ALTER TABLE history
  DROP CONSTRAINT IF EXISTS history_user_id_fkey;

ALTER TABLE history
  ADD CONSTRAINT history_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE RESTRICT;

-- ========================================
-- MIGRATION COMPLETE
-- ========================================
-- After running this migration:
-- - User accounts CANNOT be deleted if they have any data
-- - Attempting to delete a user with data will fail with error:
--   "update or delete on table "users" violates foreign key constraint"
-- - This protects against accidental data loss
--
-- To delete a user, you would need to:
-- 1. Delete or reassign all their categories
-- 2. Delete or reassign all their locations
-- 3. Delete or reassign all their products
-- 4. Optionally handle history entries (or keep them with user_id intact)
--
-- Entity-level protections remain unchanged:
-- - products.category_id: ON DELETE SET NULL (keeps products when category deleted)
-- - products.location_id: ON DELETE SET NULL (keeps products when location deleted)
-- - history.product_id: ON DELETE SET NULL (keeps history when product deleted)
-- ========================================
