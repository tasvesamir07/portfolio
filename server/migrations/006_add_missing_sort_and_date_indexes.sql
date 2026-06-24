-- Add indexes for sort columns and timestamps to optimize portfolio queries
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
