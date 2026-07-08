-- Delete sales from March through May (inclusive) to free database space.
-- ⚠️  PERMANENT — back up first if you may need this data later.
--
-- Steps:
--   1. Run the PREVIEW block below and confirm the row count.
--   2. Change the year in both blocks if needed (default: 2026).
--   3. Run the DELETE block.

-- ── PREVIEW (run this first) ────────────────────────────────────────────────
-- SELECT
--   date,
--   COUNT(*) AS sale_count,
--   ROUND(SUM(total_amount)::numeric, 2) AS total_nu
-- FROM sales
-- WHERE date >= '2026-03-01'
--   AND date <= '2026-05-31'
-- GROUP BY date
-- ORDER BY date;

-- SELECT COUNT(*) AS rows_to_delete
-- FROM sales
-- WHERE date >= '2026-03-01'
--   AND date <= '2026-05-31';

-- ── DELETE ──────────────────────────────────────────────────────────────────
DELETE FROM sales
WHERE date >= '2026-03-01'
  AND date <= '2026-05-31';
