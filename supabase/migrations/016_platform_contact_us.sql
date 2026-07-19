-- Contact Us details shown to clients (configured by platform owner)
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS contact_name TEXT DEFAULT '';
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS contact_whatsapp TEXT DEFAULT '';
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS contact_email TEXT DEFAULT '';
