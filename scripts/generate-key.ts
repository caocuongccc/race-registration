import crypto from "crypto";

const key = crypto.randomBytes(32).toString("hex");
console.log("Generated Encryption Key:");
console.log(key);
console.log("\nAdd to .env.local:");
console.log(`BANK_ENCRYPTION_KEY=${key}`);
