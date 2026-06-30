-- Alter pub_year column to TEXT to prevent length restrictions with HTML formatting in rich-text-enabled fields
ALTER TABLE publications ALTER COLUMN pub_year TYPE TEXT;
