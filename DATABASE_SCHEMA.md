# Supabase Database Schema

This document describes the database tables needed for the MyInventory application.

## Security Model

**Access Control**:
- **View (SELECT)**: All authenticated users can view all data
- **Create/Edit/Delete (INSERT/UPDATE/DELETE)**: Only admin users can modify data

## Tables Overview

You need to create 5 tables in Supabase:
1. `user_roles` - User role assignments (admin/user)
2. `categories` - Product categories
3. `locations` - Storage locations
4. `products` - Inventory products
5. `history` - Transaction history

## SQL Schema

Run this SQL in your Supabase SQL Editor (Database → SQL Editor → New Query):

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User Roles Table
CREATE TABLE user_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user', 'super_admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Helper function to check if user is admin (email-based to support multiple auth providers)
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

-- Categories Table
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Locations Table
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products Table
CREATE TABLE products (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  sku TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER NOT NULL DEFAULT 0,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  description TEXT,
  brand TEXT,
  specification TEXT,
  unit_of_measure TEXT NOT NULL DEFAULT 'pcs',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- History Table
CREATE TABLE history (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id BIGINT REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('created', 'stock_in', 'stock_out', 'deleted', 'updated')),
  quantity INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  contact_person TEXT,  -- Used for both "Received By" (stock_in) and "Issued To" (stock_out)
  price_per_unit DECIMAL(10, 2),
  date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_products_user_id ON products(user_id);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_location_id ON products(location_id);
CREATE INDEX idx_history_user_id ON history(user_id);
CREATE INDEX idx_history_product_id ON history(product_id);
CREATE INDEX idx_categories_user_id ON categories(user_id);
CREATE INDEX idx_locations_user_id ON locations(user_id);
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);

-- Row Level Security (RLS) Policies
-- Enable RLS on all tables
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE history ENABLE ROW LEVEL SECURITY;

-- User Roles Policies
CREATE POLICY "Authenticated users can view user roles"
  ON user_roles FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can insert user roles"
  ON user_roles FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Only admins can update user roles"
  ON user_roles FOR UPDATE
  USING (is_admin());

CREATE POLICY "Only admins can delete user roles"
  ON user_roles FOR DELETE
  USING (is_admin());

-- Categories Policies
CREATE POLICY "All authenticated users can view categories"
  ON categories FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can insert categories"
  ON categories FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Only admins can update categories"
  ON categories FOR UPDATE
  USING (is_admin());

CREATE POLICY "Only admins can delete categories"
  ON categories FOR DELETE
  USING (is_admin());

-- Locations Policies
CREATE POLICY "All authenticated users can view locations"
  ON locations FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can insert locations"
  ON locations FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Only admins can update locations"
  ON locations FOR UPDATE
  USING (is_admin());

CREATE POLICY "Only admins can delete locations"
  ON locations FOR DELETE
  USING (is_admin());

-- Products Policies
CREATE POLICY "All authenticated users can view products"
  ON products FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can insert products"
  ON products FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Only admins can update products"
  ON products FOR UPDATE
  USING (is_admin());

CREATE POLICY "Only admins can delete products"
  ON products FOR DELETE
  USING (is_admin());

-- History Policies
CREATE POLICY "All authenticated users can view history"
  ON history FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can insert history"
  ON history FOR INSERT
  WITH CHECK (is_admin());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at on products
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to auto-update updated_at on user_roles
CREATE TRIGGER update_user_roles_updated_at
  BEFORE UPDATE ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Product Name Protection
-- Function to prevent product name updates for non-super-admins
CREATE OR REPLACE FUNCTION prevent_product_name_update_non_superadmin()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Check if name is being changed
  IF NEW.name IS DISTINCT FROM OLD.name THEN
    -- Get user's role
    SELECT role INTO user_role
    FROM user_roles
    WHERE user_id = auth.uid();

    -- Only allow super_admin to change names
    IF user_role != 'super_admin' THEN
      RAISE EXCEPTION 'Only super administrators can modify product names';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce product name protection
CREATE TRIGGER enforce_product_name_superadmin_only
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION prevent_product_name_update_non_superadmin();
```

## Creating Your First Admin User

After running the schema, you need to assign at least one admin user:

1. Go to Supabase Dashboard → **Authentication** → **Users**
2. Copy the **User ID** (UUID) of the user you want to make admin
3. Go to **SQL Editor** and run:

```sql
-- Create a super_admin (can edit product names and everything else)
INSERT INTO user_roles (user_id, role)
VALUES ('your-user-id-here', 'super_admin')
ON CONFLICT (user_id) DO UPDATE SET role = 'super_admin';

-- OR create a regular admin (can edit everything EXCEPT product names)
INSERT INTO user_roles (user_id, role)
VALUES ('your-user-id-here', 'admin')
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
```

Example:
```sql
-- Make yourself a super_admin
INSERT INTO user_roles (user_id, role)
VALUES ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'super_admin')
ON CONFLICT (user_id) DO UPDATE SET role = 'super_admin';
```

## Key Features

### Role-Based Access Control
- **Super Admin users**: Can view, create, edit (including product names), and delete all data
- **Admin users**: Can view, create, edit, and delete all data (except product names)
- **Regular users**: Can only view data (read-only access)
- User roles are stored in the `user_roles` table

### Security
- RLS policies enforced at database level
- Helper function `is_admin()` checks user role
- All write operations require admin role
- All read operations require authentication

### Data Model
- `user_id` field tracks who created each record
- All authenticated users can view all records
- Only admins can modify records
- History is append-only (no DELETE policy)

## Managing User Roles

### Make a User an Admin
```sql
INSERT INTO user_roles (user_id, role)
VALUES ('user-uuid-here', 'admin')
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
```

### Revoke Admin Access (Make User Regular)
```sql
UPDATE user_roles
SET role = 'user'
WHERE user_id = 'user-uuid-here';
```

### Check User's Role
```sql
SELECT user_id, role, created_at
FROM user_roles
WHERE user_id = 'user-uuid-here';
```

### List All Admins
```sql
SELECT ur.user_id, ur.role, au.email, ur.created_at
FROM user_roles ur
JOIN auth.users au ON ur.user_id = au.id
WHERE ur.role = 'admin'
ORDER BY ur.created_at DESC;
```

## Testing the Schema

After running the SQL, verify everything was created:

1. **Tables**: Go to Database → Tables
   - Should see: `user_roles`, `categories`, `locations`, `products`, `history`

2. **RLS Policies**: Go to Database → Policies
   - Each table should have policies
   - Categories/Locations/Products should have 4 policies each
   - History should have 2 policies (SELECT, INSERT only)
   - User_roles should have 4 policies

3. **Functions**: Go to Database → Functions
   - Should see: `is_admin`, `update_updated_at_column`

## Migration from Previous Schema

If you already ran the previous schema (without user_roles):

```sql
-- Add user_roles table and function
CREATE TABLE user_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = $1 AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop old policies
DROP POLICY IF EXISTS "Users can view their own categories" ON categories;
DROP POLICY IF EXISTS "Users can insert their own categories" ON categories;
DROP POLICY IF EXISTS "Users can update their own categories" ON categories;
DROP POLICY IF EXISTS "Users can delete their own categories" ON categories;

DROP POLICY IF EXISTS "Users can view their own locations" ON locations;
DROP POLICY IF EXISTS "Users can insert their own locations" ON locations;
DROP POLICY IF EXISTS "Users can update their own locations" ON locations;
DROP POLICY IF EXISTS "Users can delete their own locations" ON locations;

DROP POLICY IF EXISTS "Users can view their own products" ON products;
DROP POLICY IF EXISTS "Users can insert their own products" ON products;
DROP POLICY IF EXISTS "Users can update their own products" ON products;
DROP POLICY IF EXISTS "Users can delete their own products" ON products;

DROP POLICY IF EXISTS "Users can view their own history" ON history;
DROP POLICY IF EXISTS "Users can insert their own history" ON history;

-- Create new policies (copy from the main SQL schema above)

-- Then assign yourself as admin:
INSERT INTO user_roles (user_id, role)
VALUES ('your-user-id', 'admin')
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
```

## Migration: Merge received_by and issued_to columns

If you have existing data with `received_by` and `issued_to` columns, run this migration:

```sql
-- Add new contact_person column
ALTER TABLE history ADD COLUMN IF NOT EXISTS contact_person TEXT;

-- Migrate data: use received_by for stock_in, issued_to for stock_out
UPDATE history
SET contact_person = COALESCE(received_by, issued_to)
WHERE contact_person IS NULL;

-- Drop old columns
ALTER TABLE history DROP COLUMN IF EXISTS received_by;
ALTER TABLE history DROP COLUMN IF EXISTS issued_to;
```

## Product Name Protection

To prevent unauthorized editing of product names, a role-based restriction is implemented:

### Super Admin Role

Only users with `super_admin` role can edit product names. Regular `admin` users can edit all other product fields but cannot change names.

**Setup Steps:**

1. **Add super_admin role support:**

```sql
-- Update user_roles table to support super_admin role
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
ALTER TABLE user_roles ADD CONSTRAINT user_roles_role_check
  CHECK (role IN ('admin', 'user', 'super_admin'));
```

2. **Create the protection function and trigger:**

```sql
-- Create a function that prevents name updates for non-super-admins
CREATE OR REPLACE FUNCTION prevent_product_name_update_non_superadmin()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Check if name is being changed
  IF NEW.name IS DISTINCT FROM OLD.name THEN
    -- Get user's role
    SELECT role INTO user_role
    FROM user_roles
    WHERE user_id = auth.uid();

    -- Only allow super_admin to change names
    IF user_role != 'super_admin' THEN
      RAISE EXCEPTION 'Only super administrators can modify product names';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce this rule
CREATE TRIGGER enforce_product_name_superadmin_only
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION prevent_product_name_update_non_superadmin();
```

3. **Assign super_admin role to trusted users:**

```sql
-- Make a user a super admin
INSERT INTO user_roles (user_id, role)
VALUES ('your-user-id-here', 'super_admin')
ON CONFLICT (user_id) DO UPDATE SET role = 'super_admin';
```

### Managing Super Admin Users

**Promote admin to super_admin:**
```sql
UPDATE user_roles
SET role = 'super_admin'
WHERE user_id = 'user-uuid-here';
```

**Demote super_admin to regular admin:**
```sql
UPDATE user_roles
SET role = 'admin'
WHERE user_id = 'user-uuid-here';
```

**List all super admins:**
```sql
SELECT ur.user_id, ur.role, au.email, ur.created_at
FROM user_roles ur
JOIN auth.users au ON ur.user_id = au.id
WHERE ur.role = 'super_admin'
ORDER BY ur.created_at DESC;
```

### Removing Product Name Protection

If you need to remove this restriction later:

```sql
-- Drop the trigger
DROP TRIGGER IF EXISTS enforce_product_name_superadmin_only ON products;

-- Drop the function
DROP FUNCTION IF EXISTS prevent_product_name_update_non_superadmin();

-- Optionally revert role constraint to original
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
ALTER TABLE user_roles ADD CONSTRAINT user_roles_role_check
  CHECK (role IN ('admin', 'user'));
```

### Role Hierarchy

- **super_admin**: Full access including product name editing
- **admin**: Can create, edit (except names), and delete products and other data
- **user**: Read-only access to all data
