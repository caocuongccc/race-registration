export function buildRegistrationTransferContent(
  _phone: string,
  registrationId: string,
): string {
  return `DH${registrationId}`;
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
