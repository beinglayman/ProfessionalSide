-- AlterTable
ALTER TABLE "users" ADD COLUMN     "invitationsRemaining" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "isAdmin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastQuotaReplenishment" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "profileUrl" TEXT,
ADD COLUMN     "totalInvitationsSent" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "invitation_requests" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "linkedinUrl" TEXT,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invitation_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_invitations" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "acceptedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "invitationOnlyMode" BOOLEAN NOT NULL DEFAULT false,
    "lastUpdatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "invitation_requests_createdAt_idx" ON "invitation_requests"("createdAt");

-- CreateIndex
CREATE INDEX "invitation_requests_email_idx" ON "invitation_requests"("email");

-- CreateIndex
CREATE INDEX "invitation_requests_status_idx" ON "invitation_requests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "platform_invitations_token_key" ON "platform_invitations"("token");

-- CreateIndex
CREATE INDEX "platform_invitations_email_idx" ON "platform_invitations"("email");

-- CreateIndex
CREATE INDEX "platform_invitations_expiresAt_idx" ON "platform_invitations"("expiresAt");

-- CreateIndex
CREATE INDEX "platform_invitations_status_idx" ON "platform_invitations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "users_profileUrl_key" ON "users"("profileUrl");

-- AddForeignKey
ALTER TABLE "invitation_requests" ADD CONSTRAINT "invitation_requests_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_invitations" ADD CONSTRAINT "platform_invitations_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_invitations" ADD CONSTRAINT "platform_invitations_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_lastUpdatedBy_fkey" FOREIGN KEY ("lastUpdatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

