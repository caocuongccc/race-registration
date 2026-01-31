// lib/validation.ts
/**
 * Comprehensive validation and sanitization utilities
 * Auto-fixes common user input errors
 */

/**
 * Sanitize and validate email
 * - Trims whitespace
 * - Converts to lowercase
 * - Auto-fixes common TLD typos (.con -> .com, .ccom -> .com, etc.)
 */
export function sanitizeEmail(email: string): string {
  if (!email) return "";

  // Trim and lowercase
  let clean = email.trim().toLowerCase();

  // Auto-fix common TLD typos
  const commonTypos = {
    ".con": ".com",
    ".ccom": ".com",
    ".comm": ".com",
    ".cmo": ".com",
    ".ocm": ".com",
    ".vom": ".com",
    ".cim": ".com",
    ".cpm": ".com",
    ".xom": ".com",
    ".conm": ".com",
    ".copm": ".com",
    ".comn": ".com",
    ".vn.": ".vn", // Remove trailing dot
    ".com.": ".com",
  };

  // Apply fixes
  for (const [typo, correct] of Object.entries(commonTypos)) {
    if (clean.endsWith(typo)) {
      clean = clean.slice(0, -typo.length) + correct;
      break;
    }
  }

  return clean;
}

/**
 * Validate email format
 */
export function validateEmail(email: string): {
  valid: boolean;
  error?: string;
} {
  const cleaned = sanitizeEmail(email);

  if (!cleaned) {
    return { valid: false, error: "Email không được để trống" };
  }

  // RFC 5322 compliant regex (simplified)
  const emailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  if (!emailRegex.test(cleaned)) {
    return { valid: false, error: "Email không hợp lệ" };
  }

  // Check for common invalid patterns
  if (
    cleaned.includes("..") ||
    cleaned.startsWith(".") ||
    cleaned.endsWith(".")
  ) {
    return { valid: false, error: "Email chứa dấu chấm không hợp lệ" };
  }

  const [local, domain] = cleaned.split("@");

  if (!domain || !domain.includes(".")) {
    return { valid: false, error: "Domain email không hợp lệ" };
  }

  if (local.length > 64 || domain.length > 255) {
    return { valid: false, error: "Email quá dài" };
  }

  return { valid: true };
}

/**
 * Sanitize phone number
 * - Removes all non-digit characters
 * - Normalizes Vietnamese phone formats
 */
export function sanitizePhone(phone: string): string {
  if (!phone) return "";

  // Remove all non-digits
  let clean = phone.replace(/\D/g, "");

  // Remove leading +84 or 84
  if (clean.startsWith("84")) {
    clean = "0" + clean.slice(2);
  }

  // Ensure starts with 0
  if (!clean.startsWith("0") && clean.length === 9) {
    clean = "0" + clean;
  }

  return clean;
}

/**
 * Validate Vietnamese phone number
 */
export function validatePhone(phone: string): {
  valid: boolean;
  error?: string;
} {
  const cleaned = sanitizePhone(phone);

  if (!cleaned) {
    return { valid: false, error: "Số điện thoại không được để trống" };
  }

  // Vietnamese phone: 10 digits, starts with 0
  if (!/^0\d{9}$/.test(cleaned)) {
    return {
      valid: false,
      error: "Số điện thoại phải có 10 chữ số và bắt đầu bằng 0",
    };
  }

  // Valid Vietnamese mobile prefixes
  const validPrefixes = ["03", "05", "07", "08", "09"];
  const prefix = cleaned.slice(0, 2);

  if (!validPrefixes.includes(prefix)) {
    return { valid: false, error: "Đầu số điện thoại không hợp lệ" };
  }

  return { valid: true };
}

/**
 * Sanitize text input
 * - Trims whitespace
 * - Removes excessive spaces
 * - Normalizes Vietnamese characters
 */
export function sanitizeText(text: string): string {
  if (!text) return "";

  return text
    .trim()
    .replace(/\s+/g, " ") // Replace multiple spaces with single space
    .normalize("NFC"); // Normalize Unicode characters
}

/**
 * Sanitize name input
 * - Capitalizes first letter of each word
 * - Removes numbers and special characters
 */
export function sanitizeName(name: string): string {
  if (!name) return "";

  return sanitizeText(name)
    .replace(/[0-9!@#$%^&*()_+=\[\]{};':"\\|,.<>/?]+/g, "") // Remove special chars
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Sanitize CCCD/CMND
 * - Removes all non-alphanumeric characters
 */
export function sanitizeIdCard(idCard: string): string {
  if (!idCard) return "";

  return idCard.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

/**
 * Batch sanitize registration data
 */
export interface RegistrationInput {
  fullName?: string;
  email?: string;
  phone?: string;
  idCard?: string;
  address?: string;
  city?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

export function sanitizeRegistrationData(
  data: RegistrationInput
): RegistrationInput {
  return {
    fullName: data.fullName ? sanitizeName(data.fullName) : undefined,
    email: data.email ? sanitizeEmail(data.email) : undefined,
    phone: data.phone ? sanitizePhone(data.phone) : undefined,
    idCard: data.idCard ? sanitizeIdCard(data.idCard) : undefined,
    address: data.address ? sanitizeText(data.address) : undefined,
    city: data.city ? sanitizeText(data.city) : undefined,
    emergencyContactName: data.emergencyContactName
      ? sanitizeName(data.emergencyContactName)
      : undefined,
    emergencyContactPhone: data.emergencyContactPhone
      ? sanitizePhone(data.emergencyContactPhone)
      : undefined,
  };
}

/**
 * Validate complete registration data
 */
export function validateRegistrationData(data: RegistrationInput): {
  valid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  // Validate email
  if (data.email) {
    const emailValidation = validateEmail(data.email);
    if (!emailValidation.valid) {
      errors.email = emailValidation.error!;
    }
  }

  // Validate phone
  if (data.phone) {
    const phoneValidation = validatePhone(data.phone);
    if (!phoneValidation.valid) {
      errors.phone = phoneValidation.error!;
    }
  }

  // Validate emergency contact phone
  if (data.emergencyContactPhone) {
    const emergencyPhoneValidation = validatePhone(data.emergencyContactPhone);
    if (!emergencyPhoneValidation.valid) {
      errors.emergencyContactPhone = emergencyPhoneValidation.error!;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * React hook for form validation with auto-sanitization
 */
export function useSanitizedInput(
  initialValue: string = "",
  sanitizer: (v: string) => string
) {
  const [value, setValue] = React.useState(initialValue);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = sanitizer(e.target.value);
    setValue(sanitized);
  };

  return [value, handleChange, setValue] as const;
}

// Example usage in a form component:
/*
import { useSanitizedInput, sanitizeEmail, sanitizePhone } from '@/lib/validation';

function RegistrationForm() {
  const [email, handleEmailChange, setEmail] = useSanitizedInput('', sanitizeEmail);
  const [phone, handlePhoneChange, setPhone] = useSanitizedInput('', sanitizePhone);
  
  return (
    <form>
      <input value={email} onChange={handleEmailChange} />
      <input value={phone} onChange={handlePhoneChange} />
    </form>
  );
}
*/
