-- Multi-tenant subscription system for Canteeny SaaS

-- Tenants (canteen business clients)
CREATE TABLE IF NOT EXISTS tenants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  contact_name TEXT DEFAULT '',
  contact_phone TEXT DEFAULT '',
  contact_email TEXT DEFAULT '',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'expired')),
  plan_type TEXT CHECK (plan_type IN ('monthly', '6month', 'annual')),
  plan_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Platform settings (singleton row for app owner)
CREATE TABLE IF NOT EXISTS platform_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  qr_image_data TEXT DEFAULT '',
  payment_display_name TEXT DEFAULT '',
  account_holder_name TEXT DEFAULT '',
  account_number TEXT DEFAULT '',
  monthly_price NUMERIC(10, 2) DEFAULT 500,
  six_month_price NUMERIC(10, 2) DEFAULT 2700,
  annual_price NUMERIC(10, 2) DEFAULT 5000,
  mobile_pay_instructions TEXT DEFAULT 'Scan the QR code and upload your payment screenshot.',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO platform_settings (monthly_price, six_month_price, annual_price)
SELECT 500, 2700, 5000
WHERE NOT EXISTS (SELECT 1 FROM platform_settings LIMIT 1);

-- Payment submissions from tenants
CREATE TABLE IF NOT EXISTS payment_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('monthly', '6month', 'annual')),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'mobile_pay')),
  amount NUMERIC(10, 2) DEFAULT 0,
  screenshot_data TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT DEFAULT '',
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payment_submissions_tenant ON payment_submissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_submissions_status ON payment_submissions(status);

-- Extend app_users for multi-tenancy
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS is_platform_admin BOOLEAN DEFAULT false;

-- Add tenant_id to business tables
ALTER TABLE customers ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE meals ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Migrate existing single-tenant data to a default tenant
DO $$
DECLARE
  default_tenant_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM tenants LIMIT 1) THEN
    INSERT INTO tenants (name, status, plan_type, plan_expires_at)
    VALUES ('Default Canteen', 'active', 'annual', NOW() + INTERVAL '1 year')
    RETURNING id INTO default_tenant_id;

    UPDATE customers SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
    UPDATE meals SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
    UPDATE sales SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
    UPDATE app_users SET tenant_id = default_tenant_id WHERE tenant_id IS NULL AND is_platform_admin IS NOT TRUE;
  END IF;
END $$;

-- Platform owner account (password: owner123 — change after first login)
INSERT INTO app_users (user_id, password, can_read, can_write, is_platform_admin, tenant_id)
SELECT 'owner', 'owner123', true, true, true, NULL
WHERE NOT EXISTS (SELECT 1 FROM app_users WHERE is_platform_admin = true);

-- RLS policies (permissive anon, matching existing pattern)
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all_tenants" ON tenants;
DROP POLICY IF EXISTS "anon_all_platform_settings" ON platform_settings;
DROP POLICY IF EXISTS "anon_all_payment_submissions" ON payment_submissions;

CREATE POLICY "anon_all_tenants" ON tenants FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_platform_settings" ON platform_settings FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_payment_submissions" ON payment_submissions FOR ALL TO anon USING (true) WITH CHECK (true);
