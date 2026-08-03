import { randomBytes, randomInt } from "crypto";
import { compare, hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { decryptBankAccount, type BankAccount } from "@/lib/encryption";

export function createKidRunPublicCode() {
  return `KID${randomBytes(5).toString("hex").toUpperCase()}`;
}

export function createKidRunSecretCode() {
  return randomInt(100000, 1000000).toString();
}

export function createKidRunQrToken() {
  return randomBytes(24).toString("base64url");
}

export function hashKidRunSecretCode(code: string) {
  return hash(code, 12);
}

export function verifyKidRunSecretCode(code: string, digest: string) {
  return compare(code, digest);
}

export function buildKidRunTransferContent(
  publicCode: string,
  bankCode?: string | null,
) {
  const normalized = (bankCode || "").replace(/[\s_-]/g, "").toUpperCase();
  const isVietinBank = ["VIETINBANK", "ICB", "CTG", "970415"].includes(normalized);
  return isVietinBank ? `SEVQR KR ${publicCode}` : `KR ${publicCode}`;
}

export function extractKidRunCode(content?: string | null) {
  if (!content) return null;
  return content.match(/\b(KID[A-Z0-9]{10})\b/i)?.[1]?.toUpperCase() || null;
}

function encrypted(value?: string | null) {
  return Boolean(value && value.split(":").length === 3);
}

export async function getKidRunBankAccount(campaignId: string): Promise<BankAccount | null> {
  const campaign = await prisma.kidRunCampaign.findUnique({
    where: { id: campaignId },
    select: { bankName: true, bankAccount: true, bankHolder: true, bankCode: true },
  });
  if (!campaign?.bankAccount || !campaign.bankCode || !campaign.bankHolder) return null;
  if (!encrypted(campaign.bankAccount) || !encrypted(campaign.bankCode)) {
    return {
      accountNumber: campaign.bankAccount,
      bankCode: campaign.bankCode,
      accountName: campaign.bankHolder,
      bankName: campaign.bankName || campaign.bankCode,
    };
  }
  return decryptBankAccount({
    accountNumberEncrypted: campaign.bankAccount,
    bankCodeEncrypted: campaign.bankCode,
    accountNameEncrypted: campaign.bankHolder,
    bankNameEncrypted: campaign.bankName,
  });
}

export async function confirmKidRunShirtPayment(input: {
  publicCode: string;
  transactionId: string;
  amount: number;
  paymentMethod: string;
  webhookData?: unknown;
}) {
  const application = await prisma.kidRunFamilyApplication.findUnique({
    where: { publicCode: input.publicCode.toUpperCase() },
    include: {
      campaign: true,
      participants: { include: { category: true, shirts: true } },
      shirts: true,
    },
  });
  if (!application) throw new Error(`Kid Run application not found: ${input.publicCode}`);
  if (application.shirtTotalAmount <= 0) throw new Error("Hồ sơ này không có áo cần thanh toán");
  if (application.shirtPaymentStatus === "PAID") return application;
  if (input.amount + 1000 < application.shirtTotalAmount) {
    throw new Error(`Số tiền ${input.amount} nhỏ hơn số tiền áo ${application.shirtTotalAmount}`);
  }

  const duplicate = await prisma.kidRunPayment.findUnique({
    where: { transactionId: input.transactionId },
  });
  if (duplicate && duplicate.applicationId !== application.id) {
    throw new Error(`Giao dịch ${input.transactionId} đã được gán cho hồ sơ khác`);
  }

  const paidAt = new Date();
  await prisma.$transaction([
    prisma.kidRunFamilyApplication.updateMany({
      where: { id: application.id, shirtPaymentStatus: { not: "PAID" } },
      data: { shirtPaymentStatus: "PAID", shirtPaymentDate: paidAt },
    }),
    ...(duplicate
      ? []
      : [
          prisma.kidRunPayment.create({
            data: {
              applicationId: application.id,
              transactionId: input.transactionId,
              amount: input.amount,
              status: "PAID",
              paymentMethod: input.paymentMethod,
              webhookData: input.webhookData as any,
            },
          }),
        ]),
  ]);

  return prisma.kidRunFamilyApplication.findUniqueOrThrow({
    where: { id: application.id },
    include: {
      campaign: true,
      participants: { include: { category: true, shirts: true } },
      shirts: true,
    },
  });
}

export function formatKidRunBib(prefix: string, number: number) {
  return `${prefix}${String(number).padStart(4, "0")}`;
}