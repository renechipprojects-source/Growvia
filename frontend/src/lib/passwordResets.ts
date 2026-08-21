import type { Role } from "@/lib/roleConfig";
import { findSystemUserByLoginId, setTemporaryPasswordFor, generateTemporaryPassword, markTemporaryPassword, passwordStrengthIssues } from "@/lib/auth";
import { listParentCredentials, listTeacherCredentials, generateParentCredential, generateTeacherCredential } from "@/lib/credentials";
import { supabase } from "@/lib/supabase";

export type ResetStatus = "Pending" | "In Progress" | "Completed" | "Used" | "Expired";

export interface ResetRequest {
  id: string;
  role: Role;
  name: string;
  loginId: string;
  identifier: string;
  admissionNo?: string;
  employeeId?: string;
  mobile?: string;
  requestedAt: string;
  status: ResetStatus;
  resetToken?: string;
  expiresAt?: string;
  completedAt?: string;
  notes?: string;
}

let memoryResetCache: ResetRequest[] = [];

function read(): ResetRequest[] {
  return memoryResetCache;
}

function write(rows: ResetRequest[]) {
  memoryResetCache = rows;
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new CustomEvent("sunshine:resets"));
    } catch {}
  }
}

export async function fetchPasswordResetsFromSupabase(): Promise<ResetRequest[]> {
  try {
    const { data, error } = await supabase
      .from("gv_requests")
      .select("*")
      .eq("request_type", "password_reset");

    if (error || !data) return read();

    const mapped: ResetRequest[] = data.map((d: any) => {
      let meta: any = {};
      try {
        if (d.reason_or_notes && (d.reason_or_notes.startsWith("{") || d.reason_or_notes.startsWith("["))) {
          meta = JSON.parse(d.reason_or_notes);
        }
      } catch {}

      return {
        id: d.id,
        role: meta.role || "teacher",
        name: d.applicant_or_child_name || meta.name || "User",
        loginId: meta.loginId || d.applicant_or_child_name || "user",
        identifier: meta.identifier || d.applicant_or_child_name || "user",
        admissionNo: meta.admissionNo,
        employeeId: meta.employeeId,
        mobile: meta.mobile,
        requestedAt: d.created_at || new Date().toISOString(),
        status: (d.status as any) || "Pending",
        resetToken: meta.resetToken,
        expiresAt: meta.expiresAt,
        completedAt: meta.completedAt,
        notes: meta.notes,
      };
    });

    write(mapped);
    return mapped;
  } catch {
    return read();
  }
}

export function subscribeResets(cb: () => void): () => void {
  fetchPasswordResetsFromSupabase().then(() => cb());
  if (typeof window === "undefined") return () => {};
  const onCustom = () => cb();
  window.addEventListener("sunshine:resets", onCustom);
  return () => {
    window.removeEventListener("sunshine:resets", onCustom);
  };
}

export function listResetRequests(): ResetRequest[] {
  return read().sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
}

export function listForQueue(queue: "office" | "admin"): ResetRequest[] {
  const roles: Role[] = queue === "office" ? ["parent", "teacher"] : ["principal", "office"];
  return listResetRequests().filter((r) => roles.includes(r.role));
}

function makeId(): string {
  return "RR-" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
}

function generateSecureToken(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  }
  return (
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 10)
  );
}

export interface SecureResetResult {
  ok: boolean;
  message: string;
  requestId?: string;
  error?: string;
}

export function setStatus(id: string, status: ResetStatus) {
  const rows = read().map((r) => {
    if (r.id === id) {
      const updated = {
        ...r,
        status,
        completedAt: status === "Completed" || status === "Used" ? new Date().toISOString() : r.completedAt,
      };

      // Strip resetToken — never persist tokens to the database
      const { resetToken: _omit, ...safeUpdated } = updated;
      Promise.resolve(
        supabase.from("gv_requests").update({
          status,
          reason_or_notes: JSON.stringify(safeUpdated),
        }).eq("id", id)
      ).then(() => {
        notifyAutoRefresh("requests");
        notifyAutoRefresh("staff");
      }).catch(() => {});

      return updated;
    }
    return r;
  });
  write(rows);
  notifyAutoRefresh("requests");
  notifyAutoRefresh("staff");
}

import { notifyAutoRefresh } from "./autoRefreshContext";

export async function requestSecurePasswordReset(
  role: Role,
  identifier: string
): Promise<SecureResetResult> {
  const id = identifier.trim();
  if (!id) {
    return { ok: false, message: "", error: "Please enter your Login ID, Email, or Mobile Number." };
  }

  // Look up account in gv_users
  const { data: user, error } = await supabase
    .from("gv_users")
    .select("id, login_id, full_name, email, mobile, role, status")
    .or(`login_id.ilike.${id},email.ilike.${id},mobile.ilike.${id},admission_no.ilike.${id},employee_id.ilike.${id}`)
    .maybeSingle();

  if (error || !user) {
    // If not found in gv_users, check system users
    const sys = findSystemUserByLoginId(id);
    if (!sys) {
      return {
        ok: false,
        message: "",
        error: "No matching account found with that identifier. Please check your details or contact the school office.",
      };
    }
  }

  const userRole = user?.role || role;
  const loginId = user?.login_id || id;
  const name = user?.full_name || "User";

  if (userRole === "super-admin" || userRole === "admin") {
    return {
      ok: false,
      message: "",
      error: "Admin self-reset is restricted. Please contact the System Administrator.",
    };
  }

  // Check for existing pending request to prevent duplicate/spam replay
  const { data: existingPending } = await supabase
    .from("gv_requests")
    .select("id, created_at, status, reason_or_notes")
    .eq("request_type", "password_reset")
    .eq("status", "Pending");

  const duplicate = (existingPending || []).find((r: any) => {
    try {
      const parsed = JSON.parse(r.reason_or_notes || "{}");
      return parsed.loginId?.toLowerCase() === loginId.toLowerCase();
    } catch {
      return false;
    }
  });

  if (duplicate) {
    return {
      ok: true,
      message: "A password reset request is already pending for this account. Please allow school administration time to verify and process it.",
      requestId: duplicate.id,
    };
  }

  const reqId = makeId();
  const meta = {
    role: userRole,
    loginId,
    name,
    identifier: id,
    email: user?.email || "",
    mobile: user?.mobile || "",
    requestedAt: new Date().toISOString(),
  };

  const { error: insertErr } = await supabase.from("gv_requests").insert([
    {
      id: reqId,
      request_type: "password_reset",
      applicant_or_child_name: name,
      status: "Pending",
      reason_or_notes: JSON.stringify(meta),
    },
  ]);

  if (insertErr) {
    return { ok: false, message: "", error: "Failed to submit request to school server." };
  }

  notifyAutoRefresh("requests");
  notifyAutoRefresh("staff");

  const targetQueue = (userRole === "parent" || userRole === "teacher") ? "School Office" : "System Administrator";

  return {
    ok: true,
    message: `Your password reset request for account "${loginId}" has been submitted to the ${targetQueue}. Once verified, a temporary login password will be issued.`,
    requestId: reqId,
  };
}

import { API_URL as BACKEND_URL } from "@/lib/api";

function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return "****@growvia.edu";
  const [name, domain] = email.split("@");
  if (name.length <= 2) return `${name[0]}*@${domain}`;
  return `${name[0]}${"*".repeat(name.length - 2)}${name[name.length - 1]}@${domain}`;
}

export async function requestOtpForIdentifier(identifier: string): Promise<{ success: boolean; message: string; emailMasked?: string; otpDevFallback?: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`${BACKEND_URL}/api/auth/otp/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));
    if (res.ok) {
      const data = await res.json();
      if (data?.success) return data;
    }
  } catch {}

  const serviceKey = (typeof process !== "undefined" && process?.env?.SUPABASE_SERVICE_ROLE_KEY) || "";
  const supabaseUrl = (typeof process !== "undefined" && (process?.env?.VITE_SUPABASE_URL || process?.env?.SUPABASE_URL)) || "https://nyhnkftlkigoliyogwvp.supabase.co";

  if (serviceKey && identifier) {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const admin = createClient(supabaseUrl, serviceKey);
      const clean = identifier.trim();
      const norm = clean.toLowerCase().replace(/[\s\-_]+/g, "");

      let userEmail: string | null = null;
      let userLoginId: string = clean;

      const { data: profile } = await admin
        .from("gv_users")
        .select("*")
        .or(`login_id.ilike.${clean},login_id.ilike.${norm},email.ilike.${clean},id.ilike.${clean}`)
        .maybeSingle();

      if (profile && profile.email) {
        userEmail = profile.email;
        userLoginId = profile.login_id || clean;
      } else {
        const { data: userList } = await admin.auth.admin.listUsers();
        const authUser = userList?.users?.find(
          (u) =>
            u.email?.toLowerCase() === clean.toLowerCase() ||
            u.user_metadata?.login_id?.toString().toLowerCase() === clean.toLowerCase() ||
            u.user_metadata?.login_id?.toString().toLowerCase() === norm
        );
        if (authUser && authUser.email) {
          userEmail = authUser.email;
          userLoginId = authUser.user_metadata?.login_id || clean;
        }
      }

      if (!userEmail) {
        return {
          success: true,
          message: "If an account matching that Login ID or email exists, an OTP has been sent.",
          emailMasked: "****@growvia.edu",
        };
      }

      const otp = String(Math.floor(100000 + Math.random() * 900000));
      const now = Date.now();
      const expiresAt = now + 10 * 60 * 1000;
      const otpId = `OTP-${userLoginId.toUpperCase()}-${now}`;

      try {
        const { data: existingOtps } = await admin
          .from("gv_requests")
          .select("*")
          .eq("request_type", "otp_reset")
          .eq("applicant_or_child_name", userLoginId);

        if (existingOtps) {
          for (const oldReq of existingOtps) {
            try {
              const oldMeta = JSON.parse(oldReq.reason_or_notes || "{}");
              oldMeta.used = true;
              oldMeta.invalidated = true;
              await admin
                .from("gv_requests")
                .update({ status: "invalidated", reason_or_notes: JSON.stringify(oldMeta) })
                .eq("id", oldReq.id);
            } catch {}
          }
        }
      } catch {}

      const payload = {
        id: otpId,
        request_type: "otp_reset",
        applicant_or_child_name: userLoginId,
        status: "pending",
        reason_or_notes: JSON.stringify({
          otpId,
          loginId: userLoginId,
          email: userEmail,
          otp,
          expiresAt,
          used: false,
          createdAt: new Date(now).toISOString(),
        }),
      };

      await admin.from("gv_requests").upsert([payload], { onConflict: "id" });

      return {
        success: true,
        message: `An OTP code has been sent to ${maskEmail(userEmail)}.`,
        emailMasked: maskEmail(userEmail),
      };
    } catch {}
  }

  return { success: false, message: "Failed to request OTP." };
}

export async function verifyOtpCode(identifier: string, otp: string): Promise<{ success: boolean; message: string; resetToken?: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`${BACKEND_URL}/api/auth/otp/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, otp }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));
    if (res.ok) {
      const data = await res.json();
      if (data?.success) return data;
      return { success: false, message: data?.error || "OTP verification failed." };
    }
  } catch {}

  const serviceKey = (typeof process !== "undefined" && process?.env?.SUPABASE_SERVICE_ROLE_KEY) || "";
  const supabaseUrl = (typeof process !== "undefined" && (process?.env?.VITE_SUPABASE_URL || process?.env?.SUPABASE_URL)) || "https://nyhnkftlkigoliyogwvp.supabase.co";

  if (serviceKey && identifier && otp) {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const admin = createClient(supabaseUrl, serviceKey);
      const clean = identifier.trim();
      const cleanOtp = otp.trim();

      const { data: requests } = await admin
        .from("gv_requests")
        .select("*")
        .eq("request_type", "otp_reset");

      if (requests) {
        let matchingRecord: any = null;
        let meta: any = null;

        for (const r of requests) {
          try {
            const m = JSON.parse(r.reason_or_notes || "{}");
            if (
              (m.loginId?.toLowerCase() === clean.toLowerCase() ||
               m.email?.toLowerCase() === clean.toLowerCase())
            ) {
              if (!matchingRecord || m.expiresAt > (meta?.expiresAt || 0)) {
                matchingRecord = r;
                meta = m;
              }
            }
          } catch {}
        }

        if (!matchingRecord || !meta) {
          return { success: false, message: "Invalid OTP request." };
        }

        if (meta.used || matchingRecord.status === "used" || meta.invalidated) {
          return { success: false, message: "This OTP code has already been used or invalidated. Please request a new OTP." };
        }

        if (Date.now() > meta.expiresAt) {
          return { success: false, message: "OTP code has expired. Please request a new OTP." };
        }

        if (meta.otp !== cleanOtp) {
          return { success: false, message: "Invalid OTP code. Please check and try again." };
        }

        return {
          success: true,
          message: "OTP verified successfully.",
          resetToken: meta.otpId || matchingRecord.id,
        };
      }
    } catch {}
  }

  return { success: false, message: "OTP verification failed." };
}

export async function resetPasswordWithOtp(identifier: string, otp: string, newPassword: string): Promise<{ success: boolean; message: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`${BACKEND_URL}/api/auth/otp/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, otp, newPassword }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));
    if (res.ok) {
      const data = await res.json();
      if (data?.success) return data;
      return { success: false, message: data?.error || "Password reset failed." };
    }
  } catch {}

  const serviceKey = (typeof process !== "undefined" && process?.env?.SUPABASE_SERVICE_ROLE_KEY) || "";
  const supabaseUrl = (typeof process !== "undefined" && (process?.env?.VITE_SUPABASE_URL || process?.env?.SUPABASE_URL)) || "https://nyhnkftlkigoliyogwvp.supabase.co";

  if (serviceKey && identifier && otp && newPassword) {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const admin = createClient(supabaseUrl, serviceKey);
      const clean = identifier.trim();
      const cleanOtp = otp.trim();

      const { data: requests } = await admin
        .from("gv_requests")
        .select("*")
        .eq("request_type", "otp_reset");

      let matchingRecord: any = null;
      let meta: any = null;

      if (requests) {
        for (const r of requests) {
          try {
            const m = JSON.parse(r.reason_or_notes || "{}");
            if (
              (m.loginId?.toLowerCase() === clean.toLowerCase() ||
               m.email?.toLowerCase() === clean.toLowerCase()) &&
              m.otp === cleanOtp
            ) {
              matchingRecord = r;
              meta = m;
              break;
            }
          } catch {}
        }
      }

      if (!matchingRecord || !meta) {
        return { success: false, message: "Invalid OTP or reset request." };
      }

      if (meta.used || matchingRecord.status === "used" || meta.invalidated) {
        return { success: false, message: "This OTP code has already been used or invalidated. Please request a new OTP." };
      }

      if (Date.now() > meta.expiresAt) {
        return { success: false, message: "OTP code has expired. Please request a new OTP." };
      }

      const userEmail = meta.email;
      const userLoginId = meta.loginId;

      const { data: userList } = await admin.auth.admin.listUsers();
      let authUser = userList?.users?.find(
        (u) =>
          u.email?.toLowerCase() === userEmail.toLowerCase() ||
          u.user_metadata?.login_id?.toString().toLowerCase() === userLoginId.toLowerCase()
      );

      let authUserId = authUser?.id || meta.authUserId;

      if (authUserId) {
        await admin.auth.admin.updateUserById(authUserId, {
          password: newPassword,
          email_confirm: true,
        });
      } else {
        const { data: created } = await admin.auth.admin.createUser({
          email: userEmail,
          password: newPassword,
          email_confirm: true,
          user_metadata: { login_id: userLoginId },
        });
        authUserId = created?.user?.id;
      }

      if (authUserId) {
        await admin.from("gv_users").update({ status: "active" }).eq("login_id", userLoginId);
      }

      meta.used = true;
      meta.usedAt = new Date().toISOString();
      await admin
        .from("gv_requests")
        .update({ status: "used", reason_or_notes: JSON.stringify(meta) })
        .eq("id", matchingRecord.id);

      return {
        success: true,
        message: "Your password has been reset successfully. You can now sign in with your new password.",
      };
    } catch {}
  }

  return { success: false, message: "Password reset failed." };
}
