-- CreateTable
CREATE TABLE "PlatformInvitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "inviterId" TEXT NOT NULL,
    "message" TEXT,

    CONSTRAINT "PlatformInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvitationRequest" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "linkedinUrl" TEXT,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "adminMessage" TEXT,

    CONSTRAINT "InvitationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSettings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlatformInvitation_email_key" ON "PlatformInvitation"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformInvitation_token_key" ON "PlatformInvitation"("token");

-- CreateIndex
CREATE UNIQUE INDEX "InvitationRequest_email_key" ON "InvitationRequest"("email");

-- CreateIndex
CREATE UNIQUE INDEX "SystemSettings_key_key" ON "SystemSettings"("key");

-- AddForeignKey
ALTER TABLE "PlatformInvitation" ADD CONSTRAINT "PlatformInvitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvitationRequest" ADD CONSTRAINT "InvitationRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddColumn to users table for new fields
ALTER TABLE "users" ADD COLUMN "profileUrl" TEXT;
ALTER TABLE "users" ADD COLUMN "invitationsRemaining" INTEGER NOT NULL DEFAULT 5;
ALTER TABLE "users" ADD COLUMN "totalInvitationsSent" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN "isAdmin" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "lastQuotaReplenishment" TIMESTAMP(3);

-- AddColumn to workspaces table
ALTER TABLE "workspaces" ADD COLUMN "isPersonal" BOOLEAN NOT NULL DEFAULT false;

-- Create unique index for profileUrl
CREATE UNIQUE INDEX "users_profileUrl_key" ON "users"("profileUrl");