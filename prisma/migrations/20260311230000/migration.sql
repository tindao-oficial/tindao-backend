-- CreateEnum
CREATE TYPE "SubEventApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "events" ADD COLUMN "approval_status" "SubEventApprovalStatus";

-- CreateIndex
CREATE INDEX "events_approval_status_idx" ON "events"("approval_status");
