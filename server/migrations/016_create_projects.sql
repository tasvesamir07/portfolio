CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL DEFAULT '',
    title_bn TEXT DEFAULT '',
    title_ko TEXT DEFAULT '',
    funding_organization TEXT DEFAULT '',
    funding_organization_bn TEXT DEFAULT '',
    funding_organization_ko TEXT DEFAULT '',
    duration TEXT DEFAULT '',
    duration_bn TEXT DEFAULT '',
    duration_ko TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
