export function buildRegistrationTransferContent(
  _phone: string,
  registrationId: string,
  bankCode?: string | null,
): string {
  if (isVietinBank(bankCode)) {
    return `SEVQR DH${registrationId}`;
  }

  return `DH${registrationId}`;
}

export function buildManualRegistrationTransferContent(
  phone: string,
  registrationNumber?: number | string | null,
): string {
  const normalizedPhone = phone.replace(/\D/g, "") || phone.trim();
  const normalizedRegistrationNumber =
    registrationNumber === null || registrationNumber === undefined
      ? ""
      : String(registrationNumber).trim();

  return normalizedRegistrationNumber
    ? `DK${normalizedRegistrationNumber} ${normalizedPhone}`
    : normalizedPhone;
}

export function buildShirtOrderTransferContent(
  shirtOrderId: string,
  bankCode?: string | null,
): string {
  if (isVietinBank(bankCode)) {
    return `SEVQR AO${shirtOrderId}`;
  }

  return `DHAO${shirtOrderId}`;
}

export function buildMerchOrderTransferContent(
  publicCode: string,
  bankCode?: string | null,
): string {
  return isVietinBank(bankCode) ? `SEVQR ${publicCode}` : publicCode;
}

export function isVietinBank(bankCode?: string | null): boolean {
  if (!bankCode) return false;
  const normalized = bankCode.replace(/[\s_-]/g, "").toUpperCase();
  return (
    normalized === "VIETINBANK" ||
    normalized === "ICB" ||
    normalized === "CTG" ||
    normalized === "970415"
  );
}

export function extractRegistrationIdFromTransferContent(
  content?: string | null,
): string | null {
  if (!content) return null;

  const legacyMatch = content.match(/(?:SEVQR\s*)?(?:DH|ORDER)\s*([\w-]+)/i);
  if (legacyMatch) return legacyMatch[1];

  const cuidMatch = content.match(/\b(c[a-z0-9]{20,})\b/i);
  if (cuidMatch) return cuidMatch[1];

  const phoneAndNumberMatch = content.match(/\b\d{8,15}\s+(\d{1,10})\b/);
  return phoneAndNumberMatch?.[1] ?? null;
}

export function extractShirtOrderIdFromTransferContent(
  content?: string | null,
): string | null {
  if (!content) return null;

  const shirtOrderMatch = content.match(
    /\b(?:SEVQR\s*)?(?:AO|DHAO|SEVQRAO|SHIRTORDER|SHIRT)\s*-?\s*([\w-]+)/i,
  );

  return shirtOrderMatch?.[1] ?? null;
}

export function extractMerchOrderCodeFromTransferContent(
  content?: string | null,
): string | null {
  if (!content) return null;
  return content.match(/\b(TTE[A-Z0-9]{8,20})\b/i)?.[1]?.toUpperCase() || null;
}
