# Account Linking Fix for Google OAuth

## Problem
When you log in with Google OAuth vs Email/Password, Supabase creates two separate user accounts with different `user_id` values, even though they have the same email address. This causes data visibility issues.

## Solution Options

### Option 1: Link Google Account to Existing Email/Password Account (RECOMMENDED)

Run this SQL in Supabase SQL Editor to migrate all data from your Google OAuth account to your original email/password account:

```sql
-- First, find your user IDs
-- Run this to identify which user_id corresponds to which login method
SELECT
  id,
  email,
  raw_user_meta_data->>'provider' as provider,
  created_at
FROM auth.users
WHERE email = 'your-email@example.com';  -- Replace with your actual email

-- Copy the older user_id (usually email/password) as OLD_USER_ID
-- Copy the newer user_id (usually Google OAuth) as NEW_USER_ID

-- Then migrate all data from NEW to OLD (or vice versa)
-- Replace OLD_USER_ID and NEW_USER_ID with actual UUIDs from above query

BEGIN;

-- Update products
UPDATE products
SET user_id = 'OLD_USER_ID'::UUID
WHERE user_id = 'NEW_USER_ID'::UUID;

-- Update categories
UPDATE categories
SET user_id = 'OLD_USER_ID'::UUID
WHERE user_id = 'NEW_USER_ID'::UUID;

-- Update locations
UPDATE locations
SET user_id = 'OLD_USER_ID'::UUID
WHERE user_id = 'NEW_USER_ID'::UUID;

-- Update history
UPDATE history
SET user_id = 'OLD_USER_ID'::UUID
WHERE user_id = 'NEW_USER_ID'::UUID;

-- Update user_roles (if exists)
UPDATE user_roles
SET user_id = 'OLD_USER_ID'::UUID
WHERE user_id = 'NEW_USER_ID'::UUID;

COMMIT;

-- Optional: Delete the unused Google OAuth user account
-- (Only do this AFTER verifying the migration worked!)
-- DELETE FROM auth.users WHERE id = 'NEW_USER_ID'::UUID;
```

### Option 2: Automatic Account Linking by Email (PREVENTIVE)

This prevents the issue from happening in the future by automatically linking accounts with the same email:

```sql
-- Create a function to link accounts by email
CREATE OR REPLACE FUNCTION link_user_accounts()
RETURNS TRIGGER AS $$
DECLARE
  existing_user_id UUID;
BEGIN
  -- Check if a user with this email already exists
  SELECT id INTO existing_user_id
  FROM auth.users
  WHERE email = NEW.email
    AND id != NEW.id
  LIMIT 1;

  IF existing_user_id IS NOT NULL THEN
    -- Link the new account data to existing user
    -- This will run for products, categories, locations, history
    IF TG_TABLE_NAME = 'products' THEN
      NEW.user_id := existing_user_id;
    ELSIF TG_TABLE_NAME = 'categories' THEN
      NEW.user_id := existing_user_id;
    ELSIF TG_TABLE_NAME = 'locations' THEN
      NEW.user_id := existing_user_id;
    ELSIF TG_TABLE_NAME = 'history' THEN
      NEW.user_id := existing_user_id;
    ELSIF TG_TABLE_NAME = 'user_roles' THEN
      NEW.user_id := existing_user_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: This approach has limitations because we can't easily get the email
-- from the current auth.uid() in a trigger. See Option 3 for better approach.
```

### Option 3: Use Email-Based Role Checking (BEST LONG-TERM SOLUTION)

Modify the admin check to use email instead of user_id:

```sql
-- Drop the existing function
DROP FUNCTION IF EXISTS is_admin(UUID);

-- Create new email-based admin check
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

  -- Check if any user with this email is admin
  SELECT role INTO user_role
  FROM user_roles ur
  JOIN auth.users au ON au.id = ur.user_id
  WHERE au.email = user_email
    AND role = 'admin'
  LIMIT 1;

  RETURN user_role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update all RLS policies to use the new function (no parameters needed)
-- Products
DROP POLICY IF EXISTS "Only admins can insert products" ON products;
CREATE POLICY "Only admins can insert products"
  ON products FOR INSERT
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Only admins can update products" ON products;
CREATE POLICY "Only admins can update products"
  ON products FOR UPDATE
  USING (is_admin());

DROP POLICY IF EXISTS "Only admins can delete products" ON products;
CREATE POLICY "Only admins can delete products"
  ON products FOR DELETE
  USING (is_admin());

-- Categories
DROP POLICY IF EXISTS "Only admins can insert categories" ON categories;
CREATE POLICY "Only admins can insert categories"
  ON categories FOR INSERT
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Only admins can update categories" ON categories;
CREATE POLICY "Only admins can update categories"
  ON categories FOR UPDATE
  USING (is_admin());

DROP POLICY IF EXISTS "Only admins can delete categories" ON categories;
CREATE POLICY "Only admins can delete categories"
  ON categories FOR DELETE
  USING (is_admin());

-- Locations
DROP POLICY IF EXISTS "Only admins can insert locations" ON locations;
CREATE POLICY "Only admins can insert locations"
  ON locations FOR INSERT
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Only admins can update locations" ON locations;
CREATE POLICY "Only admins can update locations"
  ON locations FOR UPDATE
  USING (is_admin());

DROP POLICY IF EXISTS "Only admins can delete locations" ON locations;
CREATE POLICY "Only admins can delete locations"
  ON locations FOR DELETE
  USING (is_admin());

-- History
DROP POLICY IF EXISTS "Only admins can insert history" ON history;
CREATE POLICY "Only admins can insert history"
  ON history FOR INSERT
  WITH CHECK (is_admin());

-- User Roles
DROP POLICY IF EXISTS "Only admins can insert user roles" ON user_roles;
CREATE POLICY "Only admins can insert user roles"
  ON user_roles FOR INSERT
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Only admins can update user roles" ON user_roles;
CREATE POLICY "Only admins can update user roles"
  ON user_roles FOR UPDATE
  USING (is_admin());

DROP POLICY IF EXISTS "Only admins can delete user roles" ON user_roles;
CREATE POLICY "Only admins can delete user roles"
  ON user_roles FOR DELETE
  USING (is_admin());
```

## Recommended Steps

1. **Run Option 1** - Migrate your existing data from one account to the other
2. **Run Option 3** - Update the is_admin function to use email-based checking
3. Test logging in with both email/password and Google OAuth

This ensures that both login methods will work and share the same data and permissions.

## Notes

- The `user_id` field in tables is still useful for audit trails (who created what)
- The email-based admin check allows any account with the same email to share admin privileges
- You can continue to use both login methods interchangeably
