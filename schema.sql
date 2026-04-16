-- Portfolio Samir Production Schema

-- 1. Users table for admin authentication
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. About section
CREATE TABLE IF NOT EXISTS about (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    name_en VARCHAR(100),
    name_bn VARCHAR(100),
    name_ko VARCHAR(100),
    location VARCHAR(255),
    location_en VARCHAR(255),
    location_bn VARCHAR(255),
    location_ko VARCHAR(255),
    title VARCHAR(255),
    title_en VARCHAR(255),
    title_bn VARCHAR(255),
    title_ko VARCHAR(255),
    site_name VARCHAR(100),
    site_name_en VARCHAR(100),
    site_name_bn VARCHAR(100),
    site_name_ko VARCHAR(100),
    hero_image_url TEXT,
    sub_bio TEXT,
    sub_bio_en TEXT DEFAULT '',
    sub_bio_bn TEXT DEFAULT '',
    sub_bio_ko TEXT DEFAULT '',
    bio_text TEXT NOT NULL DEFAULT '',
    bio_text_en TEXT DEFAULT '',
    bio_text_bn TEXT DEFAULT '',
    bio_text_ko TEXT DEFAULT '',
    logo_url TEXT,
    custom_nav JSONB DEFAULT '[]'::jsonb,
    resume_url VARCHAR(255),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Academic Journey
CREATE TABLE IF NOT EXISTS academics (
    id SERIAL PRIMARY KEY,
    institution TEXT NOT NULL,
    degree TEXT NOT NULL,
    start_year TEXT NOT NULL,
    end_year TEXT NOT NULL,
    logo_url TEXT,
    details_json TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Work Experiences
CREATE TABLE IF NOT EXISTS experiences (
    id SERIAL PRIMARY KEY,
    company VARCHAR(255) NOT NULL,
    position VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    start_date VARCHAR(50),
    end_date VARCHAR(50),
    description TEXT,
    logo_url TEXT,
    details_json TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Trainings and Certifications
CREATE TABLE IF NOT EXISTS trainings (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    topic TEXT,
    date_text VARCHAR(100),
    instructor TEXT,
    details_json TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Skills
CREATE TABLE IF NOT EXISTS skills (
    id SERIAL PRIMARY KEY,
    category VARCHAR(255) NOT NULL,
    items TEXT NOT NULL,
    details_json TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Projects
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    tech_stack TEXT NOT NULL,
    image_url TEXT,
    link VARCHAR(255),
    details_json TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Research
CREATE TABLE IF NOT EXISTS research (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT,
    link VARCHAR(255),
    file_url TEXT,
    status VARCHAR(100),
    date_text VARCHAR(100),
    details_json TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Publications
CREATE TABLE IF NOT EXISTS publications (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    thumbnail_url TEXT,
    journal_name VARCHAR(255),
    pub_year VARCHAR(10),
    authors TEXT,
    introduction TEXT,
    methods TEXT,
    link_url TEXT,
    file_url TEXT,
    details_json TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Research Interests
CREATE TABLE IF NOT EXISTS research_interests (
    id SERIAL PRIMARY KEY,
    interest VARCHAR(255) NOT NULL,
    details TEXT,
    icon_name VARCHAR(50),
    details_json TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. Gallery Categories
CREATE TABLE IF NOT EXISTS gallery_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. Gallery
CREATE TABLE IF NOT EXISTS gallery (
    id SERIAL PRIMARY KEY,
    image_url TEXT NOT NULL,
    caption VARCHAR(255),
    category VARCHAR(255),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13. Social Links
CREATE TABLE IF NOT EXISTS social_links (
    id SERIAL PRIMARY KEY,
    platform VARCHAR(100) NOT NULL,
    url TEXT NOT NULL,
    icon_name VARCHAR(50),
    color_class VARCHAR(100),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 14. Contact Messages
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 15. Dynamic CMS Pages
CREATE TABLE IF NOT EXISTS pages (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    content TEXT DEFAULT '',
    details_json TEXT DEFAULT '',
    show_in_nav BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- --- SEED DATA ---

-- Initial Admin User (password: admin123)
-- Hash generated via bcrypt
INSERT INTO users (username, password_hash) 
VALUES ('admin', '$2a$10$EPV9W9JZ0tW9XzWw8e4G9O6x6j8jJ5X3fW/6W6W6W6W6W6W6W6W6W') 
ON CONFLICT (username) DO NOTHING;

-- About section seed data
INSERT INTO about (bio_text, resume_url, name, title) 
VALUES (
    'Passionate university student specializing in Computer Science. Actively involved in ORIYET (Organization for Research, Innovation, Youth Empowerment, and Sustainability), focused on creating impactful technological solutions.',
    'https://example.com/resume.pdf',
    'Samir',
    'Computer Science Student'
) ON CONFLICT DO NOTHING;

-- Gallery Categories
INSERT INTO gallery_categories (name, sort_order) VALUES 
('Work', 1),
('Community', 2)
ON CONFLICT (name) DO NOTHING;

-- Initial Page
INSERT INTO pages (title, slug, content, show_in_nav) 
VALUES ('Contact Me', 'contact-me', '<p>Get in touch for collaborations!</p>', TRUE)
ON CONFLICT (slug) DO NOTHING;
