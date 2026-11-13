/**
 * A stable key for a phone number, so the same guest replying twice updates one
 * response however they type their number.
 *
 *   "+91 98765 43210", "0091-98765-43210", "98765 43210"  → "+919876543210"
 *   "+353 87 123 4567", "00353871234567"                   → "+353871234567"
 *
 * A bare 10-digit number starting 6–9 is taken as an Indian mobile, since most
 * guests are in India, and so is an 11-digit number with the Indian trunk 0 (a
 * Mangaluru landline such as 0824 222 3333). Anything else without a country code
 * is kept as typed, digits only.
 */
export function phoneKey(raw: string): string {
  let s = raw.trim().replace(/[\s().-]/g, "");
  if (s.startsWith("00")) s = `+${s.slice(2)}`;
  const plus = s.startsWith("+");
  const digits = s.replace(/\D/g, "");
  if (plus) return `+${digits}`;
  if (/^[6-9]\d{9}$/.test(digits)) return `+91${digits}`;
  if (/^0[6-9]\d{9}$/.test(digits)) return `+91${digits.slice(1)}`;
  return digits;
}
