-- CreateEnum
CREATE TYPE "ConversationType" AS ENUM ('direct', 'group');

-- CreateEnum
CREATE TYPE "ParticipantRole" AS ENUM ('member', 'admin', 'moderator');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('user', 'admin');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('text', 'file');

-- CreateEnum
CREATE TYPE "FileType" AS ENUM ('image', 'video', 'audio', 'pdf', 'document', 'other');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('message', 'mention', 'group_invite', 'friend_request', 'other');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "Users" (
    "userId" BIGSERIAL NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "firstName" VARCHAR(50) NOT NULL,
    "lastName" VARCHAR(50) NOT NULL,
    "avatar" VARCHAR(255),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationToken" VARCHAR(255),
    "resetPasswordToken" VARCHAR(255),
    "resetPasswordExpires" TIMESTAMP(3),
    "role" "UserRole" NOT NULL DEFAULT 'user',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Users_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Conversations" (
    "conversationId" BIGSERIAL NOT NULL,
    "title" VARCHAR(255),
    "type" "ConversationType" NOT NULL DEFAULT 'direct',
    "creatorId" BIGINT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversations_pkey" PRIMARY KEY ("conversationId")
);

-- CreateTable
CREATE TABLE "Participants" (
    "participantId" BIGSERIAL NOT NULL,
    "conversationId" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "role" "ParticipantRole" NOT NULL DEFAULT 'member',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "isMuted" BOOLEAN NOT NULL DEFAULT false,
    "lastReadAt" TIMESTAMP(3),

    CONSTRAINT "Participants_pkey" PRIMARY KEY ("participantId")
);

-- CreateTable
CREATE TABLE "Messages" (
    "messageId" BIGSERIAL NOT NULL,
    "conversationId" BIGINT NOT NULL,
    "senderId" BIGINT NOT NULL,
    "content" TEXT,
    "messageType" "MessageType" NOT NULL DEFAULT 'text',
    "replyToMessageId" BIGINT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Messages_pkey" PRIMARY KEY ("messageId")
);

-- CreateTable
CREATE TABLE "Attachments" (
    "attachmentId" BIGSERIAL NOT NULL,
    "messageId" BIGINT NOT NULL,
    "fileName" VARCHAR(255) NOT NULL,
    "fileUrl" VARCHAR(500) NOT NULL,
    "size" INTEGER,
    "fileType" "FileType" NOT NULL,
    "thumbnailUrl" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachments_pkey" PRIMARY KEY ("attachmentId")
);

-- CreateTable
CREATE TABLE "Sessions" (
    "sessionId" BIGSERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "refreshToken" VARCHAR(255),
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sessions_pkey" PRIMARY KEY ("sessionId")
);

-- CreateTable
CREATE TABLE "Contacts" (
    "contactId" BIGSERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "friendId" BIGINT NOT NULL,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "isFriend" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contacts_pkey" PRIMARY KEY ("contactId")
);

-- CreateTable
CREATE TABLE "FriendRequests" (
    "friendRequestId" BIGSERIAL NOT NULL,
    "senderId" BIGINT NOT NULL,
    "receiverId" BIGINT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'pending',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "FriendRequests_pkey" PRIMARY KEY ("friendRequestId")
);

-- CreateTable
CREATE TABLE "Notifications" (
    "notificationId" BIGSERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "title" VARCHAR(255),
    "message" TEXT,
    "type" "NotificationType" NOT NULL DEFAULT 'message',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notifications_pkey" PRIMARY KEY ("notificationId")
);

-- CreateTable
CREATE TABLE "JoinRequests" (
    "joinRequestId" BIGSERIAL NOT NULL,
    "conversationId" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'pending',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "respondedById" BIGINT,

    CONSTRAINT "JoinRequests_pkey" PRIMARY KEY ("joinRequestId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Users_username_key" ON "Users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Users_email_key" ON "Users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Users_verificationToken_key" ON "Users"("verificationToken");

-- CreateIndex
CREATE UNIQUE INDEX "Users_resetPasswordToken_key" ON "Users"("resetPasswordToken");

-- CreateIndex
CREATE INDEX "Users_email_idx" ON "Users"("email");

-- CreateIndex
CREATE INDEX "Users_isActive_idx" ON "Users"("isActive");

-- CreateIndex
CREATE INDEX "Users_verificationToken_idx" ON "Users"("verificationToken");

-- CreateIndex
CREATE INDEX "Users_resetPasswordToken_idx" ON "Users"("resetPasswordToken");

-- CreateIndex
CREATE INDEX "Conversations_creatorId_idx" ON "Conversations"("creatorId");

-- CreateIndex
CREATE INDEX "Conversations_isActive_idx" ON "Conversations"("isActive");

-- CreateIndex
CREATE INDEX "Participants_conversationId_idx" ON "Participants"("conversationId");

-- CreateIndex
CREATE INDEX "Participants_userId_idx" ON "Participants"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Participants_conversationId_userId_key" ON "Participants"("conversationId", "userId");

-- CreateIndex
CREATE INDEX "Messages_conversationId_createdAt_idx" ON "Messages"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "Messages_senderId_idx" ON "Messages"("senderId");

-- CreateIndex
CREATE INDEX "Messages_isDeleted_idx" ON "Messages"("isDeleted");

-- CreateIndex
CREATE INDEX "Messages_replyToMessageId_idx" ON "Messages"("replyToMessageId");

-- CreateIndex
CREATE INDEX "Attachments_messageId_idx" ON "Attachments"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "Sessions_refreshToken_key" ON "Sessions"("refreshToken");

-- CreateIndex
CREATE INDEX "Sessions_userId_idx" ON "Sessions"("userId");

-- CreateIndex
CREATE INDEX "Sessions_expiresAt_idx" ON "Sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "Contacts_userId_idx" ON "Contacts"("userId");

-- CreateIndex
CREATE INDEX "Contacts_isBlocked_idx" ON "Contacts"("isBlocked");

-- CreateIndex
CREATE INDEX "Contacts_isFriend_idx" ON "Contacts"("isFriend");

-- CreateIndex
CREATE UNIQUE INDEX "Contacts_userId_contactId_key" ON "Contacts"("userId", "contactId");

-- CreateIndex
CREATE INDEX "FriendRequests_senderId_idx" ON "FriendRequests"("senderId");

-- CreateIndex
CREATE INDEX "FriendRequests_receiverId_idx" ON "FriendRequests"("receiverId");

-- CreateIndex
CREATE INDEX "FriendRequests_status_idx" ON "FriendRequests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "FriendRequests_senderId_receiverId_key" ON "FriendRequests"("senderId", "receiverId");

-- CreateIndex
CREATE INDEX "Notifications_userId_idx" ON "Notifications"("userId");

-- CreateIndex
CREATE INDEX "Notifications_userId_isRead_idx" ON "Notifications"("userId", "isRead");

-- CreateIndex
CREATE INDEX "JoinRequests_conversationId_idx" ON "JoinRequests"("conversationId");

-- CreateIndex
CREATE INDEX "JoinRequests_userId_idx" ON "JoinRequests"("userId");

-- CreateIndex
CREATE INDEX "JoinRequests_status_idx" ON "JoinRequests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "JoinRequests_conversationId_userId_key" ON "JoinRequests"("conversationId", "userId");

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
ALTER TABLE "Messages" ADD CONSTRAINT "Messages_replyToMessageId_fkey" FOREIGN KEY ("replyToMessageId") REFERENCES "Messages"("messageId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachments" ADD CONSTRAINT "Attachments_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Messages"("messageId") ON DELETE CASCADE ON UPDATE CASCADE;

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
