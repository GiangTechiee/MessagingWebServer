/*
  Warnings:

  - The values [direct,group] on the enum `ConversationType` will be removed. If these variants are still used in the database, this will fail.
  - The values [image,video,audio,pdf,document,other] on the enum `FileType` will be removed. If these variants are still used in the database, this will fail.
  - The values [text,file] on the enum `MessageType` will be removed. If these variants are still used in the database, this will fail.
  - The values [message,mention,group_invite,friend_request,other] on the enum `NotificationType` will be removed. If these variants are still used in the database, this will fail.
  - The values [member,admin,moderator] on the enum `ParticipantRole` will be removed. If these variants are still used in the database, this will fail.
  - The values [pending,approved,rejected] on the enum `RequestStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [user,admin] on the enum `UserRole` will be removed. If these variants are still used in the database, this will fail.
  - The primary key for the `Conversations` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Users` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ConversationType_new" AS ENUM ('DIRECT', 'GROUP');
ALTER TABLE "Conversations" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "Conversations" ALTER COLUMN "type" TYPE "ConversationType_new" USING ("type"::text::"ConversationType_new");
ALTER TYPE "ConversationType" RENAME TO "ConversationType_old";
ALTER TYPE "ConversationType_new" RENAME TO "ConversationType";
DROP TYPE "ConversationType_old";
ALTER TABLE "Conversations" ALTER COLUMN "type" SET DEFAULT 'DIRECT';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "FileType_new" AS ENUM ('IMAGE', 'VIDEO', 'AUDIO', 'PDF', 'DOCUMENT', 'OTHER');
ALTER TABLE "Attachments" ALTER COLUMN "fileType" TYPE "FileType_new" USING ("fileType"::text::"FileType_new");
ALTER TYPE "FileType" RENAME TO "FileType_old";
ALTER TYPE "FileType_new" RENAME TO "FileType";
DROP TYPE "FileType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "MessageType_new" AS ENUM ('TEXT', 'FILE');
ALTER TABLE "Messages" ALTER COLUMN "messageType" DROP DEFAULT;
ALTER TABLE "Messages" ALTER COLUMN "messageType" TYPE "MessageType_new" USING ("messageType"::text::"MessageType_new");
ALTER TYPE "MessageType" RENAME TO "MessageType_old";
ALTER TYPE "MessageType_new" RENAME TO "MessageType";
DROP TYPE "MessageType_old";
ALTER TABLE "Messages" ALTER COLUMN "messageType" SET DEFAULT 'TEXT';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "NotificationType_new" AS ENUM ('MESSAGE', 'MENTION', 'GROUP_INVITE', 'FRIEND_REQUEST', 'OTHER');
ALTER TABLE "Notifications" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "Notifications" ALTER COLUMN "type" TYPE "NotificationType_new" USING ("type"::text::"NotificationType_new");
ALTER TYPE "NotificationType" RENAME TO "NotificationType_old";
ALTER TYPE "NotificationType_new" RENAME TO "NotificationType";
DROP TYPE "NotificationType_old";
ALTER TABLE "Notifications" ALTER COLUMN "type" SET DEFAULT 'MESSAGE';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "ParticipantRole_new" AS ENUM ('MEMBER', 'ADMIN', 'MODERATOR');
ALTER TABLE "Participants" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "Participants" ALTER COLUMN "role" TYPE "ParticipantRole_new" USING ("role"::text::"ParticipantRole_new");
ALTER TYPE "ParticipantRole" RENAME TO "ParticipantRole_old";
ALTER TYPE "ParticipantRole_new" RENAME TO "ParticipantRole";
DROP TYPE "ParticipantRole_old";
ALTER TABLE "Participants" ALTER COLUMN "role" SET DEFAULT 'MEMBER';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "RequestStatus_new" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
ALTER TABLE "FriendRequests" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "JoinRequests" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "FriendRequests" ALTER COLUMN "status" TYPE "RequestStatus_new" USING ("status"::text::"RequestStatus_new");
ALTER TABLE "JoinRequests" ALTER COLUMN "status" TYPE "RequestStatus_new" USING ("status"::text::"RequestStatus_new");
ALTER TYPE "RequestStatus" RENAME TO "RequestStatus_old";
ALTER TYPE "RequestStatus_new" RENAME TO "RequestStatus";
DROP TYPE "RequestStatus_old";
ALTER TABLE "FriendRequests" ALTER COLUMN "status" SET DEFAULT 'PENDING';
ALTER TABLE "JoinRequests" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "UserRole_new" AS ENUM ('USER', 'ADMIN');
ALTER TABLE "Users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "Users" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "UserRole_old";
ALTER TABLE "Users" ALTER COLUMN "role" SET DEFAULT 'USER';
COMMIT;

-- DropForeignKey
ALTER TABLE "Contacts" DROP CONSTRAINT "Contacts_friendId_fkey";

-- DropForeignKey
ALTER TABLE "Contacts" DROP CONSTRAINT "Contacts_userId_fkey";

-- DropForeignKey
ALTER TABLE "Conversations" DROP CONSTRAINT "Conversations_creatorId_fkey";

-- DropForeignKey
ALTER TABLE "FriendRequests" DROP CONSTRAINT "FriendRequests_receiverId_fkey";

-- DropForeignKey
ALTER TABLE "FriendRequests" DROP CONSTRAINT "FriendRequests_senderId_fkey";

-- DropForeignKey
ALTER TABLE "JoinRequests" DROP CONSTRAINT "JoinRequests_conversationId_fkey";

-- DropForeignKey
ALTER TABLE "JoinRequests" DROP CONSTRAINT "JoinRequests_respondedById_fkey";

-- DropForeignKey
ALTER TABLE "JoinRequests" DROP CONSTRAINT "JoinRequests_userId_fkey";

-- DropForeignKey
ALTER TABLE "Messages" DROP CONSTRAINT "Messages_conversationId_fkey";

-- DropForeignKey
ALTER TABLE "Messages" DROP CONSTRAINT "Messages_senderId_fkey";

-- DropForeignKey
ALTER TABLE "Notifications" DROP CONSTRAINT "Notifications_userId_fkey";

-- DropForeignKey
ALTER TABLE "Participants" DROP CONSTRAINT "Participants_conversationId_fkey";

-- DropForeignKey
ALTER TABLE "Participants" DROP CONSTRAINT "Participants_userId_fkey";

-- DropForeignKey
ALTER TABLE "Sessions" DROP CONSTRAINT "Sessions_userId_fkey";

-- AlterTable
ALTER TABLE "Contacts" ALTER COLUMN "userId" SET DATA TYPE TEXT,
ALTER COLUMN "friendId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Conversations" DROP CONSTRAINT "Conversations_pkey",
ALTER COLUMN "conversationId" DROP DEFAULT,
ALTER COLUMN "conversationId" SET DATA TYPE TEXT,
ALTER COLUMN "type" SET DEFAULT 'DIRECT',
ALTER COLUMN "creatorId" SET DATA TYPE TEXT,
ADD CONSTRAINT "Conversations_pkey" PRIMARY KEY ("conversationId");
DROP SEQUENCE "Conversations_conversationId_seq";

-- AlterTable
ALTER TABLE "FriendRequests" ALTER COLUMN "senderId" SET DATA TYPE TEXT,
ALTER COLUMN "receiverId" SET DATA TYPE TEXT,
ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "JoinRequests" ALTER COLUMN "conversationId" SET DATA TYPE TEXT,
ALTER COLUMN "userId" SET DATA TYPE TEXT,
ALTER COLUMN "status" SET DEFAULT 'PENDING',
ALTER COLUMN "respondedById" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Messages" ALTER COLUMN "conversationId" SET DATA TYPE TEXT,
ALTER COLUMN "senderId" SET DATA TYPE TEXT,
ALTER COLUMN "messageType" SET DEFAULT 'TEXT';

-- AlterTable
ALTER TABLE "Notifications" ALTER COLUMN "userId" SET DATA TYPE TEXT,
ALTER COLUMN "type" SET DEFAULT 'MESSAGE';

-- AlterTable
ALTER TABLE "Participants" ALTER COLUMN "conversationId" SET DATA TYPE TEXT,
ALTER COLUMN "userId" SET DATA TYPE TEXT,
ALTER COLUMN "role" SET DEFAULT 'MEMBER';

-- AlterTable
ALTER TABLE "Sessions" ALTER COLUMN "userId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Users" DROP CONSTRAINT "Users_pkey",
ALTER COLUMN "userId" DROP DEFAULT,
ALTER COLUMN "userId" SET DATA TYPE TEXT,
ALTER COLUMN "role" SET DEFAULT 'USER',
ADD CONSTRAINT "Users_pkey" PRIMARY KEY ("userId");
DROP SEQUENCE "Users_userId_seq";

-- AddForeignKey
ALTER TABLE "Conversations" ADD CONSTRAINT "Conversations_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participants" ADD CONSTRAINT "Participants_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversations"("conversationId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participants" ADD CONSTRAINT "Participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Messages" ADD CONSTRAINT "Messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversations"("conversationId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Messages" ADD CONSTRAINT "Messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "Users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sessions" ADD CONSTRAINT "Sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contacts" ADD CONSTRAINT "Contacts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contacts" ADD CONSTRAINT "Contacts_friendId_fkey" FOREIGN KEY ("friendId") REFERENCES "Users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FriendRequests" ADD CONSTRAINT "FriendRequests_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "Users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FriendRequests" ADD CONSTRAINT "FriendRequests_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "Users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notifications" ADD CONSTRAINT "Notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JoinRequests" ADD CONSTRAINT "JoinRequests_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversations"("conversationId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JoinRequests" ADD CONSTRAINT "JoinRequests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JoinRequests" ADD CONSTRAINT "JoinRequests_respondedById_fkey" FOREIGN KEY ("respondedById") REFERENCES "Users"("userId") ON DELETE SET NULL ON UPDATE CASCADE;
