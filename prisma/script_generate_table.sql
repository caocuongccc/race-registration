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