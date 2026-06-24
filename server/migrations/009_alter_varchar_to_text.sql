-- Alter VARCHAR columns to TEXT to prevent length restrictions with HTML formatting in rich-text-enabled fields
ALTER TABLE experiences ALTER COLUMN company TYPE TEXT;
ALTER TABLE experiences ALTER COLUMN position TYPE TEXT;
ALTER TABLE experiences ALTER COLUMN location TYPE TEXT;

ALTER TABLE trainings ALTER COLUMN title TYPE TEXT;
ALTER TABLE trainings ALTER COLUMN instructor TYPE TEXT;

ALTER TABLE skills ALTER COLUMN category TYPE TEXT;

ALTER TABLE research_interests ALTER COLUMN interest TYPE TEXT;

ALTER TABLE research ALTER COLUMN title TYPE TEXT;
ALTER TABLE research ALTER COLUMN status TYPE TEXT;

ALTER TABLE publications ALTER COLUMN title TYPE TEXT;
ALTER TABLE publications ALTER COLUMN journal_name TYPE TEXT;

ALTER TABLE newspapers ALTER COLUMN title TYPE TEXT;
ALTER TABLE newspapers ALTER COLUMN title_bn TYPE TEXT;
ALTER TABLE newspapers ALTER COLUMN title_ko TYPE TEXT;
