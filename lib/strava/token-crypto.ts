import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";

function parseKey(hexKey: string): Buffer {
  if (!/^[a-fA-F0-9]{64}$/.test(hexKey)) {
    throw new Error("STRAVA_TOKEN_ENCRYPTION_KEY phải gồm đúng 64 ký tự hex");
  }
  return Buffer.from(hexKey, "hex");
}

export function encryptStravaToken(token: string, hexKey: string): string {
  if (!token) throw new Error("Không thể mã hóa token rỗng");
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, parseKey(hexKey), iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64url")}:${tag.toString("base64url")}:${encrypted.toString("base64url")}`;
}

export function decryptStravaToken(value: string, hexKey: string): string {
  const [version, ivEncoded, tagEncoded, encryptedEncoded] = value.split(":");
  if (version !== "v1" || !ivEncoded || !tagEncoded || !encryptedEncoded) {
    throw new Error("Dữ liệu token Strava không đúng định dạng");
  }
  const decipher = createDecipheriv(
    ALGORITHM,
    parseKey(hexKey),
    Buffer.from(ivEncoded, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagEncoded, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedEncoded, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

