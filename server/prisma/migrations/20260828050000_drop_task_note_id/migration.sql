-- The "task created from this note" link is superseded by in-text "@REF"
-- note references and the dedicated blocker-note field -- dropping it here
-- permanently discards note_id for any task that still had one set.
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_note_id_fkey";
ALTER TABLE "tasks" DROP COLUMN "note_id";
