-- CreateTable
CREATE TABLE "pragma_links" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "shortCode" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "label" TEXT,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pragma_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pragma_link_views" (
    "id" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "viewerId" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pragma_link_views_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pragma_links_shortCode_key" ON "pragma_links"("shortCode");

-- CreateIndex
CREATE UNIQUE INDEX "pragma_links_token_key" ON "pragma_links"("token");

-- CreateIndex
CREATE INDEX "pragma_links_userId_storyId_idx" ON "pragma_links"("userId", "storyId");

-- CreateIndex
CREATE INDEX "pragma_link_views_linkId_viewedAt_idx" ON "pragma_link_views"("linkId", "viewedAt");

-- AddForeignKey
ALTER TABLE "pragma_links" ADD CONSTRAINT "pragma_links_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "career_stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pragma_links" ADD CONSTRAINT "pragma_links_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pragma_link_views" ADD CONSTRAINT "pragma_link_views_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "pragma_links"("id") ON DELETE CASCADE ON UPDATE CASCADE;
