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
  // Format nội dung: Mã đơn hàng để SePay webhook match được
  // Ví dụ: "DH123456" hoặc "ORDER123456"
  const description = `DH ${orderCode}`;

  // Build QR URL
  const params = new URLSearchParams({
    acc: accountNumber,
    bank: bankCode,
    amount: amount.toString(),
    des: description,
  });

  // Optional: Add account name
  if (accountName) {
    params.append("accountName", accountName);
  }

  // Optional: Template (compact, print, etc.)
  params.append("template", "compact");

  return `https://qr.sepay.vn/img?${params.toString()}`;
}

/**
 * Parse webhook data from SePay
 * Webhook sẽ chứa thông tin giao dịch ngân hàng
 */
export interface SepayWebhookData {
  id: number;
  gateway: string; // Tên ngân hàng: VCB, VPBank, BIDV...
  transactionDate: string; // "2024-01-07 14:02:37"
  accountNumber: string;
  subAccount: string | null;
  transferType: string; // "in" hoặc "out"
  transferAmount: number;
  accumulated: number;
  code: string; // Mã đơn hàng từ nội dung CK
  content: string; // Nội dung chuyển khoản đầy đủ
  description: string;
  bankBrandName: string;
  bankAbbreviation: string;
  virtualAccount: string | null;
  virtualAccountName: string | null;
  corresponsiveName: string | null;
  corresponsiveAccount: string | null;
  corresponsiveBankId: string | null;
  corresponsiveBankName: string | null;
}

/**
 * Parse and extract order code from webhook
 */
export function parseSepayWebhook(webhookData: any): {
  orderCode: string | null;
  amount: number;
  transactionId: string;
  transactionDate: string;
  bankName: string;
  content: string;
} {
  // Extract order code from 'code' field hoặc 'content'
  let orderCode = webhookData.code || null;

  // Nếu không có code, parse từ content
  if (!orderCode && webhookData.content) {
    // Match pattern: "DH 123456" hoặc "ORDER123456"
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
  };
}

/**
 * Verify webhook authenticity (if SePay provides signature)
 * Hiện tại SePay webhook không có signature verification
 * Bạn nên whitelist IP của SePay
 */
export function verifySepayWebhook(webhookData: any): boolean {
  // Check required fields
  if (!webhookData.id || !webhookData.transferAmount) {
    return false;
  }

  // Check transfer type is "in" (tiền vào)
  if (webhookData.transferType !== "in") {
    return false;
  }

  // Optional: Check webhook từ IP whitelist
  // SePay IPs: Cần hỏi support để lấy danh sách IP

  return true;
}

/**
 * Get account info from env
 */
export function getSepayAccountInfo(): {
  accountNumber: string;
  bankCode: string;
  accountName: string;
} {
  const accountNumber = process.env.SEPAY_ACCOUNT_NUMBER;
  const bankCode = process.env.SEPAY_BANK_CODE;
  const accountName = process.env.SEPAY_ACCOUNT_NAME;

  if (!accountNumber || !bankCode) {
    throw new Error(
      "Missing SePay config. Need SEPAY_ACCOUNT_NUMBER and SEPAY_BANK_CODE",
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
 */
export async function createSepayPayment(
  orderCode: string,
  amount: number,
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
    const { accountNumber, bankCode, accountName } = getSepayAccountInfo();

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
 * Query transaction from SePay API (if using API plan)
 * POST https://my.sepay.vn/userapi/{bank_code}/{account_number}/transactions
 * Authorization: Bearer {token}
 */
export async function querySepayTransaction(orderCode: string) {
  try {
    const apiToken = process.env.SEPAY_API_TOKEN;
    const { accountNumber, bankCode } = getSepayAccountInfo();

    if (!apiToken) {
      throw new Error("SEPAY_API_TOKEN not configured");
    }

    const response = await fetch(
      `https://my.sepay.vn/userapi/${bankCode}/${accountNumber}/transactions`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    // Find transaction with matching order code
    const transaction = data.transactions?.find(
      (t: any) =>
        t.code === orderCode ||
        t.content?.includes(orderCode) ||
        t.content?.includes(`DH ${orderCode}`),
    );

    return transaction || null;
  } catch (error) {
    console.error("❌ Query transaction error:", error);
    return null;
  }
}
