-- Performance indexes for multi-tenant queries
-- Speeds up per-tenant lookups on business tables

CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_meals_tenant ON meals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_tenant ON sales(tenant_id);
CREATE INDEX IF NOT EXISTS idx_app_users_tenant ON app_users(tenant_id);

-- Composite index for tenant-scoped, date-filtered sales (Dashboard & Reports)
CREATE INDEX IF NOT EXISTS idx_sales_tenant_date ON sales(tenant_id, date);
