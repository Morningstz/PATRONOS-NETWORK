-- AlterTable
ALTER TABLE "Artwork" ADD COLUMN     "category" TEXT,
ADD COLUMN     "colorFamilies" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "colorSignature" DOUBLE PRECISION[] DEFAULT ARRAY[]::DOUBLE PRECISION[],
ADD COLUMN     "moods" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "SavedArtwork" (
    "userId" UUID NOT NULL,
    "artworkId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedArtwork_pkey" PRIMARY KEY ("userId","artworkId")
);

-- CreateTable
CREATE TABLE "FollowedArtist" (
    "userId" UUID NOT NULL,
    "artistId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FollowedArtist_pkey" PRIMARY KEY ("userId","artistId")
);

-- CreateIndex
CREATE INDEX "SavedArtwork_artworkId_idx" ON "SavedArtwork"("artworkId");

-- CreateIndex
CREATE INDEX "FollowedArtist_artistId_idx" ON "FollowedArtist"("artistId");

-- CreateIndex
CREATE INDEX "Artwork_category_idx" ON "Artwork"("category");

-- AddForeignKey
ALTER TABLE "SavedArtwork" ADD CONSTRAINT "SavedArtwork_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedArtwork" ADD CONSTRAINT "SavedArtwork_artworkId_fkey" FOREIGN KEY ("artworkId") REFERENCES "Artwork"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowedArtist" ADD CONSTRAINT "FollowedArtist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowedArtist" ADD CONSTRAINT "FollowedArtist_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Defense in depth (see 20261029065129_enable_rls)
ALTER TABLE "SavedArtwork" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FollowedArtist" ENABLE ROW LEVEL SECURITY;
