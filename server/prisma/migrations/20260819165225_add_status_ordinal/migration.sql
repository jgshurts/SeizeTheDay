-- AlterTable
ALTER TABLE "statuses" ADD COLUMN "ordinal" INTEGER;

-- Backfill: incomplete statuses first (by status_code), completed ones last,
-- so existing data sorts sensibly the moment this migration lands.
UPDATE "statuses" AS s
SET "ordinal" = sub.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY is_complete ASC, status_code ASC) AS rn
  FROM "statuses"
) AS sub
WHERE s.id = sub.id;

-- AlterTable
ALTER TABLE "statuses" ALTER COLUMN "ordinal" SET NOT NULL;
