// Unified authentication service for the Sunshine ERP.
// Modular so it can later be swapped for Supabase Auth without touching UI.
//
// Storage (localStorage / sessionStorage):
//   sunshine.systemUsers.v1  → system-managed accounts (admin/principal/office)
//   sunshine.tempFlags.v1    → per-loginId flag: password is temporary
//   sunshine.auth            → active session (see routes/index.tsx)

import type { Role } from "@/lib/roleConfig";
import {
  authenticateGenerated,
  generateParentCredential,
  generateTeacherCredential,
  listParentCredentials,
  listTeacherCredentials,
  type AuthResolvedIdentity,
} from "@/lib/credentials";

const SYS_KEY = "sunshine.systemUsers.v1";
const TEMP_KEY = "sunshine.tempFlags.v1";
const SESSION_KEY = "sunshine.auth";

export type SystemRole = "super-admin" | "principal" | "office" | "developer";

export interface SystemUser {
  loginId: string;
  password: string;
  role: SystemRole;
  name: string;
}

const DEFAULT_USERS: SystemUser[] = [
  { loginId: "ADMIN001",     password: "Admin@123",     role: "super-admin", name: "System Administrator" },
  { loginId: "PRINCIPAL001", password: "Principal@123", role: "principal",   name: "Principal" },
  { loginId: "OFFICE001",    password: "Office@123",    role: "office",      name: "Office Staff" },
  { loginId: "DEV001",       password: "Dev@123",       role: "developer",   name: "Lead Developer" },
];

function readSystemUsers(): SystemUser[] {
  if (typeof window === "undefined") return DEFAULT_USERS;
  try {
    const raw = window.localStorage.getItem(SYS_KEY);
    if (!raw) {
      window.localStorage.setItem(SYS_KEY, JSON.stringify(DEFAULT_USERS));
      return DEFAULT_USERS;
    }
    const parsed = JSON.parse(raw) as SystemUser[];
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_USERS;
    return parsed;
  } catch {
    return DEFAULT_USERS;
  }
}

function writeSystemUsers(users: SystemUser[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SYS_KEY, JSON.stringify(users));
}

export function listSystemUsers(): SystemUser[] {
  return readSystemUsers();
}

export function findSystemUserByLoginId(loginId: string): SystemUser | undefined {
  const id = loginId.trim().toLowerCase();
  return readSystemUsers().find((u) => u.loginId.toLowerCase() === id);
}

// ─── Temp-password flags ────────────────────────────────────────────────────

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
  return !!readTempFlags()[loginId.toLowerCase()];
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

function writeSession(session: Session, remember: boolean) {
  const store = remember ? window.localStorage : window.sessionStorage;
  // clear the other so a single session is authoritative
  window.localStorage.removeItem(SESSION_KEY);
  window.sessionStorage.removeItem(SESSION_KEY);
  store.setItem(SESSION_KEY, JSON.stringify({ ...session, email: session.loginId }));
}

import { redirect } from "@tanstack/react-router";

export function signOut() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
  window.sessionStorage.removeItem(SESSION_KEY);
  try {
    window.location.href = "/";
  } catch {
    /* ignore */
  }
}

export function isAuthed(role?: Role | Role[]): boolean {
  const s = getSession();
  if (!s) return false;
  if (!role) return true;
  const roles = Array.isArray(role) ? role : [role];
  return roles.includes(s.role);
}

export function requireAuthGuard(allowedRoles: Role | Role[]): Session {
  const s = getSession();
  if (!s || !s.role) {
    throw redirect({ to: "/" });
  }
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  if (!roles.includes(s.role)) {
    throw redirect({ to: roleHome(s.role) });
  }
  if (s.mustChangePassword) {
    throw redirect({ to: "/change-password" });
  }
  return s;
}

// ─── Authenticate ───────────────────────────────────────────────────────────

export type AuthResult =
  | { ok: true; session: Session }
  | { ok: false; reason: "empty-id" | "empty-password" | "invalid" };

export function authenticate(loginId: string, password: string, remember: boolean): AuthResult {
  const id = loginId.trim();
  if (!id) return { ok: false, reason: "empty-id" };
  if (!password) return { ok: false, reason: "empty-password" };

  // 1) System accounts (Admin / Principal / Office)
  const sys = findSystemUserByLoginId(id);
  if (sys && sys.password === password) {
    const session: Session = {
      loginId: sys.loginId,
      role: sys.role,
      name: sys.name,
      mustChangePassword: isTemporaryPassword(sys.loginId),
    };
    writeSession(session, remember);
    return { ok: true, session };
  }

  // 2) Office-issued credentials (Teacher / Parent)
  const issued: AuthResolvedIdentity | null = authenticateGenerated(id, password);
  if (issued) {
    const session: Session = {
      loginId: issued.loginId,
      role: issued.role,
      name: issued.name,
      linkId: issued.linkId,
      mustChangePassword: isTemporaryPassword(issued.loginId),
    };
    writeSession(session, remember);
    if (issued.role === "parent") {
      window.localStorage.setItem("sunshine.parent.activeChildId", issued.linkId);
    }
    return { ok: true, session };
  }

  return { ok: false, reason: "invalid" };
}

// ─── Change password ────────────────────────────────────────────────────────

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

  // System users → update store
  const sys = findSystemUserByLoginId(s.loginId);
  if (sys) {
    const users = readSystemUsers().map((u) =>
      u.loginId.toLowerCase() === s.loginId.toLowerCase() ? { ...u, password: newPassword } : u,
    );
    writeSystemUsers(users);
  } else {
    if (s.role === "teacher" && s.linkId) {
      generateTeacherCredential(s.linkId, { customLoginId: s.loginId, password: newPassword });
    } else if (s.role === "parent" && s.linkId) {
      generateParentCredential(s.linkId, { customLoginId: s.loginId, password: newPassword });
    }
  }

  clearTemporaryPassword(s.loginId);
  const updated: Session = { ...s, mustChangePassword: false };
  const storeIsLocal = !!window.localStorage.getItem(SESSION_KEY);
  writeSession(updated, storeIsLocal);
  return { ok: true };
}

// Admin/Office issuing a temporary password for another account.
export function setTemporaryPasswordFor(loginId: string, tempPassword: string): boolean {
  // System user?
  const sys = findSystemUserByLoginId(loginId);
  if (sys) {
    const users = readSystemUsers().map((u) =>
      u.loginId.toLowerCase() === loginId.toLowerCase() ? { ...u, password: tempPassword } : u,
    );
    writeSystemUsers(users);
    markTemporaryPassword(loginId);
    return true;
  }
  // Teacher/Parent generated cred?
  const t = listTeacherCredentials().find((c) => c.loginId.toLowerCase() === loginId.toLowerCase());
  if (t) {
    generateTeacherCredential(t.teacherId, { customLoginId: t.loginId, password: tempPassword });
    markTemporaryPassword(loginId);
    return true;
  }
  const p = listParentCredentials().find((c) => c.loginId.toLowerCase() === loginId.toLowerCase());
  if (p) {
    generateParentCredential(p.studentId, { customLoginId: p.loginId, password: tempPassword });
    markTemporaryPassword(loginId);
    return true;
  }
  return false;
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

export function roleHome(role: Role): string {
  switch (role) {
    case "super-admin": return "/admin";
    case "principal":   return "/principal";
    case "office":      return "/office";
    case "teacher":     return "/teacher";
    case "parent":      return "/parent";
    case "developer":   return "/developer-console";
  }
}
