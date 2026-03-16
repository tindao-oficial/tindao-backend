/*
  Warnings:

  - A unique constraint covering the columns `[invite_code]` on the table `events` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `invite_code` to the `events` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "events" ADD COLUMN     "invite_code" TEXT NOT NULL,
ADD COLUMN     "is_private" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "events_invite_code_key" ON "events"("invite_code");
