-- Marks which status means "blocked" so the task blocker-note UI can key
-- off the status itself instead of guessing from its name/description.
ALTER TABLE "statuses" ADD COLUMN "is_blocked" BOOLEAN NOT NULL DEFAULT false;
