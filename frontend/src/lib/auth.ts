// Unified authentication and session service for the Sunshine ERP.
// Authentication is handled strictly via Supabase Auth and gv_users.

import type { Role } from "@/lib/roleConfig";

const SESSION_KEY = "sunshine.auth";

export type SystemRole = "super-admin" | "principal" | "office";

export interface SystemUser {
  loginId: string;
  role: SystemRole;
  name: string;
}

export function listSystemUsers(): SystemUser[] {
  return [
    { loginId: "ADMIN001", role: "super-admin", name: "System Administrator" },
    { loginId: "PRINCIPAL001", role: "principal", name: "Principal" },
    { loginId: "OFFICE001", role: "office", name: "Office Staff" },
  ];
}

export function findSystemUserByLoginId(loginId: string): SystemUser | undefined {
  const clean = (loginId || "").trim().toLowerCase().replace(/[\s\-_]+/g, "");
  const list = listSystemUsers();
  return list.find(
    (u) =>
      u.loginId.toLowerCase() === (loginId || "").trim().toLowerCase() ||
      u.loginId.toLowerCase().replace(/[\s\-_]+/g, "") === clean ||
      u.role === clean
  );
}

const TEMP_KEY = "sunshine.tempFlags.v1";


function readTempFlags(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(TEMP_KEY);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}
function writeTempFlags(flags: Record<string, boolean>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TEMP_KEY, JSON.stringify(flags));
}
export function markTemporaryPassword(loginId: string) {
  const f = readTempFlags();
  f[loginId.toLowerCase()] = true;
  writeTempFlags(f);
}
export function clearTemporaryPassword(loginId: string) {
  const f = readTempFlags();
  delete f[loginId.toLowerCase()];
  writeTempFlags(f);
}
export function isTemporaryPassword(loginId: string): boolean {
  const flags = readTempFlags();
  const key = loginId.trim().toLowerCase();
  return Boolean(flags[key] || flags[loginId.trim()]);
}
export function setTemporaryPasswordFlag(loginId: string, isTemp: boolean) {
  const flags = readTempFlags();
  const key = loginId.trim().toLowerCase();
  flags[key] = isTemp;
  writeTempFlags(flags);
}

// ─── Session ────────────────────────────────────────────────────────────────

export interface Session {
  loginId: string;
  email?: string; // legacy compatibility
  role: Role;
  name: string;
  linkId?: string;
  mustChangePassword?: boolean;
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  const raw =
    window.localStorage.getItem(SESSION_KEY) ??
    window.sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as Session & { email?: string };
    return { ...s, loginId: s.loginId ?? s.email ?? "" };
  } catch {
    return null;
  }
}

export function writeSession(session: Session, remember: boolean = true) {
  if (typeof window === "undefined") return;
  const store = remember ? window.localStorage : window.sessionStorage;
  // clear the other so a single session is authoritative
  window.localStorage.removeItem(SESSION_KEY);
  window.sessionStorage.removeItem(SESSION_KEY);
  store.setItem(SESSION_KEY, JSON.stringify({ ...session, email: session.loginId }));
}

import { redirect } from "@tanstack/react-router";

import { supabase } from "@/lib/supabase";

export function signOut() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
  window.sessionStorage.removeItem(SESSION_KEY);
  try {
    supabase.auth.signOut().catch(() => {});
  } catch {}
  try {
    window.location.href = "/";
  } catch {}
}

export function isAuthed(role?: Role | Role[]): boolean {
  const s = getSession();
  if (!s) return false;
  if (!role) return true;
  const roles = Array.isArray(role) ? role : [role];
  const norm = (r: string) => (r === "admin" ? "super-admin" : r);
  const userNorm = norm(s.role);
  return roles.some((r) => norm(r) === userNorm || r === s.role);
}

export function requireAuthGuard(allowedRoles: Role | Role[]): Session {
  const s = getSession();
  if (!s || !s.role) {
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
    throw redirect({ to: "/" });
  }
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  const norm = (r: string) => (r === "admin" ? "super-admin" : (r || "").toLowerCase());
  const userNorm = norm(s.role);
  const match =
    userNorm === "super-admin" ||
    roles.some((r) => norm(r) === userNorm || (r || "").toLowerCase() === (s.role || "").toLowerCase());
  if (!match) {
    throw redirect({ to: roleHome(s.role) });
  }
  if (s.mustChangePassword) {
    throw redirect({ to: "/change-password" });
  }
  return s;
}

// ─── Change password & Temporary Passwords ─────────────────────────────────

export function passwordStrengthIssues(pwd: string): string[] {
  const issues: string[] = [];
  if (pwd.length < 8) issues.push("At least 8 characters");
  if (!/[A-Z]/.test(pwd)) issues.push("One uppercase letter");
  if (!/[a-z]/.test(pwd)) issues.push("One lowercase letter");
  if (!/[0-9]/.test(pwd)) issues.push("One number");
  if (!/[^A-Za-z0-9]/.test(pwd)) issues.push("One special character");
  return issues;
}

export function changePasswordForCurrentUser(newPassword: string): { ok: boolean; error?: string } {
  const s = getSession();
  if (!s) return { ok: false, error: "Not signed in." };
  const issues = passwordStrengthIssues(newPassword);
  if (issues.length) return { ok: false, error: "Password does not meet requirements." };

  try {
    supabase.auth.updateUser({ password: newPassword }).catch(() => {});
    supabase.from("gv_users").update({ must_change_password: false }).eq("login_id", s.loginId).catch(() => {});
  } catch {}

  const updated: Session = { ...s, mustChangePassword: false };
  const storeIsLocal = typeof window !== "undefined" && !!window.localStorage.getItem(SESSION_KEY);
  writeSession(updated, storeIsLocal);
  return { ok: true };
}

export function setTemporaryPasswordFor(loginId: string, tempPassword: string): boolean {
  try {
    import("./api").then(({ API_URL }) => {
      fetch(`${API_URL}/api/users/provision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          login_id: loginId,
          password: tempPassword,
          must_change_password: true,
        }),
      }).catch(() => {});
    });
    supabase.from("gv_users").update({ must_change_password: true }).eq("login_id", loginId).catch(() => {});
    return true;
  } catch {
    return false;
  }
}

export function generateTemporaryPassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const nums = "23456789";
  const sym = "!@#$%^&*";
  const all = upper + lower + nums + sym;
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
  let out = pick(upper) + pick(lower) + pick(nums) + pick(sym);
  for (let i = 4; i < 10; i++) out += pick(all);
  return out.split("").sort(() => Math.random() - 0.5).join("");
}


export function roleHome(role: Role | string): string {
  switch (role) {
    case "admin":
    case "super-admin": return "/admin";
    case "principal":   return "/principal";
    case "office":      return "/office";
    case "teacher":     return "/teacher";
    case "parent":      return "/parent";
    case "student":     return "/parent";
    default:            return "/";
  }
}

