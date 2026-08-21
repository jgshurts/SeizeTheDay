-- AlterTable
ALTER TABLE "statuses" ADD COLUMN "is_default" BOOLEAN NOT NULL DEFAULT false;

-- Make room at the front of the sort order for a new default status
UPDATE "statuses" SET "ordinal" = "ordinal" + 1;

-- A task with no status previously sorted last (NULL sorts after
-- everything in ascending order) regardless of intent. Give "not started"
-- an explicit status instead, at the front of the order, and make it the
-- default so new tasks land there rather than with no status at all.
INSERT INTO "statuses" (status_code, is_complete, background_color, foreground_color, description, ordinal, is_default)
VALUES ('-', false, '#f3f4f6', '#374151', 'Not Started', 1, true);
