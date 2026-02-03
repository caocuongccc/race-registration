// lib/bank-account-service.ts
// Service layer for encrypted bank account operations

import { prisma } from "./prisma";
import {
  encryptBankAccount,
  decryptBankAccount,
  maskAccountNumber,
  BankAccount,
} from "./encryption";

/**
 * Get decrypted bank account for event
 */
export async function getEventBankAccount(
  eventId: string,
): Promise<BankAccount | null> {
  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        bankAccount: true,
        bankCode: true,
        bankName: true,
        bankHolder: true,
      },
    });

    if (!event) {
      return null;
    }

    // Check if encrypted data exists
    if (!event.bankAccount || !event.bankCode || !event.bankName) {
      // Fallback to env default
      return getDefaultBankAccount();
    }

    // Decrypt
    const decrypted = decryptBankAccount({
      accountNumberEncrypted: event.bankAccount,
      bankCodeEncrypted: event.bankCode,
      accountNameEncrypted: event.bankHolder,
      bankNameEncrypted: event.bankName,
    });

    return decrypted;
  } catch (error) {
    console.error("❌ Error getting event bank account:", error);
    // Fallback to default on error
    return getDefaultBankAccount();
  }
}

/**
 * Get default bank account from environment
 * This is also encrypted in env for security
 */
export function getDefaultBankAccount(): BankAccount | null {
  const accountNumber = process.env.SEPAY_ACCOUNT_NUMBER;
  const bankCode = process.env.SEPAY_BANK_CODE;
  const accountName = process.env.SEPAY_BANK_HOLDER;
  const bankName = process.env.SEPAY_BANK_NAME;

  if (!accountNumber || !bankCode || !accountName) {
    console.error("❌ Default bank account not configured in env");
    return null;
  }

  return {
    accountNumber,
    bankCode,
    accountName,
    bankName: bankName || "",
  };
}

/**
 * Set bank account for event (encrypts automatically)
 */
export async function setEventBankAccount(
  eventId: string,
  bankAccount: BankAccount,
): Promise<void> {
  try {
    console.log(`🔐 Encrypting bank account for event ${eventId}...`);

    // Encrypt before saving
    const encrypted = encryptBankAccount(bankAccount);

    await prisma.event.update({
      where: { id: eventId },
      data: {
        bankAccount: encrypted.accountNumberEncrypted,
        bankCode: encrypted.bankCodeEncrypted,
        bankName: encrypted.bankNameEncrypted,
        bankHolder: encrypted.accountNameEncrypted,
      },
    });

    console.log("✅ Bank account encrypted and saved");
  } catch (error) {
    console.error("❌ Error setting event bank account:", error);
    throw error;
  }
}

/**
 * Get masked bank account for display in admin
 * Returns partially hidden account number
 */
export async function getMaskedEventBankAccount(eventId: string): Promise<{
  accountNumberMasked: string;
  bankCode: string;
  accountName: string;
  hasEncryptedData: boolean;
} | null> {
  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        bankAccount: true,
        bankCode: true,
        bankName: true,
        bankHolder: true,
      },
    });

    if (!event) {
      return null;
    }

    if (!event.bankAccount || !event.bankCode || !event.bankName) {
      return {
        accountNumberMasked: "DEFAULT",
        bankCode: "DEFAULT",
        accountName: "Default Account",
        hasEncryptedData: false,
      };
    }

    // Decrypt
    const decrypted = decryptBankAccount({
      accountNumberEncrypted: event.bankAccount,
      bankCodeEncrypted: event.bankCode,
      accountNameEncrypted: event.bankHolder,
      bankNameEncrypted: event.bankName,
    });
    // Mask account number
    return {
      accountNumberMasked: maskAccountNumber(decrypted.accountNumber),
      bankCode: decrypted.bankCode,
      accountName: decrypted.accountName,
      hasEncryptedData: true,
    };
  } catch (error) {
    console.error("❌ Error getting masked bank account:", error);
    return null;
  }
}

/**
 * Validate bank account data
 */
export function validateBankAccount(account: BankAccount): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!account.accountNumber) {
    errors.push("Account number is required");
  } else if (!/^\d{8,16}$/.test(account.accountNumber)) {
    errors.push("Account number must be 8-16 digits");
  }

  if (!account.bankCode) {
    errors.push("Bank code is required");
  } else if (!/^[A-Z0-9]{3,10}$/.test(account.bankCode.toUpperCase())) {
    errors.push("Bank code must be 3-10 uppercase alphanumeric characters");
  }

  if (!account.accountName) {
    errors.push("Account name is required");
  } else if (account.accountName.length < 5) {
    errors.push("Account name must be at least 5 characters");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Delete bank account for event (sets to null)
 */
export async function deleteEventBankAccount(eventId: string): Promise<void> {
  await prisma.event.update({
    where: { id: eventId },
    data: {
      bankAccount: null,
      bankCode: null,
      bankName: null,
    },
  });

  console.log(`🗑️  Deleted bank account for event ${eventId}`);
}

/**
 * List all events with encrypted bank accounts (for admin)
 */
export async function listEventsWithBankAccounts() {
  const events = await prisma.event.findMany({
    where: {
      bankAccount: { not: null },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      bankAccount: true,
      bankCode: true,
      bankName: true,
      bankHolder: true,
    },
  });

  return events.map((event) => {
    const decrypted = decryptBankAccount({
      accountNumberEncrypted: event.bankAccount!,
      bankCodeEncrypted: event.bankCode!,
      accountNameEncrypted: event.bankHolder!,
      bankNameEncrypted: event.bankName!,
    });

    return {
      id: event.id,
      name: event.name,
      slug: event.slug,
      accountNumberMasked: maskAccountNumber(decrypted.accountNumber),
      bankCode: decrypted.bankCode,
      accountName: decrypted.accountName,
    };
  });
}
