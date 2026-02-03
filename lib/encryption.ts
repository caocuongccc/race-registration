// lib/encryption.ts
// Bank Account Encryption/Decryption using AES-256-GCM

import crypto from "crypto";

/**
 * CRITICAL SECURITY:
 * - ENCRYPTION_KEY phải là 32 bytes (256 bits)
 * - Lưu trong .env, KHÔNG commit vào git
 * - Rotate key định kỳ (6-12 tháng)
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32; // 256 bits

/**
 * Get encryption key from environment
 * Key must be 32 bytes hex string (64 characters)
 */
function getEncryptionKey(): Buffer {
  const key = process.env.BANK_ENCRYPTION_KEY;

  if (!key) {
    throw new Error("BANK_ENCRYPTION_KEY not set in environment variables");
  }

  // Key should be 64 hex characters (32 bytes)
  if (key.length !== 64) {
    throw new Error("BANK_ENCRYPTION_KEY must be 64 hex characters (32 bytes)");
  }

  return Buffer.from(key, "hex");
}

/**
 * Generate a random encryption key
 * Use this ONCE to generate your key, then save to .env
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Encrypt bank account data
 * Returns: iv:authTag:encryptedData (all hex encoded)
 */
export function encryptBankData(plaintext: string): string {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:encryptedData
    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
  } catch (error) {
    console.error("❌ Encryption error:", error);
    throw new Error("Failed to encrypt bank data");
  }
}

/**
 * Decrypt bank account data
 * Input format: iv:authTag:encryptedData
 */
export function decryptBankData(encrypted: string): string {
  try {
    const key = getEncryptionKey();

    // Parse encrypted string
    const parts = encrypted.split(":");
    if (parts.length !== 3) {
      throw new Error("Invalid encrypted data format");
    }

    const iv = Buffer.from(parts[0], "hex");
    const authTag = Buffer.from(parts[1], "hex");
    const encryptedData = parts[2];

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedData, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("❌ Decryption error:", error);
    throw new Error("Failed to decrypt bank data");
  }
}

/**
 * Encrypt bank account object
 */
export interface BankAccount {
  accountNumber: string;
  bankCode: string;
  accountName: string;
  bankName: string;
}

export function encryptBankAccount(account: BankAccount): {
  accountNumberEncrypted: string;
  bankCodeEncrypted: string;
  accountNameEncrypted: string;
  bankNameEncrypted: string;
} {
  return {
    accountNumberEncrypted: encryptBankData(account.accountNumber),
    bankCodeEncrypted: encryptBankData(account.bankCode),
    accountNameEncrypted: encryptBankData(account.accountName),
    bankNameEncrypted: encryptBankData(account.bankName),
  };
}

/**
 * Decrypt bank account object
 */
export function decryptBankAccount(encrypted: {
  accountNumberEncrypted: string;
  bankCodeEncrypted: string;
  accountNameEncrypted: string;
  bankNameEncrypted: string;
}): BankAccount {
  return {
    accountNumber: decryptBankData(encrypted.accountNumberEncrypted),
    bankCode: decryptBankData(encrypted.bankCodeEncrypted),
    accountName: decryptBankData(encrypted.accountNameEncrypted),
    bankName: decryptBankData(encrypted.bankNameEncrypted),
  };
}

/**
 * Mask account number for display
 * Example: 1234567890 → 1234****7890
 */
export function maskAccountNumber(accountNumber: string): string {
  if (accountNumber.length <= 8) {
    return accountNumber.substring(0, 4) + "****";
  }

  const first4 = accountNumber.substring(0, 4);
  const last4 = accountNumber.substring(accountNumber.length - 4);

  return `${first4}****${last4}`;
}

/**
 * Validate decryption key
 */
export function validateEncryptionKey(): boolean {
  try {
    const key = process.env.BANK_ENCRYPTION_KEY;

    if (!key) {
      console.error("❌ BANK_ENCRYPTION_KEY not set");
      return false;
    }

    if (key.length !== 64) {
      console.error("❌ BANK_ENCRYPTION_KEY must be 64 hex characters");
      return false;
    }

    // Test encryption/decryption
    const testData = "test123";
    const encrypted = encryptBankData(testData);
    const decrypted = decryptBankData(encrypted);

    if (decrypted !== testData) {
      console.error("❌ Encryption test failed");
      return false;
    }

    console.log("✅ Encryption key validated");
    return true;
  } catch (error) {
    console.error("❌ Encryption validation error:", error);
    return false;
  }
}
