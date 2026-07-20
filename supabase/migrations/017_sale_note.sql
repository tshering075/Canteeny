-- Optional note on a sale (e.g. balance after coupon split)
ALTER TABLE sales ADD COLUMN IF NOT EXISTS sale_note TEXT DEFAULT '';
