CREATE TABLE IF NOT EXISTS translations (
  id SERIAL PRIMARY KEY,
  source_hash VARCHAR(64) NOT NULL,
  source_text TEXT NOT NULL,
  target_lang VARCHAR(10) NOT NULL,
  translated_text TEXT NOT NULL,
  is_reviewed BOOLEAN DEFAULT false,
  is_html BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(source_hash, target_lang)
);

CREATE INDEX IF NOT EXISTS idx_translations_lookup
  ON translations(source_hash, target_lang);
