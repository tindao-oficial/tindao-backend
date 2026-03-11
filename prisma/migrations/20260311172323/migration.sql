/*
  Warnings:

  - You are about to drop the `post_images` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `posts` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "EventCategory" AS ENUM ('MUSIC', 'SPORTS', 'TECH', 'ARTS', 'FOOD', 'NIGHTLIFE', 'NETWORKING', 'OTHER');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELLED', 'FINISHED');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'USED');

-- CreateEnum
CREATE TYPE "InterestAction" AS ENUM ('LIKE', 'DISLIKE', 'SUPER_LIKE');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('PIX', 'CREDIT_CARD', 'FREE');

-- DropForeignKey
ALTER TABLE "post_images" DROP CONSTRAINT "post_images_post_id_fkey";

-- DropForeignKey
ALTER TABLE "posts" DROP CONSTRAINT "posts_author_id_fkey";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "birth_date" TIMESTAMP(3),
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "interests" TEXT[],
ADD COLUMN     "is_organizer" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "profile_photo" TEXT;

-- DropTable
DROP TABLE "post_images";

-- DropTable
DROP TABLE "posts";

-- DropEnum
DROP TYPE "PostStatus";
