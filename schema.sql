-- Samir Portfolio Database Schema

-- 1. Users table (Admin management)
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

-- Seed default admin user (Username: admin, Password: admin)
INSERT INTO users (username, email, password_hash) 
VALUES ('admin', 'tasvesamir15471@gmail.com', '$2b$10$H9Lh.wuPGAj5v9GiwnxI0eOvinIhUOx/p1MptF/6g2NUEP8iGvq7O')
ON CONFLICT (username) DO NOTHING;

-- 2. About table (Personal information)
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Pages table (CMS Dynamic Pages)
CREATE TABLE IF NOT EXISTS pages (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    content TEXT DEFAULT '',
    show_in_nav BOOLEAN DEFAULT true,
    details_json TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Academics table
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

-- 5. Experiences table
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

-- 6. Trainings table
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

-- 7. Skills table
CREATE TABLE IF NOT EXISTS skills (
    id SERIAL PRIMARY KEY,
    category VARCHAR(100),
    items TEXT,
    details_json TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Research Interests table
CREATE TABLE IF NOT EXISTS research_interests (
    id SERIAL PRIMARY KEY,
    interest VARCHAR(255),
    details TEXT,
    icon_name VARCHAR(100),
    details_json TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Research Projects table
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

-- 10. Publications table
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. Gallery Categories table
CREATE TABLE IF NOT EXISTS gallery_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    sort_order INTEGER DEFAULT 0
);

-- 12. Gallery table
CREATE TABLE IF NOT EXISTS gallery (
    id SERIAL PRIMARY KEY,
    image_url TEXT NOT NULL,
    caption TEXT,
    category VARCHAR(100),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13. Messages table (Contact Form)
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(255),
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 14. Social Links table
CREATE TABLE IF NOT EXISTS social_links (
    id SERIAL PRIMARY KEY,
    platform VARCHAR(100),
    url TEXT,
    icon_name VARCHAR(100),
    color_class VARCHAR(100),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
