-- CreateEnum
CREATE TYPE "PlaceCategory" AS ENUM ('FOOD', 'ATTRACTION', 'HOTEL', 'TRANSPORT', 'SHOPPING', 'OTHER');

-- CreateEnum
CREATE TYPE "PlaceVisitStatus" AS ENUM ('WISHLIST', 'PLANNED', 'VISITED');

-- CreateTable
CREATE TABLE "trip_places" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "PlaceCategory" NOT NULL,
    "visitStatus" "PlaceVisitStatus" NOT NULL DEFAULT 'WISHLIST',
    "city" TEXT,
    "address" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "plannedDate" DATE,
    "plannedTime" TEXT,
    "notes" TEXT,
    "guideUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trip_places_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trip_places_tripId_category_idx" ON "trip_places"("tripId", "category");

-- CreateIndex
CREATE INDEX "trip_places_tripId_plannedDate_idx" ON "trip_places"("tripId", "plannedDate");

-- AddForeignKey
ALTER TABLE "trip_places" ADD CONSTRAINT "trip_places_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;
