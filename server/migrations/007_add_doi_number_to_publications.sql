-- Add doi column (for raw DOI number) to publications table
ALTER TABLE publications ADD COLUMN IF NOT EXISTS doi TEXT DEFAULT '';
