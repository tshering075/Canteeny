-- Distinguish cash vs credit canteen sales.
-- Existing rows default to 'credit' (previous Complete Sale behavior).

ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'credit';

UPDATE sales
SET payment_type = 'credit'
WHERE payment_type IS NULL;

ALTER TABLE sales
  ALTER COLUMN payment_type SET DEFAULT 'credit';

ALTER TABLE sales
  ALTER COLUMN payment_type SET NOT NULL;

DO $$
BEGIN
  ALTER TABLE sales
    ADD CONSTRAINT sales_payment_type_check
    CHECK (payment_type IN ('credit', 'cash'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_sales_payment_type ON sales (payment_type);
