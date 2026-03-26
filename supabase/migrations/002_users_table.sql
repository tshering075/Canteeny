-- Users table for app authentication (admin/1234 default)
CREATE TABLE IF NOT EXISTS app_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  can_read BOOLEAN DEFAULT true,
  can_write BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default admin user (password: 1234)
INSERT INTO app_users (user_id, password, can_read, can_write)
VALUES ('admin', '1234', true, true)
ON CONFLICT (user_id) DO NOTHING;
