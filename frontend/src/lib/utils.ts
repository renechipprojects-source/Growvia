import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizePhoneNumber(input: string): string {
  if (!input) return "";
  let cleaned = String(input).trim().replace(/[\s\-()]/g, "");
  if (cleaned.startsWith("+91")) {
    cleaned = cleaned.slice(3);
  } else if (cleaned.startsWith("0")) {
    cleaned = cleaned.slice(1);
  }
  // Strip any remaining non-digit characters
  cleaned = cleaned.replace(/\D/g, "");
  return cleaned.slice(0, 10);
}

export function validatePhoneNumber(input: string, required = true): { valid: boolean; normalized: string; error?: string } {
  if (!input || !input.trim()) {
    if (!required) return { valid: true, normalized: "" };
    return { valid: false, normalized: "", error: "Please enter a valid 10-digit phone number." };
  }
  let cleaned = input.trim().replace(/[\s\-()]/g, "");
  if (cleaned.startsWith("+91")) {
    cleaned = cleaned.slice(3);
  } else if (cleaned.startsWith("0")) {
    cleaned = cleaned.slice(1);
  }
  if (!/^\d+$/.test(cleaned)) {
    return { valid: false, normalized: cleaned, error: "Phone number must contain only digits." };
  }
  if (cleaned.length < 10) {
    return { valid: false, normalized: cleaned, error: `Phone number must be exactly 10 digits (entered ${cleaned.length} digits).` };
  }
  if (cleaned.length > 10) {
    return { valid: false, normalized: cleaned.slice(0, 10), error: "Phone number cannot exceed 10 digits." };
  }
  if (!/^[6-9]/.test(cleaned)) {
    return { valid: false, normalized: cleaned, error: "Phone number must start with 6, 7, 8, or 9." };
  }
  return { valid: true, normalized: cleaned };
}

export function validateIndianMobile(input: string): { valid: boolean; formatted: string; error?: string } {
  const result = validatePhoneNumber(input, true);
  return {
    valid: result.valid,
    formatted: result.normalized,
    error: result.error,
  };
}
