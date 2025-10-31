-- Minimal schema for the Netlify/Neon migration
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  object_data jsonb,
  created_at timestamptz DEFAULT now()
);

-- Example indexes
CREATE INDEX IF NOT EXISTS idx_objects_type_created ON objects(type, created_at DESC);

