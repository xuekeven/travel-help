-- CreateEnum
CREATE TYPE "SeatType" AS ENUM ('SECOND_CLASS', 'FIRST_CLASS', 'BUSINESS', 'HARD_SLEEPER', 'SOFT_SLEEPER', 'HARD_SEAT', 'NO_SEAT');

-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('PENDING_SALE', 'ON_SALE', 'WAITLISTED', 'SUCCESS', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "travel_plans" (
    "id" TEXT NOT NULL,
    "departureDate" DATE NOT NULL,
    "holidayName" TEXT,
    "fromStation" TEXT NOT NULL,
    "toStation" TEXT NOT NULL,
    "seatType" "SeatType" NOT NULL,
    "ticketCount" INTEGER NOT NULL DEFAULT 1,
    "status" "PlanStatus" NOT NULL DEFAULT 'PENDING_SALE',
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "travel_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waitlist_orders" (
    "id" TEXT NOT NULL,
    "orderNo" TEXT NOT NULL,
    "departureDate" DATE NOT NULL,
    "fromStation" TEXT NOT NULL,
    "toStation" TEXT NOT NULL,
    "trainNumbers" TEXT[],
    "seatType" TEXT NOT NULL,
    "ticketCount" INTEGER NOT NULL,
    "price" DECIMAL(8,1) NOT NULL,
    "departureTime" TEXT NOT NULL,
    "arrivalTime" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "rawData" JSONB NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waitlist_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_orders_orderNo_key" ON "waitlist_orders"("orderNo");
