import type { Role } from "@/lib/roleConfig";
import { findSystemUserByLoginId } from "@/lib/auth";
import { listParentCredentials, listTeacherCredentials } from "@/lib/credentials";
import { supabase } from "@/lib/supabase";

const KEY = "sunshine.passwordResets.v1";

export type ResetStatus = "Pending" | "In Progress" | "Completed";

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
  tempPassword?: string;
  completedAt?: string;
  notes?: string;
}

function read(): ResetRequest[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ResetRequest[]) : [];
  } catch { return []; }
}

function write(rows: ResetRequest[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(rows));
    window.dispatchEvent(new CustomEvent("sunshine:resets"));
  } catch {}
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
        tempPassword: meta.tempPassword,
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
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) cb(); };
  window.addEventListener("sunshine:resets", onCustom);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener("sunshine:resets", onCustom);
    window.removeEventListener("storage", onStorage);
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

export interface CreateResult { ok: true; request: ResetRequest }
export interface CreateErr    { ok: false; error: string }

export function requestSystemReset(loginId: string): CreateResult | CreateErr {
  const id = loginId.trim();
  if (!id) return { ok: false, error: "Enter your login ID." };
  const sys = findSystemUserByLoginId(id);
  if (!sys) return { ok: false, error: "No account found for that login ID." };
  if (sys.role === "super-admin") {
    return { ok: false, error: "Admin cannot self-reset. Please contact the ERP System Owner." };
  }
  const req: ResetRequest = {
    id: makeId(),
    role: sys.role,
    name: sys.name,
    loginId: sys.loginId,
    identifier: sys.loginId,
    requestedAt: new Date().toISOString(),
    status: "Pending",
  };
  const rows = read();
  rows.push(req);
  write(rows);

  Promise.resolve(
    supabase.from("gv_requests").insert([{
      id: req.id,
      request_type: "password_reset",
      applicant_or_child_name: req.name,
      status: "Pending",
      reason_or_notes: JSON.stringify(req),
    }])
  ).catch(() => {});

  return { ok: true, request: req };
}

export function requestTeacherReset(identifier: string): CreateResult | CreateErr {
  const id = identifier.trim();
  if (!id) return { ok: false, error: "Enter your Login ID or Employee ID." };
  const creds = listTeacherCredentials();
  const cred = creds.find(
    (c) => c.loginId.toLowerCase() === id.toLowerCase() || c.teacherId.toLowerCase() === id.toLowerCase(),
  );
  if (!cred) return { ok: false, error: "No teacher account found for that identifier." };
  const req: ResetRequest = {
    id: makeId(),
    role: "teacher",
    name: "Teacher",
    loginId: cred.loginId,
    identifier: id,
    employeeId: cred.teacherId,
    requestedAt: new Date().toISOString(),
    status: "Pending",
  };
  const rows = read();
  rows.push(req);
  write(rows);

  Promise.resolve(
    supabase.from("gv_requests").insert([{
      id: req.id,
      request_type: "password_reset",
      applicant_or_child_name: req.name,
      status: "Pending",
      reason_or_notes: JSON.stringify(req),
    }])
  ).catch(() => {});

  return { ok: true, request: req };
}

export function requestParentReset(identifier: string): CreateResult | CreateErr {
  const id = identifier.trim();
  if (!id) return { ok: false, error: "Enter your Admission Number or registered Mobile Number." };
  const creds = listParentCredentials();
  const cred = creds.find((c) => c.loginId.toLowerCase() === id.toLowerCase() || c.studentId.toLowerCase() === id.toLowerCase());
  if (!cred) return { ok: false, error: "No parent account found for that identifier." };
  const req: ResetRequest = {
    id: makeId(),
    role: "parent",
    name: "Parent",
    loginId: cred.loginId,
    identifier: id,
    admissionNo: cred.studentId,
    requestedAt: new Date().toISOString(),
    status: "Pending",
  };
  const rows = read();
  rows.push(req);
  write(rows);

  Promise.resolve(
    supabase.from("gv_requests").insert([{
      id: req.id,
      request_type: "password_reset",
      applicant_or_child_name: req.name,
      status: "Pending",
      reason_or_notes: JSON.stringify(req),
    }])
  ).catch(() => {});

  return { ok: true, request: req };
}

export function setStatus(id: string, status: ResetStatus, tempPassword?: string) {
  const rows = read().map((r) => {
    if (r.id === id) {
      const updated = {
        ...r,
        status,
        tempPassword: tempPassword ?? r.tempPassword,
        completedAt: status === "Completed" ? new Date().toISOString() : r.completedAt,
      };

      Promise.resolve(
        supabase.from("gv_requests").update({
          status,
          reason_or_notes: JSON.stringify(updated),
        }).eq("id", id)
      ).catch(() => {});

      return updated;
    }
    return r;
  });
  write(rows);
}

export function deleteRequest(id: string) {
  write(read().filter((r) => r.id !== id));
  Promise.resolve(supabase.from("gv_requests").delete().eq("id", id)).catch(() => {});
}
