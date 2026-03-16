-- CreateEnum
CREATE TYPE "EventAttendanceStatus" AS ENUM ('INTERESTED', 'GOING', 'CHECKED_IN', 'ATTENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EventAttendanceSource" AS ENUM ('MANUAL', 'TICKET', 'ORGANIZER', 'SYSTEM');

-- CreateTable
CREATE TABLE "event_attendances" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "EventAttendanceStatus" NOT NULL,
    "source" "EventAttendanceSource" NOT NULL DEFAULT 'MANUAL',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_attendances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_attendances_event_id_idx" ON "event_attendances"("event_id");

-- CreateIndex
CREATE INDEX "event_attendances_user_id_idx" ON "event_attendances"("user_id");

-- CreateIndex
CREATE INDEX "event_attendances_status_idx" ON "event_attendances"("status");

-- CreateIndex
CREATE INDEX "event_attendances_created_at_idx" ON "event_attendances"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "event_attendances_event_id_user_id_key" ON "event_attendances"("event_id", "user_id");

-- AddForeignKey
ALTER TABLE "event_attendances" ADD CONSTRAINT "event_attendances_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_attendances" ADD CONSTRAINT "event_attendances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
