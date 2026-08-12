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
      ).catch(() => {});

      return updated;
    }
    return r;
  });
  write(rows);
}

export function requestSecurePasswordReset(
  role: Role,
  identifier: string
): SecureResetResult {
  const id = identifier.trim();
  const genericSuccessMsg =
    "If an account matches the information provided, password reset instructions have been generated.";

  if (!id) {
    return { ok: false, message: "", error: "Please enter your Login ID, Email, or Mobile Number." };
  }

  let foundLoginId = id;
  let foundName = "User";

  if (role === "office" || role === "principal" || role === "super-admin") {
    const sys = findSystemUserByLoginId(id);
    if (sys) {
      if (sys.role === "super-admin") {
        return { ok: false, message: "", error: "Admin self-reset restricted. Please contact System Owner." };
      }
      foundLoginId = sys.loginId;
      foundName = sys.name;
    }
  } else if (role === "teacher") {
    const creds = listTeacherCredentials();
    const cred = creds.find(
      (c) => c.loginId.toLowerCase() === id.toLowerCase() || c.teacherId.toLowerCase() === id.toLowerCase()
    );
    if (cred) {
      foundLoginId = cred.loginId;
      foundName = (cred as any).name || (cred as any).teacherName || "Teacher";
    }
  } else if (role === "parent") {
    const creds = listParentCredentials();
    const cred = creds.find(
      (c) => c.loginId.toLowerCase() === id.toLowerCase() || c.studentId.toLowerCase() === id.toLowerCase()
    );
    if (cred) {
      foundLoginId = cred.loginId;
      foundName = (cred as any).parentName || (cred as any).studentName || "Parent";
    }
  }

  const token = generateSecureToken();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins expiry

  const req: ResetRequest = {
    id: makeId(),
    role,
    name: foundName,
    loginId: foundLoginId,
    identifier: id,
    requestedAt: new Date().toISOString(),
    status: "Pending",
    resetToken: token,
    expiresAt,
  };

  const rows = read();
  rows.push(req);
  write(rows);

  // Strip resetToken — never persist tokens to the database
  const { resetToken: _omitToken, ...safeReq } = req;
  Promise.resolve(
    supabase.from("gv_requests").insert([
      {
        id: req.id,
        request_type: "password_reset",
        applicant_or_child_name: req.name,
        status: "Pending",
        reason_or_notes: JSON.stringify(safeReq),
      },
    ])
  ).catch(() => {});

  // Return request ID (not the token) — the token stays in memory only
  return {
    ok: true,
    message: genericSuccessMsg,
    requestId: req.id,
  };
}

export function completeSecurePasswordReset(
  token: string,
  newPassword: string
): { ok: boolean; error?: string } {
  const cleanToken = token.trim();
  const pwd = newPassword.trim();

  if (!cleanToken) {
    return { ok: false, error: "Password reset token is required." };
  }
  const strengthIssues = passwordStrengthIssues(pwd);
  if (strengthIssues.length) {
    return { ok: false, error: "Password does not meet requirements: " + strengthIssues.join(", ") + "." };
  }

  const rows = read();
  const req = rows.find((r) => r.resetToken === cleanToken || r.id === cleanToken);

  if (!req) {
    return { ok: false, error: "Invalid or expired password reset token." };
  }

  if (req.status === "Used" || req.status === "Expired") {
    return { ok: false, error: "This password reset token has already been used or expired." };
  }

  if (req.expiresAt && new Date(req.expiresAt) < new Date()) {
    req.status = "Expired";
    write(rows);
    return { ok: false, error: "This password reset token has expired. Please request a new one." };
  }

  // Update password securely
  setTemporaryPasswordFor(req.loginId, pwd);

  // Invalidate single-use token
  req.status = "Used";
  req.completedAt = new Date().toISOString();
  write(rows);

  // Strip resetToken — never persist tokens to the database
  const { resetToken: _omitUsed, ...safeUsedReq } = req;
  Promise.resolve(
    supabase.from("gv_requests").update({
      status: "Used",
      reason_or_notes: JSON.stringify(safeUsedReq),
    }).eq("id", req.id)
  ).catch(() => {});

  return { ok: true };
}
