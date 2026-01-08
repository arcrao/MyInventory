-- Migration: Add unit_of_measure to history table
-- This ensures complete audit trail even when products are deleted

-- Add unit_of_measure column to history table
ALTER TABLE history ADD COLUMN IF NOT EXISTS unit_of_measure TEXT;

-- Update existing history entries with unit_of_measure from products table
UPDATE history h
SET unit_of_measure = p.unit_of_measure
FROM products p
WHERE h.product_id = p.id
  AND h.unit_of_measure IS NULL;

-- Set default value for any remaining NULL entries
UPDATE history
SET unit_of_measure = 'pcs'
WHERE unit_of_measure IS NULL;

-- Add NOT NULL constraint with default value
ALTER TABLE history ALTER COLUMN unit_of_measure SET DEFAULT 'pcs';

-- Note: We don't add NOT NULL constraint to allow flexibility for old data
-- New entries should always include unit_of_measure from the application
