-- A task's "blocker note" -- distinct from note_id (the note it was
-- created from) -- is the known place for what's blocking it and who's
-- working on clearing it, when a task's status is Blocked.
ALTER TABLE "tasks" ADD COLUMN "blocker_note_id" BIGINT;

ALTER TABLE "tasks" ADD CONSTRAINT "tasks_blocker_note_id_fkey" FOREIGN KEY ("blocker_note_id") REFERENCES "notes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
