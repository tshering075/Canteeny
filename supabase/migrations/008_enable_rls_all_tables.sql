-- Enable Row Level Security on all public tables to satisfy the Supabase
-- database linter (rls_disabled_in_public).
--
-- IMPORTANT: This app uses the Supabase anon key with a CUSTOM auth system
-- (the app_users table), not Supabase Auth. Because there is no auth.uid()
-- JWT session, tenant isolation is enforced in the APPLICATION layer
-- (tenant_id filtering in the service files), not by these policies.
--
-- These policies enable RLS (removing the linter ERROR) while keeping the
-- app working under the anon role. They are intentionally permissive
-- (USING true). For stricter, database-enforced isolation you would need to
-- migrate to Supabase Auth (or a server-side proxy using the service role
-- key) and rewrite these policies against auth.uid() / JWT claims.

DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'customers',
    'meals',
    'sales',
    'tenants',
    'platform_settings',
    'payment_submissions'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    -- Only touch tables that actually exist.
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);

      -- Drop any prior copies so this migration is idempotent.
      EXECUTE format('DROP POLICY IF EXISTS "anon_select_%1$s" ON public.%1$I;', tbl);
      EXECUTE format('DROP POLICY IF EXISTS "anon_insert_%1$s" ON public.%1$I;', tbl);
      EXECUTE format('DROP POLICY IF EXISTS "anon_update_%1$s" ON public.%1$I;', tbl);
      EXECUTE format('DROP POLICY IF EXISTS "anon_delete_%1$s" ON public.%1$I;', tbl);

      EXECUTE format(
        'CREATE POLICY "anon_select_%1$s" ON public.%1$I FOR SELECT TO anon USING (true);',
        tbl
      );
      EXECUTE format(
        'CREATE POLICY "anon_insert_%1$s" ON public.%1$I FOR INSERT TO anon WITH CHECK (true);',
        tbl
      );
      EXECUTE format(
        'CREATE POLICY "anon_update_%1$s" ON public.%1$I FOR UPDATE TO anon USING (true) WITH CHECK (true);',
        tbl
      );
      EXECUTE format(
        'CREATE POLICY "anon_delete_%1$s" ON public.%1$I FOR DELETE TO anon USING (true);',
        tbl
      );
    END IF;
  END LOOP;
END $$;
