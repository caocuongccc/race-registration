DROP INDEX IF EXISTS "registrations_bibNumber_key";

CREATE UNIQUE INDEX IF NOT EXISTS "registrations_eventId_bibNumber_key"
ON "registrations" ("eventId", "bibNumber");
