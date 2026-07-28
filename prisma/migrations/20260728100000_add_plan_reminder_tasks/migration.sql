-- CreateEnum
CREATE TYPE "PlanReminderType" AS ENUM ('ONE_DAY_BEFORE', 'FIFTEEN_MINUTES_BEFORE');

-- CreateEnum
CREATE TYPE "ReminderStatus" AS ENUM ('PENDING', 'SENT');

-- CreateTable
CREATE TABLE "plan_reminder_tasks" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "reminderAt" TIMESTAMP(3) NOT NULL,
    "saleDate" TIMESTAMP(3) NOT NULL,
    "saleDateIndex" INTEGER NOT NULL,
    "reminderType" "PlanReminderType" NOT NULL,
    "status" "ReminderStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_reminder_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plan_reminder_tasks_planId_reminderAt_key"
ON "plan_reminder_tasks"("planId", "reminderAt");

-- CreateIndex
CREATE INDEX "plan_reminder_tasks_status_reminderAt_idx"
ON "plan_reminder_tasks"("status", "reminderAt");

-- Backfill reminder tasks for plans that already exist.
INSERT INTO "plan_reminder_tasks" (
    "id",
    "planId",
    "reminderAt",
    "saleDate",
    "saleDateIndex",
    "reminderType",
    "updatedAt"
)
SELECT
    md5(
        plan."id"
        || sale."saleDate"::TEXT
        || reminder."reminderType"::TEXT
    ),
    plan."id",
    sale."saleDate" - reminder."advanceBy",
    sale."saleDate",
    (sale."ordinality" - 1)::INTEGER,
    reminder."reminderType"::"PlanReminderType",
    CURRENT_TIMESTAMP
FROM "travel_plans" AS plan
CROSS JOIN LATERAL unnest(
    array_prepend(plan."saleDate", plan."additionalSaleDates")
) WITH ORDINALITY AS sale("saleDate", "ordinality")
CROSS JOIN (
    VALUES
        ('ONE_DAY_BEFORE', INTERVAL '1 day'),
        ('FIFTEEN_MINUTES_BEFORE', INTERVAL '15 minutes')
) AS reminder("reminderType", "advanceBy")
WHERE sale."saleDate" > (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')
ON CONFLICT DO NOTHING;

-- AddForeignKey
ALTER TABLE "plan_reminder_tasks"
ADD CONSTRAINT "plan_reminder_tasks_planId_fkey"
FOREIGN KEY ("planId") REFERENCES "travel_plans"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
