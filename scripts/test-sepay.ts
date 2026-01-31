// scripts/test-sepay.ts
/**
 * Test script to verify SePay integration
 * Run: npx ts-node scripts/test-sepay.ts
 */

import { createSepayOrder } from "../lib/sepay-service";

async function testSepayIntegration() {
  console.log("🧪 Testing SePay Integration...\n");

  // Check environment variables
  console.log("1️⃣ Checking environment variables:");
  const merchantId = process.env.SEPAY_MERCHANT_ID;
  const secretKey = process.env.SEPAY_SECRET_KEY;
  const apiUrl = process.env.SEPAY_API_URL;

  if (!merchantId) {
    console.error("❌ SEPAY_MERCHANT_ID is not set");
    process.exit(1);
  }
  if (!secretKey) {
    console.error("❌ SEPAY_SECRET_KEY is not set");
    process.exit(1);
  }

  console.log("✅ SEPAY_MERCHANT_ID:", merchantId);
  console.log(
    "✅ SEPAY_SECRET_KEY:",
    secretKey.substring(0, 10) +
      "..." +
      secretKey.substring(secretKey.length - 5),
  );
  console.log("✅ SEPAY_API_URL:", apiUrl || "https://my.sepay.vn/userapi");

  console.log("\n2️⃣ Creating test order:");

  const testOrder = {
    amount: 10000, // 10,000 VND
    orderCode: `TEST_${Date.now()}`,
    description: "Test order - Do not process",
    returnUrl: "http://localhost:3000/test/success",
    cancelUrl: "http://localhost:3000/test/cancel",
    webhookUrl: "http://localhost:3000/api/webhook/sepay",
    customerName: "Test User",
    customerEmail: "test@example.com",
    customerPhone: "0901234567",
  };

  console.log("📦 Order data:", testOrder);

  const result = await createSepayOrder(testOrder);

  console.log("\n3️⃣ Result:");
  console.log(JSON.stringify(result, null, 2));

  if (result.success) {
    console.log("\n✅ SUCCESS! SePay integration is working!");
    console.log("💳 Payment URL:", result.paymentUrl);
    console.log("\n📝 Next steps:");
    console.log("1. Open the payment URL in browser");
    console.log("2. Complete test payment");
    console.log("3. Check if webhook is triggered");
  } else {
    console.log("\n❌ FAILED! Error:", result.error);
    console.log("\n🔍 Troubleshooting:");
    console.log("1. Check SEPAY_MERCHANT_ID is correct");
    console.log("2. Check SEPAY_SECRET_KEY is correct");
    console.log("3. Check API endpoint is correct");
    console.log("4. Check SePay service status");
    console.log("5. Contact SePay support if needed");
  }
}

// Run test
testSepayIntegration().catch((error) => {
  console.error("\n💥 Unexpected error:", error);
  process.exit(1);
});
