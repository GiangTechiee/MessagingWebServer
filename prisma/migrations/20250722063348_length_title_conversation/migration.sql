/*
  Warnings:

  - You are about to alter the column `title` on the `Conversations` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `VarChar(100)`.

*/
-- AlterTable
ALTER TABLE "Conversations" ALTER COLUMN "title" SET DATA TYPE VARCHAR(100);
