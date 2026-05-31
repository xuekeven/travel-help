-- CreateTable
CREATE TABLE "travel_orders" (
    "id" TEXT NOT NULL,
    "orderNo" TEXT NOT NULL,
    "orderDate" TIMESTAMP(3) NOT NULL,
    "departureDate" DATE NOT NULL,
    "departureTime" TEXT NOT NULL,
    "arrivalDate" DATE,
    "arrivalTime" TEXT NOT NULL,
    "fromStation" TEXT NOT NULL,
    "toStation" TEXT NOT NULL,
    "trainCode" TEXT NOT NULL,
    "trainNo" TEXT,
    "distance" INTEGER,
    "passengerNames" TEXT[] NOT NULL,
    "seatTypeNames" TEXT[] NOT NULL,
    "coachNames" TEXT[] NOT NULL,
    "seatNames" TEXT[] NOT NULL,
    "ticketTypeNames" TEXT[] NOT NULL,
    "ticketStatusNames" TEXT[] NOT NULL,
    "ticketCount" INTEGER NOT NULL,
    "totalPrice" DECIMAL(10,1) NOT NULL,
    "ticketSnapshots" JSONB NOT NULL,
    "cancelFlag" TEXT,
    "resignFlag" TEXT,
    "returnFlag" TEXT,
    "payFlag" TEXT,
    "confirmFlag" TEXT,
    "orderStatus" TEXT,
    "rawData" JSONB NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "travel_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "travel_orders_orderNo_key" ON "travel_orders"("orderNo");
