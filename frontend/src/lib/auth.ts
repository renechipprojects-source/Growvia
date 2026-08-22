// Unified authentication and session service for the Sunshine ERP.
// Authentication is handled strictly via Supabase Auth and gv_users.

import type { Role } from "@/lib/roleConfig";

const SESSION_KEY = "sunshine.auth";

export function safeNormalizeId(rawId?: string | null): string {
  if (!rawId) return "";
  return rawId.trim().toUpperCase();
}

export type SystemRole = "super-admin" | "principal" | "office";

export interface SystemUser {
  loginId: string;
  role: SystemRole;
  name: string;
}

export interface SystemUser {
  loginId: string;
  role: SystemRole;
  name: string;
}

export function listSystemUsers(): SystemUser[] {
  return [];
}

export function findSystemUserByLoginId(_loginId: string): SystemUser | undefined {
  return undefined;
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

export const setSession = writeSession;

import { redirect } from "@tanstack/react-router";

import { supabase } from "@/lib/supabase";

export function getUserScopedStorageKey(baseKey: string): string {
  const session = getSession();
  const userId = session?.loginId ? safeNormalizeId(session.loginId) : "anon";
  return `${baseKey}.${userId}`;
}

export function clearAllClientCaches() {
  if (typeof window === "undefined") return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith("sunshine.") || k.startsWith("sunshine_"))) {
        keysToRemove.push(k);
      }
    }
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && (k.startsWith("sunshine.") || k.startsWith("sunshine_"))) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => {
      try { localStorage.removeItem(k); } catch {}
      try { sessionStorage.removeItem(k); } catch {}
    });
  } catch {}
}

export function signOut() {
  if (typeof window === "undefined") return;
  clearAllClientCaches();
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

export async function requireAuthGuard(allowedRoles: Role | Role[]): Promise<Session> {
  let authUser: any = null;
  try {
    const { data } = await supabase.auth.getUser();
    authUser = data?.user;
  } catch {}

  const cachedSession = getSession();

  if (!authUser) {
    clearAllClientCaches();
    throw redirect({ to: "/" });
  }

  let profile: any = null;
  if (authUser) {
    try {
      const { data: p } = await supabase
        .from("gv_users")
        .select("*")
        .or(`auth_user_id.eq.${authUser.id},id.eq.${authUser.id},email.ilike.${authUser.email}`)
        .maybeSingle();
      if (p) profile = p;
    } catch {}

    if (!profile && authUser.email) {
      try {
        const { resolveLoginIdViaServer } = await import("./supabaseAuth");
        const serverRes = await resolveLoginIdViaServer(authUser.email);
        if (serverRes?.profile) profile = serverRes.profile;
      } catch {}
    }
  }

  if (profile && (profile.status === "inactive" || profile.status === "disabled")) {
    await supabase.auth.signOut().catch(() => {});
    clearAllClientCaches();
    throw redirect({ to: "/" });
  }

  const activeRole: Role = (profile?.role || authUser?.user_metadata?.role || cachedSession?.role) as Role;
  const activeLoginId = profile?.login_id || authUser?.user_metadata?.login_id || cachedSession?.loginId || authUser?.email || "user";
  const activeName = profile?.full_name || authUser?.user_metadata?.full_name || cachedSession?.name || "User";
  const activeMustChange = Boolean(profile?.must_change_password ?? cachedSession?.mustChangePassword);

  if (!activeRole) {
    throw redirect({ to: "/" });
  }

  const liveSession: Session = {
    loginId: activeLoginId,
    email: authUser?.email || profile?.email || cachedSession?.email,
    role: activeRole,
    name: activeName,
    mustChangePassword: activeMustChange,
  };

  writeSession(liveSession, true);

  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  const norm = (r: string) => {
    const l = (r || "").toLowerCase();
    if (l === "admin") return "super-admin";
    if (l === "student") return "parent";
    return l;
  };
  const userNorm = norm(liveSession.role);
  const match =
    userNorm === "super-admin" ||
    roles.some((r) => norm(r) === userNorm || (r || "").toLowerCase() === (liveSession.role || "").toLowerCase());

  if (!match) {
    throw redirect({ to: roleHome(liveSession.role) });
  }

  if (liveSession.mustChangePassword) {
    throw redirect({ to: "/change-password" });
  }

  return liveSession;
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

export async function changePasswordForCurrentUser(newPassword: string): Promise<{ ok: boolean; error?: string }> {
  const s = getSession();
  if (!s) return { ok: false, error: "Not signed in." };
  const issues = passwordStrengthIssues(newPassword);
  if (issues.length) return { ok: false, error: "Password does not meet requirements." };

  try {
    const { error: authErr } = await supabase.auth.updateUser({ password: newPassword });
    if (authErr) {
      return { ok: false, error: authErr.message || "Failed to update password in auth system." };
    }
    // Auth succeeded — now update the must_change_password flag (best-effort)
    Promise.resolve(supabase.from("gv_users").update({ must_change_password: false }).eq("login_id", s.loginId)).catch(() => {});
  } catch (err: any) {
    return { ok: false, error: err?.message || "Password update failed." };
  }

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
    Promise.resolve(supabase.from("gv_users").update({ must_change_password: true }).eq("login_id", loginId)).catch(() => {});
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

