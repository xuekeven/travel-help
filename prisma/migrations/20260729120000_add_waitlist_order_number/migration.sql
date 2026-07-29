UPDATE "reminder_tasks"
SET
    "payload" = jsonb_set(
        "payload",
        '{orderNo}',
        to_jsonb("sourceId"),
        true
    ),
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "kind" = 'WAITLIST_ORDER'
  AND "status" IN ('PENDING', 'PROCESSING')
  AND NOT ("payload" ? 'orderNo');
