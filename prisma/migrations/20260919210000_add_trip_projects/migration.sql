-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('PLANNING', 'UPCOMING', 'ACTIVE', 'COMPLETED');

-- CreateTable
CREATE TABLE "trips" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "cities" TEXT[],
    "status" "TripStatus" NOT NULL DEFAULT 'PLANNING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "travel_plans" ADD COLUMN "tripId" TEXT;
ALTER TABLE "travel_orders" ADD COLUMN "tripId" TEXT;
ALTER TABLE "waitlist_orders" ADD COLUMN "tripId" TEXT;

-- CreateIndex
CREATE INDEX "trips_startDate_endDate_idx" ON "trips"("startDate", "endDate");
CREATE INDEX "travel_plans_tripId_idx" ON "travel_plans"("tripId");
CREATE INDEX "travel_orders_tripId_idx" ON "travel_orders"("tripId");
CREATE INDEX "waitlist_orders_tripId_idx" ON "waitlist_orders"("tripId");

-- AddForeignKey
ALTER TABLE "travel_plans" ADD CONSTRAINT "travel_plans_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "travel_orders" ADD CONSTRAINT "travel_orders_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "waitlist_orders" ADD CONSTRAINT "waitlist_orders_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;
