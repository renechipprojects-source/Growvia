import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function validateIndianMobile(input: string): { valid: boolean; formatted: string; error?: string } {
  if (!input || !input.trim()) {
    return { valid: false, formatted: "", error: "Phone number is required." };
  }
  let cleaned = input.trim().replace(/[\s\-()]/g, "");
  if (cleaned.startsWith("+91")) {
    cleaned = cleaned.slice(3);
  } else if (cleaned.startsWith("0")) {
    cleaned = cleaned.slice(1);
  }
  if (!/^\d+$/.test(cleaned)) {
    return { valid: false, formatted: input, error: "Phone number must contain only digits." };
  }
  if (cleaned.length !== 10) {
    return { valid: false, formatted: input, error: `Phone number must be exactly 10 digits (got ${cleaned.length}).` };
  }
  if (!/^[6-9]/.test(cleaned)) {
    return { valid: false, formatted: input, error: "Indian mobile number must start with 6, 7, 8, or 9." };
  }
  return { valid: true, formatted: `+91${cleaned}` };
}
