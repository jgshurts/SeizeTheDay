-- Project color, used to render tasks/notes/tagged calendar events.
ALTER TABLE "projects" ADD COLUMN "color" TEXT;

-- Manual link from a Google Calendar event to a Project, so the Schedule
-- column can color a tagged meeting the same way -- there's no such
-- relationship on Google's side to read.
CREATE TABLE "event_project_tags" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "google_event_id" TEXT NOT NULL,
    "project_id" BIGINT NOT NULL,

    CONSTRAINT "event_project_tags_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "event_project_tags_user_id_google_event_id_key" ON "event_project_tags"("user_id", "google_event_id");

ALTER TABLE "event_project_tags" ADD CONSTRAINT "event_project_tags_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_project_tags" ADD CONSTRAINT "event_project_tags_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
