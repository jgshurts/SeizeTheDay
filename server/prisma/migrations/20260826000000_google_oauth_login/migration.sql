-- Replace password auth with Google OAuth login (also used for Calendar
-- read access). Existing rows get a placeholder email so the NOT NULL +
-- unique constraint can be added; update it to a real address once you know
-- who's signing in with what account, or just delete the seeded row.
ALTER TABLE "users" DROP COLUMN "password";
ALTER TABLE "users" ADD COLUMN "email" TEXT;
ALTER TABLE "users" ADD COLUMN "google_id" TEXT;
ALTER TABLE "users" ADD COLUMN "avatar_url" TEXT;
ALTER TABLE "users" ADD COLUMN "google_refresh_token" TEXT;

UPDATE "users" SET "email" = "nickname" || '@placeholder.local' WHERE "email" IS NULL;

ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL;

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");
