-- Add custom_sidebar_order column to about table to save custom admin sidebar tab positions
ALTER TABLE about ADD COLUMN IF NOT EXISTS custom_sidebar_order JSONB DEFAULT '[]';
