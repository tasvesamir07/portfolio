-- Add indexes for pages, gallery, and publications to optimize common query execution paths
CREATE INDEX IF NOT EXISTS idx_pages_slug ON pages(slug);
CREATE INDEX IF NOT EXISTS idx_gallery_category ON gallery(category);
CREATE INDEX IF NOT EXISTS idx_publications_pub_year ON publications(pub_year);
