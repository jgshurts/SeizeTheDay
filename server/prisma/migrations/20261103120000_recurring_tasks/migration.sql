-- CreateEnum
CREATE TYPE "RecurrenceFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY');

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "series_id" BIGINT;

-- CreateTable
CREATE TABLE "recurring_tasks" (
    "id" BIGSERIAL NOT NULL,
    "owner_id" BIGINT NOT NULL,
    "project_id" BIGINT,
    "priority_group_id" BIGINT,
    "description" TEXT NOT NULL,
    "frequency" "RecurrenceFrequency" NOT NULL,
    "interval" INTEGER NOT NULL DEFAULT 1,
    "weekdays" INTEGER[],
    "month_day" INTEGER,
    "month" INTEGER,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "skip_if_missed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recurring_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tasks_series_id_date_planned_key" ON "tasks"("series_id", "date_planned");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "recurring_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_tasks" ADD CONSTRAINT "recurring_tasks_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_tasks" ADD CONSTRAINT "recurring_tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_tasks" ADD CONSTRAINT "recurring_tasks_priority_group_id_fkey" FOREIGN KEY ("priority_group_id") REFERENCES "priority_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

