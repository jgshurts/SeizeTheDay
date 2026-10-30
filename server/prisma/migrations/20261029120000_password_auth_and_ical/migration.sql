-- AlterTable
ALTER TABLE "users" ADD COLUMN     "calendar_ical_url" TEXT,
ADD COLUMN     "invite_expires_at" TIMESTAMP(3),
ADD COLUMN     "invite_token_hash" TEXT,
ADD COLUMN     "password_hash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_invite_token_hash_key" ON "users"("invite_token_hash");

