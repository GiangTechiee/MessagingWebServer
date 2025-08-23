/*
  Warnings:

  - You are about to alter the column `content` on the `Messages` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.

*/
-- AlterTable
ALTER TABLE "Messages" ALTER COLUMN "content" SET DATA TYPE VARCHAR(255);
