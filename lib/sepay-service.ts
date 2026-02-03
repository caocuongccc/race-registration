// lib/sepay-service.ts - CORRECT SEPAY IMPLEMENTATION
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
  orderCode: string,
  accountName?: string,
): string {
  const description = `DH ${orderCode}`;

  const params = new URLSearchParams({
    acc: accountNumber,
    bank: bankCode,
    amount: amount.toString(),
    des: description,
  });

  if (accountName) {
    params.append("accountName", accountName);
  }

  params.append("template", "compact");

  return `https://qr.sepay.vn/img?${params.toString()}`;
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
      orderCode,
      accountName,
    );

    const transferContent = `DH ${orderCode}`;

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
  let orderCode = webhookData.code || null;

  if (!orderCode && webhookData.content) {
    const match = webhookData.content.match(/DH\s*(\w+)|ORDER\s*(\w+)/i);
    if (match) {
      orderCode = match[1] || match[2];
    }
  }

  return {
    orderCode,
    amount: parseInt(webhookData.transferAmount) || 0,
    transactionId: webhookData.id?.toString() || `sepay_${Date.now()}`,
    transactionDate: webhookData.transactionDate || new Date().toISOString(),
    bankName: webhookData.gateway || webhookData.bankAbbreviation || "Unknown",
    content: webhookData.content || "",
    accountNumber: webhookData.accountNumber || "", // ✅ Account nhận tiền
  };
}

/**
 * Verify webhook authenticity
 */
export function verifySepayWebhook(webhookData: any): boolean {
  if (!webhookData.id || !webhookData.transferAmount) {
    return false;
  }

  if (webhookData.transferType !== "in") {
    return false;
  }

  return true;
}
