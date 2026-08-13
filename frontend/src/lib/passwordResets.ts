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
