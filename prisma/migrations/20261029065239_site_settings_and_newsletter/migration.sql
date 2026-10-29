-- AlterTable
ALTER TABLE "ConsentRecord" ADD COLUMN     "subjectEmail" TEXT;

-- CreateTable
CREATE TABLE "SiteSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("key")
);

-- Defense in depth (see 20261029065129_enable_rls)
ALTER TABLE "SiteSetting" ENABLE ROW LEVEL SECURITY;
