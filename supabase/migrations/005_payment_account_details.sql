-- Add payment account details to platform settings

ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS payment_display_name TEXT DEFAULT '';
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS account_holder_name TEXT DEFAULT '';
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS account_number TEXT DEFAULT '';
