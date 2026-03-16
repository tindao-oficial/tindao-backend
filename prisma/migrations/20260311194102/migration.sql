-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('MAIN', 'PRE_PARTY', 'AFTER_PARTY');

-- CreateEnum
CREATE TYPE "SubEventPermissionMode" AS ENUM ('DISABLED', 'ORGANIZER_ONLY', 'ATTENDEES_ALLOWED');

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "EventType" NOT NULL,
    "category" "EventCategory" NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "cover_image" TEXT,
    "city" TEXT NOT NULL,
    "venue_name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "organizer_id" TEXT NOT NULL,
    "parent_event_id" TEXT,
    "root_event_id" TEXT,
    "pre_party_permission_mode" "SubEventPermissionMode" NOT NULL DEFAULT 'ORGANIZER_ONLY',
    "after_party_permission_mode" "SubEventPermissionMode" NOT NULL DEFAULT 'ORGANIZER_ONLY',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "events_organizer_id_idx" ON "events"("organizer_id");

-- CreateIndex
CREATE INDEX "events_city_idx" ON "events"("city");

-- CreateIndex
CREATE INDEX "events_start_at_idx" ON "events"("start_at");

-- CreateIndex
CREATE INDEX "events_type_idx" ON "events"("type");

-- CreateIndex
CREATE INDEX "events_parent_event_id_idx" ON "events"("parent_event_id");

-- CreateIndex
CREATE INDEX "events_root_event_id_idx" ON "events"("root_event_id");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_parent_event_id_fkey" FOREIGN KEY ("parent_event_id") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_root_event_id_fkey" FOREIGN KEY ("root_event_id") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
