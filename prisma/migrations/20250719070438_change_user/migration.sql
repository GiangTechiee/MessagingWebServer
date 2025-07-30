/*
  Warnings:

  - You are about to drop the column `firstName` on the `Users` table. All the data in the column will be lost.
  - You are about to drop the column `lastName` on the `Users` table. All the data in the column will be lost.
  - You are about to drop the column `resetPasswordToken` on the `Users` table. All the data in the column will be lost.
  - You are about to alter the column `email` on the `Users` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `VarChar(100)`.
  - A unique constraint covering the columns `[resetPasswordOTP]` on the table `Users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `fullName` to the `Users` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Users_resetPasswordToken_idx";

-- DropIndex
DROP INDEX "Users_resetPasswordToken_key";

-- AlterTable
ALTER TABLE "Users" DROP COLUMN "firstName",
DROP COLUMN "lastName",
DROP COLUMN "resetPasswordToken",
ADD COLUMN     "fullName" VARCHAR(50) NOT NULL,
ADD COLUMN     "resetPasswordOTP" VARCHAR(6),
ALTER COLUMN "email" SET DATA TYPE VARCHAR(100);

-- CreateIndex
CREATE UNIQUE INDEX "Users_resetPasswordOTP_key" ON "Users"("resetPasswordOTP");

-- CreateIndex
CREATE INDEX "Users_resetPasswordOTP_idx" ON "Users"("resetPasswordOTP");
