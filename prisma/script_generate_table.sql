DO $$ 
BEGIN
  CREATE TYPE "ShirtOrderType" AS ENUM ('WITH_BIB', 'STANDALONE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "shirt_orders" (
  "id" TEXT PRIMARY KEY,
  "registrationId" TEXT,
  "eventId" TEXT NOT NULL,
  "orderType" "ShirtOrderType" NOT NULL DEFAULT 'WITH_BIB',
  "totalAmount" INTEGER NOT NULL,
  "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "paymentDate" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- shirt_orders -> events
ALTER TABLE "shirt_orders"
ADD CONSTRAINT "shirt_orders_eventId_fkey"
FOREIGN KEY ("eventId") REFERENCES "events"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- shirt_orders -> registrations
ALTER TABLE "shirt_orders"
ADD CONSTRAINT "shirt_orders_registrationId_fkey"
FOREIGN KEY ("registrationId") REFERENCES "registrations"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "shirt_orders_eventId_paymentStatus_idx"
ON "shirt_orders" ("eventId", "paymentStatus");

CREATE INDEX IF NOT EXISTS "shirt_orders_registrationId_idx"
ON "shirt_orders" ("registrationId");

CREATE TABLE IF NOT EXISTS "shirt_order_items" (
  "id" TEXT PRIMARY KEY,
  "orderId" TEXT NOT NULL,
  "shirtId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "unitPrice" INTEGER NOT NULL,
  "totalPrice" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- shirt_order_items -> shirt_orders
ALTER TABLE "shirt_order_items"
ADD CONSTRAINT "shirt_order_items_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "shirt_orders"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- shirt_order_items -> event_shirts
ALTER TABLE "shirt_order_items"
ADD CONSTRAINT "shirt_order_items_shirtId_fkey"
FOREIGN KEY ("shirtId") REFERENCES "event_shirts"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "shirt_order_items_orderId_idx"
ON "shirt_order_items" ("orderId");

CREATE INDEX IF NOT EXISTS "shirt_order_items_shirtId_idx"
ON "shirt_order_items" ("shirtId");


ALTER TABLE "event_shirts"
ADD COLUMN IF NOT EXISTS "standalonePrice" INTEGER;


-- ============================================
-- MIGRATION: Add EventUser Table & Role-Based Access Control
-- ============================================

-- 1. Create EventUserRole enum
DO $$ BEGIN
  CREATE TYPE "EventUserRole" AS ENUM ('ADMIN', 'EDITOR', 'VIEWER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Create event_users table
CREATE TABLE IF NOT EXISTS "event_users" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "eventId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "EventUserRole" NOT NULL DEFAULT 'VIEWER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign keys
  CONSTRAINT "event_users_eventId_fkey" FOREIGN KEY ("eventId") 
    REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "event_users_userId_fkey" FOREIGN KEY ("userId") 
    REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  
  -- Unique constraint
  CONSTRAINT "event_users_eventId_userId_key" UNIQUE("eventId", "userId")
);

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS "event_users_userId_idx" ON "event_users"("userId");
CREATE INDEX IF NOT EXISTS "event_users_eventId_idx" ON "event_users"("eventId");
CREATE INDEX IF NOT EXISTS "event_users_role_idx" ON "event_users"("role");

-- 4. Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 5. Apply trigger to event_users table
DROP TRIGGER IF EXISTS update_event_users_updated_at ON "event_users";
CREATE TRIGGER update_event_users_updated_at
  BEFORE UPDATE ON "event_users"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- OPTIONAL: Migrate existing event creators to EventUser
-- ============================================
-- This gives event creators ADMIN role automatically
INSERT INTO "event_users" ("id", "eventId", "userId", "role", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid()::text,
  e.id,
  e."createdById",
  'ADMIN'::"EventUserRole",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "events" e
WHERE NOT EXISTS (
  SELECT 1 FROM "event_users" eu 
  WHERE eu."eventId" = e.id AND eu."userId" = e."createdById"
)
ON CONFLICT ("eventId", "userId") DO NOTHING;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Check if table exists
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'event_users';

-- Check enum values
SELECT enumlabel FROM pg_enum WHERE enumtypid = 'EventUserRole'::regtype ORDER BY enumsortorder;

-- Count event users
SELECT COUNT(*) as total_event_users FROM event_users;

-- Show sample data
SELECT * FROM event_users LIMIT 5;