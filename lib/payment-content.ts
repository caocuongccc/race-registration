export function buildRegistrationTransferContent(
  _phone: string,
  registrationId: string,
  bankCode?: string | null,
): string {
  if (isVietinBank(bankCode)) {
    return `SEVQRDH${registrationId}`;
  }

  return `DH${registrationId}`;
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

  const legacyMatch = content.match(/(?:DH|ORDER)\s*([\w-]+)/i);
  if (legacyMatch) return legacyMatch[1];

  const cuidMatch = content.match(/\b(c[a-z0-9]{20,})\b/i);
  if (cuidMatch) return cuidMatch[1];

  const phoneAndNumberMatch = content.match(/\b\d{8,15}\s+(\d{1,10})\b/);
  return phoneAndNumberMatch?.[1] ?? null;
}
