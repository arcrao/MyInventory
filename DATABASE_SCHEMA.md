# Supabase Database Schema

This document describes the database tables needed for the MyInventory application.

## Tables Overview

You need to create 4 tables in Supabase:
1. `categories` - Product categories
2. `locations` - Storage locations
3. `products` - Inventory products
4. `history` - Transaction history

## SQL Schema

Run this SQL in your Supabase SQL Editor (Database → SQL Editor → New Query):

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
  received_by TEXT,
  price_per_unit DECIMAL(10, 2),
  issued_to TEXT,
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

-- Row Level Security (RLS) Policies
-- Enable RLS on all tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE history ENABLE ROW LEVEL SECURITY;

-- Categories Policies
CREATE POLICY "Users can view their own categories"
  ON categories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own categories"
  ON categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories"
  ON categories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories"
  ON categories FOR DELETE
  USING (auth.uid() = user_id);

-- Locations Policies
CREATE POLICY "Users can view their own locations"
  ON locations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own locations"
  ON locations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own locations"
  ON locations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own locations"
  ON locations FOR DELETE
  USING (auth.uid() = user_id);

-- Products Policies
CREATE POLICY "Users can view their own products"
  ON products FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own products"
  ON products FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own products"
  ON products FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own products"
  ON products FOR DELETE
  USING (auth.uid() = user_id);

-- History Policies
CREATE POLICY "Users can view their own history"
  ON history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own history"
  ON history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

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
```

## Key Features

### Multi-tenant Architecture
- Each table has a `user_id` column that references `auth.users(id)`
- Users can only see and modify their own data
- Row Level Security (RLS) enforces data isolation

### Data Integrity
- Foreign key constraints maintain referential integrity
- `ON DELETE CASCADE` removes related data when users/products are deleted
- `ON DELETE SET NULL` for category/location references (products remain if category/location is deleted)

### Performance
- Indexes on foreign keys and user_id columns for fast queries
- Automatic timestamp updates for products

### Security
- RLS policies ensure users can only access their own data
- All CRUD operations are protected
- History is append-only (no UPDATE or DELETE policies)

## Testing the Schema

After running the SQL, verify the tables were created:

1. Go to Supabase Dashboard → Database → Tables
2. You should see: `categories`, `locations`, `products`, `history`
3. Check the RLS policies: Database → Policies
4. Each table should have policies for SELECT, INSERT, UPDATE, DELETE

## Migration from localStorage

The application currently stores data in localStorage. After implementing the Supabase storage service:

1. Users will need to re-enter their data (categories, locations, products)
2. Alternatively, we can create a migration script to copy localStorage data to Supabase
3. Each user will have their own isolated data

## Next Steps

1. Run the SQL schema in Supabase
2. Update the application's storage service to use Supabase
3. Test with multiple users to verify data isolation
