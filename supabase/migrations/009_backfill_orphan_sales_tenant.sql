-- Backfill sales rows that were saved without tenant_id (legacy insert fallback).
-- Run in Supabase SQL Editor after deploying the app fix.

-- 1) See how many orphan sales exist per date (run this first to verify the issue)
-- SELECT date, COUNT(*) AS orphan_count
-- FROM sales
-- WHERE tenant_id IS NULL
-- GROUP BY date
-- ORDER BY date DESC;

-- 2) Assign orphan sales to the default / only tenant when there is exactly one tenant.
DO $$
DECLARE
  only_tenant_id UUID;
  tenant_count INT;
  updated_count INT;
BEGIN
  SELECT COUNT(*) INTO tenant_count FROM tenants;
  IF tenant_count = 1 THEN
    SELECT id INTO only_tenant_id FROM tenants LIMIT 1;
    UPDATE sales
    SET tenant_id = only_tenant_id
    WHERE tenant_id IS NULL;
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Backfilled % orphan sales to tenant %', updated_count, only_tenant_id;
  ELSE
    RAISE NOTICE 'Skipped auto-backfill: % tenants found. Assign tenant_id manually.', tenant_count;
  END IF;
END $$;
