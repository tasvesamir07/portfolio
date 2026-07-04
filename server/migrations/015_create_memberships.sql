CREATE TABLE IF NOT EXISTS memberships (
    id SERIAL PRIMARY KEY,
    membership_type TEXT NOT NULL DEFAULT '',
    name TEXT NOT NULL DEFAULT '',
    name_bn TEXT DEFAULT '',
    name_ko TEXT DEFAULT '',
    url TEXT DEFAULT '',
    position TEXT DEFAULT '',
    position_bn TEXT DEFAULT '',
    position_ko TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
