/*
  Warnings:

  - A unique constraint covering the columns `[userId,friendId]` on the table `Contacts` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Contacts_userId_contactId_key";

-- CreateIndex
CREATE UNIQUE INDEX "Contacts_userId_friendId_key" ON "Contacts"("userId", "friendId");
