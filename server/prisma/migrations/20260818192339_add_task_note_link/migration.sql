-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "note_id" BIGINT;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_note_id_fkey" FOREIGN KEY ("note_id") REFERENCES "notes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
