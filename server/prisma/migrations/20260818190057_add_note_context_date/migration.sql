-- AlterTable
ALTER TABLE "notes" ADD COLUMN "context_date" DATE;

-- Backfill existing rows from their creation date
UPDATE "notes" SET "context_date" = "created_at"::date WHERE "context_date" IS NULL;

-- AlterTable
ALTER TABLE "notes" ALTER COLUMN "context_date" SET NOT NULL;
