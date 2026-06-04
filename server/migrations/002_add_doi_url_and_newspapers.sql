-- Add doi_url and journal_url to publications, and create newspapers table

ALTER TABLE publications ADD COLUMN IF NOT EXISTS doi_url TEXT DEFAULT '';
ALTER TABLE publications ADD COLUMN IF NOT EXISTS journal_url TEXT DEFAULT '';

CREATE TABLE IF NOT EXISTS newspapers (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    title_bn VARCHAR(255) DEFAULT '',
    title_ko VARCHAR(255) DEFAULT '',
    short_description TEXT DEFAULT '',
    short_description_bn TEXT DEFAULT '',
    short_description_ko TEXT DEFAULT '',
    image_url TEXT DEFAULT '',
    link_url TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
