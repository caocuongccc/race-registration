import { prisma } from "@/lib/prisma";
import { decryptBankAccount, type BankAccount } from "@/lib/encryption";

function encrypted(value?: string | null) {
  return Boolean(value && value.split(":").length === 3);
}

export async function getMerchCampaignBankAccount(campaignId: string): Promise<BankAccount | null> {
  const campaign = await prisma.merchCampaign.findUnique({
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
