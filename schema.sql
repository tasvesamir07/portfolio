-- Full Database Schema for Portfolio CMS

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255),
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    otp_hash VARCHAR(255),
    otp_expires_at TIMESTAMP,
    pending_username VARCHAR(100),
    pending_email VARCHAR(255),
    pending_password_hash TEXT
);

-- 2. About Table
CREATE TABLE IF NOT EXISTS about (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    title VARCHAR(255),
    location VARCHAR(255),
    site_name VARCHAR(100),
    bio_text TEXT,
    sub_bio TEXT,
    resume_url TEXT,
    hero_image_url TEXT,
    logo_url TEXT,
    custom_nav JSONB DEFAULT '[]',
    custom_sidebar_order JSONB DEFAULT '[]',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Pages Table
CREATE TABLE IF NOT EXISTS pages (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    content TEXT DEFAULT '',
    show_in_nav BOOLEAN DEFAULT true,
    details_json TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Academics Table
CREATE TABLE IF NOT EXISTS academics (
    id SERIAL PRIMARY KEY,
    institution TEXT,
    degree TEXT,
    start_year TEXT,
    end_year TEXT,
    logo_url TEXT,
    details_json TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Experiences Table
CREATE TABLE IF NOT EXISTS experiences (
    id SERIAL PRIMARY KEY,
    company VARCHAR(255),
    position VARCHAR(255),
    location VARCHAR(255),
    start_date TEXT,
    end_date TEXT,
    description TEXT,
    logo_url TEXT,
    details_json TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Trainings Table
CREATE TABLE IF NOT EXISTS trainings (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    topic TEXT,
    date_text TEXT,
    instructor VARCHAR(255),
    details_json TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Skills Table
CREATE TABLE IF NOT EXISTS skills (
    id SERIAL PRIMARY KEY,
    category VARCHAR(100),
    items TEXT,
    details_json TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Research Interests Table
CREATE TABLE IF NOT EXISTS research_interests (
    id SERIAL PRIMARY KEY,
    interest VARCHAR(255),
    details TEXT,
    icon_name VARCHAR(100),
    details_json TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Research Table
CREATE TABLE IF NOT EXISTS research (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    description TEXT,
    image_url TEXT,
    link TEXT,
    file_url TEXT,
    status VARCHAR(100),
    date_text VARCHAR(100),
    details_json TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Publications Table
CREATE TABLE IF NOT EXISTS publications (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    thumbnail_url TEXT,
    journal_name VARCHAR(255),
    pub_year VARCHAR(20),
    authors TEXT,
    introduction TEXT,
    methods TEXT,
    link_url TEXT,
    file_url TEXT,
    details_json TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    doi_url TEXT DEFAULT '',
    journal_url TEXT DEFAULT '',
    doi TEXT DEFAULT ''
);

-- 11. Gallery Categories Table
CREATE TABLE IF NOT EXISTS gallery_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    sort_order INTEGER DEFAULT 0
);

-- 12. Gallery Table
CREATE TABLE IF NOT EXISTS gallery (
    id SERIAL PRIMARY KEY,
    image_url TEXT NOT NULL,
    caption TEXT,
    category VARCHAR(100),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13. Messages Table
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(255),
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 14. Social Links Table
CREATE TABLE IF NOT EXISTS social_links (
    id SERIAL PRIMARY KEY,
    platform VARCHAR(100),
    url TEXT,
    icon_name VARCHAR(100),
    color_class VARCHAR(100),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 15. Newspapers Table
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

-- 16. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER,
    username VARCHAR(100),
    action VARCHAR(100) NOT NULL,
    target_id VARCHAR(100),
    details TEXT,
    ip_address VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 17. Anonymous Messages Table
CREATE TABLE IF NOT EXISTS anonymous_messages (
  id SERIAL PRIMARY KEY,
  message TEXT NOT NULL,
  ip_address TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  is_read BOOLEAN DEFAULT FALSE
);

-- --- Database Optimization Indexes ---
CREATE INDEX IF NOT EXISTS idx_pages_slug ON pages(slug);
CREATE INDEX IF NOT EXISTS idx_gallery_category ON gallery(category);
CREATE INDEX IF NOT EXISTS idx_publications_pub_year ON publications(pub_year);
CREATE INDEX IF NOT EXISTS idx_academics_sort_order ON academics(sort_order);
CREATE INDEX IF NOT EXISTS idx_experiences_sort_order ON experiences(sort_order);
CREATE INDEX IF NOT EXISTS idx_research_sort_order ON research(sort_order);
CREATE INDEX IF NOT EXISTS idx_publications_sort_order ON publications(sort_order);
CREATE INDEX IF NOT EXISTS idx_gallery_sort_order ON gallery(sort_order);
CREATE INDEX IF NOT EXISTS idx_newspapers_sort_order ON newspapers(sort_order);
CREATE INDEX IF NOT EXISTS idx_skills_sort_order ON skills(sort_order);
CREATE INDEX IF NOT EXISTS idx_trainings_sort_order ON trainings(sort_order);
CREATE INDEX IF NOT EXISTS idx_research_interests_sort_order ON research_interests(sort_order);
CREATE INDEX IF NOT EXISTS idx_social_links_sort_order ON social_links(sort_order);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_anonymous_messages_created_at ON anonymous_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_users_lower_username ON users(LOWER(username));
CREATE INDEX IF NOT EXISTS idx_users_lower_email ON users(LOWER(email));

-- --- Seed Admin User Credentials ---
-- Username: admin
-- Email: tasvesamir15471@gmail.com
-- Password (unhashed): Tasve@12
-- Password Hash (bcrypt): $2b$10$e8sxaKvOAqmMu2NhHSLwoeRi9d27.GGraxsnlh/HJuhCNu3/9O5RG
INSERT INTO users (username, email, password_hash)
VALUES ('admin', 'tasvesamir15471@gmail.com', '$2b$10$e8sxaKvOAqmMu2NhHSLwoeRi9d27.GGraxsnlh/HJuhCNu3/9O5RG')
ON CONFLICT (username) DO UPDATE 
SET email = EXCLUDED.email, 
    password_hash = EXCLUDED.password_hash, 
    updated_at = CURRENT_TIMESTAMP;
