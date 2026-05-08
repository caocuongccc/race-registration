export function buildRegistrationTransferContent(
  phone: string,
  registrationNumber: number | string,
): string {
  return `${phone.replace(/\D/g, "")} ${registrationNumber}`;
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
