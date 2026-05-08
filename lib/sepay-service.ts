// lib/sepay-service.ts - CORRECT SEPAY IMPLEMENTATION
import {
  extractRegistrationIdFromTransferContent,
  isVietinBank,
} from "./payment-content";
/**
 * SePay Payment Integration - QR Code + Webhook Based
 * Docs: https://developer.sepay.vn
 *
 * SePay KHÔNG phải payment gateway redirect
 * SePay hoạt động theo cơ chế:
 * 1. Generate QR VietQR với số tiền và nội dung cố định
 * 2. Khách hàng quét QR và chuyển khoản
 * 3. SePay nhận biến động số dư → bắn webhook về server
 * 4. Server xử lý webhook → confirm payment
 */

/**
 * Generate VietQR payment URL
 * https://qr.sepay.vn/img?acc=ACCOUNT&bank=BANK&amount=AMOUNT&des=CONTENT
 */
export function generateSepayQR(
  accountNumber: string,
  bankCode: string,
  amount: number,
  transferContent: string,
  accountName?: string,
): string {
  const qrBankCode = normalizeSepayQrBankCode(bankCode);
  console.log("🔎 SePay QR params:", {
    inputBankCode: bankCode,
    qrBankCode,
    account: `${accountNumber.substring(0, 4)}****`,
    amount,
    transferContent,
  });
  const params = new URLSearchParams({
    acc: accountNumber,
    bank: qrBankCode,
    amount: amount.toString(),
    des: transferContent,
  });

  if (accountName) {
    params.append("accountName", accountName);
  }

  params.append("template", "compact");

  return `https://qr.sepay.vn/img?${params.toString()}`;
}

function normalizeSepayQrBankCode(bankCode: string): string {
  if (isVietinBank(bankCode)) {
    return "ICB";
  }

  return bankCode;
}

/**
 * Get bank account info
 * Priority:
 * 1. Event-specific account (từ database)
 * 2. Default account (từ env)
 */
export function getBankAccountInfo(
  eventBankAccount?: {
    accountNumber: string;
    bankCode: string;
    accountName: string;
  } | null,
): {
  accountNumber: string;
  bankCode: string;
  accountName: string;
} {
  // Use event-specific account if provided
  if (eventBankAccount?.accountNumber && eventBankAccount?.bankCode) {
    return {
      accountNumber: eventBankAccount.accountNumber,
      bankCode: eventBankAccount.bankCode,
      accountName: eventBankAccount.accountName || "",
    };
  }

  // Fallback to default account from env
  const accountNumber = process.env.SEPAY_ACCOUNT_NUMBER;
  const bankCode = process.env.SEPAY_BANK_CODE;
  const accountName = process.env.SEPAY_ACCOUNT_NAME;

  if (!accountNumber || !bankCode) {
    throw new Error(
      "Missing bank account config. Need SEPAY_ACCOUNT_NUMBER and SEPAY_BANK_CODE in env, or event-specific account in database",
    );
  }

  return {
    accountNumber,
    bankCode,
    accountName: accountName || "",
  };
}

/**
 * Create payment QR for order
 * Supports event-specific bank account
 */
export async function createSepayPayment(
  orderCode: string,
  amount: number,
  eventBankAccount?: {
    accountNumber: string;
    bankCode: string;
    accountName: string;
  } | null,
  transferContent = orderCode,
): Promise<{
  success: boolean;
  qrUrl?: string;
  accountNumber?: string;
  bankCode?: string;
  accountName?: string;
  transferContent?: string;
  error?: string;
}> {
  try {
    const { accountNumber, bankCode, accountName } =
      getBankAccountInfo(eventBankAccount);

    console.log("💳 Using bank account:", {
      bank: bankCode,
      account: accountNumber.substring(0, 4) + "****",
      isEventSpecific: !!eventBankAccount,
    });

    const qrUrl = generateSepayQR(
      accountNumber,
      bankCode,
      amount,
      transferContent,
      accountName,
    );

    return {
      success: true,
      qrUrl,
      accountNumber,
      bankCode,
      accountName,
      transferContent,
    };
  } catch (error) {
    console.error("❌ SePay payment creation error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Parse webhook data
 */
export interface SepayWebhookData {
  id: number;
  gateway: string;
  transactionDate: string;
  accountNumber: string;
  subAccount: string | null;
  transferType: string;
  transferAmount: number;
  accumulated: number;
  code: string;
  content: string;
  description: string;
  bankBrandName: string;
  bankAbbreviation: string;
}

export function parseSepayWebhook(webhookData: any): {
  orderCode: string | null;
  amount: number;
  transactionId: string;
  transactionDate: string;
  bankName: string;
  content: string;
  accountNumber: string; // Account nhận tiền
} {
  const content = webhookData.content || webhookData.description || "";
  let orderCode =
    extractRegistrationIdFromTransferContent(webhookData.code) ||
    extractRegistrationIdFromTransferContent(content);

  if (!orderCode && typeof webhookData.code === "string") {
    orderCode = webhookData.code;
  }

  return {
    orderCode,
    amount: parseInt(webhookData.transferAmount) || 0,
    transactionId: webhookData.id?.toString() || `sepay_${Date.now()}`,
    transactionDate: webhookData.transactionDate || new Date().toISOString(),
    bankName: webhookData.gateway || webhookData.bankAbbreviation || "Unknown",
    content,
    accountNumber: webhookData.accountNumber || "", // ✅ Account nhận tiền
  };
}

/**
 * Verify webhook authenticity
 * SePay gửi Secret Key qua header Authorization: Bearer {secret_key}
 */
export function verifySepayWebhook(
  webhookData: any,
  authHeader?: string | null,
  secretKeyHeader?: string | null,
): boolean {
  // 1. Verify Secret Key nếu được cấu hình
  const webhookSecret = process.env.SEPAY_WEBHOOK_SECRET;
  if (webhookSecret) {
    if (!authHeader && !secretKeyHeader) {
      console.error("❌ Missing Authorization header");
      return false;
    }
    // SePay gửi: "Bearer {secret_key}" hoặc trực tiếp secret key
    const receivedSecret =
      secretKeyHeader ||
      authHeader
        ?.replace(/^Bearer\s+/i, "")
        .replace(/^Apikey\s+/i, "")
        .trim();
    if (!receivedSecret || receivedSecret !== webhookSecret) {
      console.error("❌ Invalid Secret Key");
      return false;
    }
    console.log("✅ Secret Key verified");
  }

  // 2. Verify required fields
  if (!webhookData.id || !webhookData.transferAmount) {
    return false;
  }

  // 3. Only process incoming transfers
  if (webhookData.transferType !== "in") {
    return false;
  }

  return true;
}
