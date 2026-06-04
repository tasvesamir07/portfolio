-- Create anonymous_messages table

CREATE TABLE IF NOT EXISTS anonymous_messages (
  id SERIAL PRIMARY KEY,
  message TEXT NOT NULL,
  ip_address TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  is_read BOOLEAN DEFAULT FALSE
);
