/*
  Warnings:

  - Added the required column `groupAvatar` to the `Conversations` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Conversations" ADD COLUMN     "groupAvatar" VARCHAR(255) NOT NULL,
ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Users" ADD COLUMN     "background" VARCHAR(255);
