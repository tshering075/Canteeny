-- Owner can enable/disable free trial access for clients.

ALTER TABLE platform_settings
  ADD COLUMN IF NOT EXISTS free_trial_enabled BOOLEAN DEFAULT true;
