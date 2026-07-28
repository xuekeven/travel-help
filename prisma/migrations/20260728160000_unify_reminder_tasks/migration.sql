-- Expand the existing status enum before migrating the task table.
ALTER TYPE "ReminderStatus" ADD VALUE IF NOT EXISTS 'PROCESSING';
ALTER TYPE "ReminderStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

CREATE TYPE "ReminderKind" AS ENUM (
    'PLAN_SALE',
    'TRAVEL_ORDER',
    'WAITLIST_ORDER'
);

ALTER TABLE "plan_reminder_tasks"
DROP CONSTRAINT "plan_reminder_tasks_planId_fkey";

DROP INDEX "plan_reminder_tasks_planId_reminderAt_key";
DROP INDEX "plan_reminder_tasks_status_reminderAt_idx";

ALTER TABLE "plan_reminder_tasks" RENAME TO "reminder_tasks";
ALTER TABLE "reminder_tasks" RENAME COLUMN "planId" TO "sourceId";
ALTER TABLE "reminder_tasks" RENAME COLUMN "reminderAt" TO "scheduledAt";

ALTER TABLE "reminder_tasks"
ADD COLUMN "dedupeKey" TEXT,
ADD COLUMN "kind" "ReminderKind",
ADD COLUMN "expiresAt" TIMESTAMP(3),
ADD COLUMN "payload" JSONB,
ADD COLUMN "nextRetryAt" TIMESTAMP(3),
ADD COLUMN "lockedAt" TIMESTAMP(3),
ADD COLUMN "lockOwner" TEXT;

UPDATE "reminder_tasks" AS task
SET
    "dedupeKey" = concat(
        'plan:',
        task."sourceId",
        ':',
        floor(extract(epoch FROM task."saleDate") * 1000)::BIGINT,
        ':',
        task."reminderType"::TEXT
    ),
    "kind" = 'PLAN_SALE',
    "expiresAt" = task."saleDate",
    "payload" = jsonb_build_object(
        'departureDate', to_char(plan."departureDate", 'YYYY-MM-DD'),
        'fromStation', plan."fromStation",
        'toStation', plan."toStation",
        'saleDate', to_char(task."saleDate", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        'saleDateIndex', task."saleDateIndex",
        'reminderType', task."reminderType"::TEXT
    ),
    "nextRetryAt" = task."scheduledAt"
FROM "travel_plans" AS plan
WHERE plan."id" = task."sourceId";

ALTER TABLE "reminder_tasks"
ALTER COLUMN "dedupeKey" SET NOT NULL,
ALTER COLUMN "kind" SET NOT NULL,
ALTER COLUMN "expiresAt" SET NOT NULL,
ALTER COLUMN "payload" SET NOT NULL,
ALTER COLUMN "nextRetryAt" SET NOT NULL;

ALTER TABLE "reminder_tasks"
DROP COLUMN "saleDate",
DROP COLUMN "saleDateIndex",
DROP COLUMN "reminderType";

CREATE UNIQUE INDEX "reminder_tasks_dedupeKey_key"
ON "reminder_tasks"("dedupeKey");

CREATE INDEX "reminder_tasks_status_nextRetryAt_scheduledAt_idx"
ON "reminder_tasks"("status", "nextRetryAt", "scheduledAt");

CREATE INDEX "reminder_tasks_kind_sourceId_idx"
ON "reminder_tasks"("kind", "sourceId");

-- Backfill durable travel-order reminders for the three daily checkpoints.
INSERT INTO "reminder_tasks" (
    "id",
    "dedupeKey",
    "kind",
    "sourceId",
    "scheduledAt",
    "expiresAt",
    "payload",
    "nextRetryAt",
    "updatedAt"
)
SELECT
    md5(concat('travel:', orders."orderNo", ':', checkpoint."daysBefore", ':', orders."departureDate")),
    concat(
        'travel:',
        orders."orderNo",
        ':',
        floor(extract(epoch FROM (
            orders."departureDate"::TIMESTAMP
            - checkpoint."daysBefore" * INTERVAL '1 day'
            - INTERVAL '8 hours'
        )) * 1000)::BIGINT,
        ':',
        checkpoint."daysBefore"
    ),
    'TRAVEL_ORDER'::"ReminderKind",
    orders."orderNo",
    orders."departureDate"::TIMESTAMP
        - checkpoint."daysBefore" * INTERVAL '1 day'
        - INTERVAL '8 hours',
    orders."departureDate"::TIMESTAMP
        - checkpoint."daysBefore" * INTERVAL '1 day'
        + INTERVAL '16 hours',
    jsonb_build_object(
        'departureDate', to_char(orders."departureDate", 'YYYY-MM-DD'),
        'departureTime', orders."departureTime",
        'fromStation', orders."fromStation",
        'toStation', orders."toStation",
        'trainCode', orders."trainCode",
        'passengerNames', to_jsonb(orders."passengerNames"),
        'seatTypeNames', to_jsonb(orders."seatTypeNames"),
        'seatNames', to_jsonb(orders."seatNames"),
        'daysUntilDeparture', checkpoint."daysBefore"
    ),
    orders."departureDate"::TIMESTAMP
        - checkpoint."daysBefore" * INTERVAL '1 day'
        - INTERVAL '8 hours',
    CURRENT_TIMESTAMP
FROM "travel_orders" AS orders
CROSS JOIN (VALUES (2), (1), (0)) AS checkpoint("daysBefore")
WHERE COALESCE(orders."cancelFlag", '') <> 'Y'
  AND concat_ws('|', orders."orderStatus", array_to_string(orders."ticketStatusNames", '|'))
      !~ '(已取消|取消|已退票|退票|已改签|改签成功|已改签失败|改签失败|已出站|出站|已关闭|关闭|退单)'
  AND orders."departureDate" >= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Shanghai')::DATE
ON CONFLICT DO NOTHING;

-- Backfill durable waitlist reminders for pending orders.
INSERT INTO "reminder_tasks" (
    "id",
    "dedupeKey",
    "kind",
    "sourceId",
    "scheduledAt",
    "expiresAt",
    "payload",
    "nextRetryAt",
    "updatedAt"
)
SELECT
    md5(concat('waitlist:', orders."orderNo", ':', checkpoint."daysBefore", ':', orders."departureDate")),
    concat(
        'waitlist:',
        orders."orderNo",
        ':',
        floor(extract(epoch FROM (
            orders."departureDate"::TIMESTAMP
            - checkpoint."daysBefore" * INTERVAL '1 day'
            - INTERVAL '8 hours'
        )) * 1000)::BIGINT,
        ':',
        checkpoint."daysBefore"
    ),
    'WAITLIST_ORDER'::"ReminderKind",
    orders."orderNo",
    orders."departureDate"::TIMESTAMP
        - checkpoint."daysBefore" * INTERVAL '1 day'
        - INTERVAL '8 hours',
    orders."departureDate"::TIMESTAMP
        - checkpoint."daysBefore" * INTERVAL '1 day'
        + INTERVAL '16 hours',
    jsonb_build_object(
        'departureDate', to_char(orders."departureDate", 'YYYY-MM-DD'),
        'fromStation', orders."fromStation",
        'toStation', orders."toStation",
        'daysUntilDeparture', checkpoint."daysBefore"
    ),
    orders."departureDate"::TIMESTAMP
        - checkpoint."daysBefore" * INTERVAL '1 day'
        - INTERVAL '8 hours',
    CURRENT_TIMESTAMP
FROM "waitlist_orders" AS orders
CROSS JOIN (VALUES (2), (1), (0)) AS checkpoint("daysBefore")
WHERE orders."status" !~ '(已兑现|兑现成功|成功|已取消|取消|退单|已退|已关闭|关闭)'
  AND orders."departureDate" >= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Shanghai')::DATE
ON CONFLICT DO NOTHING;

DROP TYPE "PlanReminderType";
