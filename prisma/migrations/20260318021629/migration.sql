/*
  Warnings:

  - The values [INTERESTED] on the enum `EventAttendanceStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "EventAttendanceStatus_new" AS ENUM ('GOING', 'CHECKED_IN', 'ATTENDED', 'CANCELLED');
ALTER TABLE "event_attendances" ALTER COLUMN "status" TYPE "EventAttendanceStatus_new" USING ("status"::text::"EventAttendanceStatus_new");
ALTER TYPE "EventAttendanceStatus" RENAME TO "EventAttendanceStatus_old";
ALTER TYPE "EventAttendanceStatus_new" RENAME TO "EventAttendanceStatus";
DROP TYPE "public"."EventAttendanceStatus_old";
COMMIT;

-- CreateTable
CREATE TABLE "user_event_favorites" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_event_favorites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_event_favorites_user_id_idx" ON "user_event_favorites"("user_id");

-- CreateIndex
CREATE INDEX "user_event_favorites_event_id_idx" ON "user_event_favorites"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_event_favorites_user_id_event_id_key" ON "user_event_favorites"("user_id", "event_id");

-- AddForeignKey
ALTER TABLE "user_event_favorites" ADD CONSTRAINT "user_event_favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_event_favorites" ADD CONSTRAINT "user_event_favorites_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
