-- Coupons for free meal/drink redemptions, plus coupon sales tracking.

CREATE TABLE IF NOT EXISTS coupons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  quantity NUMERIC(10, 2) DEFAULT 1 NOT NULL,
  rate NUMERIC(10, 2) DEFAULT 0 NOT NULL,
  is_active BOOLEAN DEFAULT true,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupons_tenant ON coupons (tenant_id);
CREATE INDEX IF NOT EXISTS idx_coupons_name ON coupons (name);

-- Allow coupon as a sales payment type (drop old check, add new).
ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_payment_type_check;

DO $$
BEGIN
  ALTER TABLE sales
    ADD CONSTRAINT sales_payment_type_check
    CHECK (payment_type IN ('credit', 'cash', 'coupon'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES coupons(id) ON DELETE SET NULL;

ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS coupon_name TEXT;

CREATE INDEX IF NOT EXISTS idx_sales_coupon_id ON sales (coupon_id);

-- RLS for coupons (same permissive anon pattern as other app tables)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'coupons'
  ) THEN
    ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "anon_select_coupons" ON public.coupons;
    DROP POLICY IF EXISTS "anon_insert_coupons" ON public.coupons;
    DROP POLICY IF EXISTS "anon_update_coupons" ON public.coupons;
    DROP POLICY IF EXISTS "anon_delete_coupons" ON public.coupons;

    CREATE POLICY "anon_select_coupons" ON public.coupons FOR SELECT TO anon USING (true);
    CREATE POLICY "anon_insert_coupons" ON public.coupons FOR INSERT TO anon WITH CHECK (true);
    CREATE POLICY "anon_update_coupons" ON public.coupons FOR UPDATE TO anon USING (true) WITH CHECK (true);
    CREATE POLICY "anon_delete_coupons" ON public.coupons FOR DELETE TO anon USING (true);
  END IF;
END $$;
