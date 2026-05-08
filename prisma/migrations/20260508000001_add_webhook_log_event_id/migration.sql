ALTER TABLE "webhook_logs"
ADD COLUMN IF NOT EXISTS "event_id" TEXT;

CREATE INDEX IF NOT EXISTS "webhook_logs_event_id_idx"
ON "webhook_logs" ("event_id");
