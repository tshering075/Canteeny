-- Allow 14-day free trial as a subscription plan type.

ALTER TABLE tenants DROP CONSTRAINT IF EXISTS tenants_plan_type_check;
ALTER TABLE tenants
  ADD CONSTRAINT tenants_plan_type_check
  CHECK (plan_type IS NULL OR plan_type IN ('trial', 'monthly', '6month', 'annual'));

ALTER TABLE payment_submissions DROP CONSTRAINT IF EXISTS payment_submissions_plan_type_check;
ALTER TABLE payment_submissions
  ADD CONSTRAINT payment_submissions_plan_type_check
  CHECK (plan_type IN ('trial', 'monthly', '6month', 'annual'));
