-- Multi-user ownership. Until now the app had a single user, so every
-- existing note and project is assigned to the earliest user, who also
-- becomes the first admin. Owner columns are added nullable, backfilled,
-- then made NOT NULL so existing rows don't violate the constraint.

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "is_admin" BOOLEAN NOT NULL DEFAULT false;

UPDATE "users" SET "is_admin" = true WHERE "id" = (SELECT MIN("id") FROM "users");

-- AlterTable
ALTER TABLE "notes" ADD COLUMN     "owner_id" BIGINT;
UPDATE "notes" SET "owner_id" = (SELECT MIN("id") FROM "users");
ALTER TABLE "notes" ALTER COLUMN "owner_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "owner_id" BIGINT;
UPDATE "projects" SET "owner_id" = (SELECT MIN("id") FROM "users");
ALTER TABLE "projects" ALTER COLUMN "owner_id" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
