-- Per-client free trial access control (owner can enable/disable per tenant).

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS free_trial_enabled BOOLEAN DEFAULT true;
