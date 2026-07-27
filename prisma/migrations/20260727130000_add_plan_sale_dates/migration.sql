ALTER TABLE "travel_plans"
ADD COLUMN "saleDate" DATE,
ADD COLUMN "additionalSaleDates" TIMESTAMP(3)[] NOT NULL DEFAULT ARRAY[]::TIMESTAMP(3)[];

UPDATE "travel_plans"
SET "saleDate" = "departureDate" - INTERVAL '14 days';

ALTER TABLE "travel_plans"
ALTER COLUMN "saleDate" SET NOT NULL;
