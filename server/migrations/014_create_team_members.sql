CREATE TABLE IF NOT EXISTS team_members (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL DEFAULT '',
    name_bn TEXT DEFAULT '',
    name_ko TEXT DEFAULT '',
    photo_url TEXT DEFAULT '',
    research_area TEXT DEFAULT '',
    research_area_bn TEXT DEFAULT '',
    research_area_ko TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    email TEXT DEFAULT '',
    academic_level TEXT DEFAULT '',
    academic_level_bn TEXT DEFAULT '',
    academic_level_ko TEXT DEFAULT '',
    member_type TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
