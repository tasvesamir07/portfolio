-- Add main_author, volume, issue columns to publications table
ALTER TABLE publications ADD COLUMN IF NOT EXISTS main_author TEXT DEFAULT '';
ALTER TABLE publications ADD COLUMN IF NOT EXISTS volume TEXT DEFAULT '';
ALTER TABLE publications ADD COLUMN IF NOT EXISTS issue TEXT DEFAULT '';
