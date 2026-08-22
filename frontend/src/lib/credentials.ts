// Shared credentials store for generated Teacher and Parent logins.
// Persisted in localStorage and Supabase gv_requests so Office-issued credentials survive reloads,
// cross-tab sync, and can be viewed securely by authorized administrators.

import type { Student, Teacher } from "@/lib/mockData";
import { supabase } from "@/lib/supabase";
import { notifyAutoRefresh } from "./autoRefreshContext";

export function generateCanonicalAdmissionNo(year: number = 2026, sequence: number = 1): string {
  const yy = String(year).slice(-2);
  const nnnn = String(Math.max(1, sequence)).padStart(4, "0");
  return `${yy}${nnnn}`;
}

export function toCanonicalAdmissionNo(rawNo?: string | number, id?: string | number, joinYear?: number | string): string {
  const str = String(rawNo ?? "").trim();
  if (/^\d{6}$/.test(str)) {
    return str;
  }
  const digitsOnly = str.replace(/\D/g, "") || String(id ?? "").replace(/\D/g, "");
  let yy = "26";
  if (joinYear !== undefined && joinYear !== null && String(joinYear).trim() !== "") {
    yy = String(joinYear).trim().slice(-2);
  } else if (digitsOnly.length === 8 && (digitsOnly.startsWith("202") || digitsOnly.startsWith("203"))) {
    yy = digitsOnly.slice(2, 4);
  } else if (digitsOnly.length === 6 && (digitsOnly.startsWith("24") || digitsOnly.startsWith("25") || digitsOnly.startsWith("26") || digitsOnly.startsWith("27") || digitsOnly.startsWith("28") || digitsOnly.startsWith("29") || digitsOnly.startsWith("30"))) {
    yy = digitsOnly.slice(0, 2);
  } else if (str.includes("2027") || str.includes("27-") || str.includes("/27") || str.includes("-27")) {
    yy = "27";
  } else if (str.includes("2028") || str.includes("28-") || str.includes("/28") || str.includes("-28")) {
    yy = "28";
  } else if (str.includes("2025") || str.includes("25-") || str.includes("/25") || str.includes("-25")) {
    yy = "25";
  } else if (str.includes("2024") || str.includes("24-") || str.includes("/24") || str.includes("-24")) {
    yy = "24";
  }

  let seq = 1;
  if (digitsOnly.length >= 4) {
    const rawSeq = parseInt(digitsOnly.slice(-4), 10);
    seq = isNaN(rawSeq) || rawSeq === 0 ? 1 : rawSeq;
  } else if (digitsOnly.length > 0) {
    const rawSeq = parseInt(digitsOnly, 10);
    seq = isNaN(rawSeq) || rawSeq === 0 ? 1 : rawSeq;
  }
  if (seq > 9999) seq = (seq % 9999) || 1;
  return `${yy}${String(seq).padStart(4, "0")}`;
}

export type CredentialStatus = "Active" | "Inactive";

export interface ParentCredential {
  kind: "parent";
  studentId: string;
  loginId: string;
  password: string;
  status: CredentialStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TeacherCredential {
  kind: "teacher";
  teacherId: string;
  loginId: string;
  password: string;
  status: CredentialStatus;
  createdAt: string;
  updatedAt: string;
}

export type AnyCredential = ParentCredential | TeacherCredential;

interface Store {
  parents: Record<string, ParentCredential>;
  teachers: Record<string, TeacherCredential>;
}

const STORAGE_KEY = "sunshine.credentials.v4";

let memoryCredentialsStore: Store = { parents: {}, teachers: {} };

function read(): Store {
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        memoryCredentialsStore = {
          parents: parsed.parents || {},
          teachers: parsed.teachers || {},
        };
      }
    } catch {}
  }
  return memoryCredentialsStore;
}

function write(store: Store) {
  memoryCredentialsStore = store;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
      window.dispatchEvent(new CustomEvent("sunshine:credentials"));
    } catch {}
  }
}

export function saveCredToSupabase(cred: AnyCredential) {
  const key = cred.kind === "parent" ? cred.studentId : cred.teacherId;
  const payload = {
    id: `cred_${cred.kind}_${key}`,
    request_type: "generated_credential",
    applicant_or_child_name: cred.loginId,
    status: cred.status,
    reason_or_notes: JSON.stringify(cred),
  };
  Promise.resolve(supabase.from("gv_requests").upsert([payload], { onConflict: "id" })).catch(() => {});
}

export async function syncCredentialsFromSupabase() {
  try {
    const { data, error } = await supabase
      .from("gv_requests")
      .select("*")
      .eq("request_type", "generated_credential");

    if (!error && data && data.length > 0) {
      const store = read();
      let updated = false;

      data.forEach((row: any) => {
        try {
          if (row.reason_or_notes && (row.reason_or_notes.startsWith("{") || row.reason_or_notes.startsWith("["))) {
            const cred: AnyCredential = JSON.parse(row.reason_or_notes);
            if (cred.kind === "parent" && cred.studentId) {
              const existingPw = store.parents[cred.studentId]?.password;
              store.parents[cred.studentId] = {
                ...cred,
                password: cred.password || existingPw || "",
              };
              updated = true;
            } else if (cred.kind === "teacher" && cred.teacherId) {
              const existingPw = store.teachers[cred.teacherId]?.password;
              store.teachers[cred.teacherId] = {
                ...cred,
                password: cred.password || existingPw || "",
              };
              updated = true;
            }
          }
        } catch {}
      });

      if (updated) {
        write(store);
      }
    }
  } catch {}
}

if (typeof window !== "undefined") {
  syncCredentialsFromSupabase();
}

export function subscribeCredentials(callback: () => void) {
  if (typeof window !== "undefined") {
    window.addEventListener("sunshine:credentials", callback);
    return () => window.removeEventListener("sunshine:credentials", callback);
  }
  return () => {};
}

// ─── Suggestions & Formatting ─────────────────────────────────────────────

export function suggestParentLoginId(student: Partial<Student>): string {
  return toCanonicalAdmissionNo(student.admissionNo, student.id);
}

export function alternativeParentLoginId(student: Partial<Student>): string {
  const phone = student.phone || "9876543210";
  const digits = phone.replace(/\D/g, "");
  return digits.slice(-10) || phone;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function sanitizeTeacherName(rawName?: string, fallbackId?: string): string {
  if (!rawName) {
    if (fallbackId && !UUID_PATTERN.test(fallbackId.trim())) return fallbackId;
    return "Assigned Teacher";
  }
  const trimmed = rawName.trim();
  if (UUID_PATTERN.test(trimmed)) {
    if (fallbackId && !UUID_PATTERN.test(fallbackId.trim())) return fallbackId;
    return "Assigned Teacher";
  }
  return trimmed;
}

export function suggestTeacherLoginId(teacher: Partial<Teacher>): string {
  return (teacher.id || "TCH100").toUpperCase();
}

// ─── Passwords ──────────────────────────────────────────────────────────────

const PASSWORD_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
export function generatePassword(len = 10): string {
  let out = "";
  const cryptoObj = typeof window !== "undefined" ? window.crypto : undefined;
  if (cryptoObj?.getRandomValues) {
    const buf = new Uint32Array(len);
    cryptoObj.getRandomValues(buf);
    for (let i = 0; i < len; i++) out += PASSWORD_CHARSET[buf[i] % PASSWORD_CHARSET.length];
  } else {
    for (let i = 0; i < len; i++) out += PASSWORD_CHARSET[Math.floor(Math.random() * PASSWORD_CHARSET.length)];
  }
  return out;
}

// ─── Parent CRUD ────────────────────────────────────────────────────────────

export function listParentCredentials(): ParentCredential[] {
  return Object.values(read().parents);
}

export function getParentCredential(studentId: string): ParentCredential | undefined {
  return read().parents[studentId];
}

export async function generateParentCredential(
  studentId: string,
  opts?: { loginIdBasis?: "admission" | "mobile"; customLoginId?: string; password?: string; student?: Student },
): Promise<ParentCredential> {
  const student = opts?.student || {
    id: studentId,
    admissionNo: toCanonicalAdmissionNo(undefined, studentId),
    parent: "Parent User",
    phone: "9876543210",
  } as any;

  const now = new Date().toISOString();
  const loginId =
    opts?.customLoginId?.trim() ||
    (opts?.loginIdBasis === "mobile"
      ? alternativeParentLoginId(student)
      : suggestParentLoginId(student));

  const store = read();
  const existing = store.parents[studentId];
  const cred: ParentCredential = {
    kind: "parent",
    studentId,
    loginId,
    password: opts?.password ?? generatePassword(),
    status: "Active",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  store.parents[studentId] = cred;
  write(store);
  saveCredToSupabase(cred);

  const rawEmail = (student as any).email || (student as any).parentEmail;
  const parentEmail = (rawEmail && typeof rawEmail === "string" && rawEmail.includes("@"))
    ? rawEmail.trim().toLowerCase()
    : `${loginId.toLowerCase()}@growvia.edu`;

  // Provision user in database & auth.users BEFORE returning
  const { triggerServerUserProvisioning } = await import("./supabaseAuth");
  await triggerServerUserProvisioning({
    login_id: loginId,
    password: cred.password,
    role: "parent",
    email: parentEmail,
    name: student.parent || "Parent User",
    mobile: student.phone || "9876543210",
  });

  return cred;
}

export async function resetParentPassword(studentId: string): Promise<ParentCredential> {
  const store = read();
  const existing = store.parents[studentId];
  if (!existing) {
    return generateParentCredential(studentId);
  }
  const newPassword = generatePassword();
  const updated: ParentCredential = {
    ...existing,
    password: newPassword,
    status: "Active",
    updatedAt: new Date().toISOString(),
  };
  store.parents[studentId] = updated;
  write(store);
  saveCredToSupabase(updated);

  const parentEmail = `${updated.loginId.toLowerCase()}@growvia.edu`;

  const { triggerServerUserProvisioning } = await import("./supabaseAuth");
  await triggerServerUserProvisioning({
    login_id: updated.loginId,
    password: newPassword,
    role: "parent",
    email: parentEmail,
    name: "Parent User",
  });

  return updated;
}

export function setParentStatus(studentId: string, status: CredentialStatus) {
  const store = read();
  const existing = store.parents[studentId];
  if (!existing) return;
  const updated = { ...existing, status, updatedAt: new Date().toISOString() };
  store.parents[studentId] = updated;
  write(store);
  saveCredToSupabase(updated);
  notifyAutoRefresh("parents");
  notifyAutoRefresh("students");
  Promise.resolve(supabase.from("users").update({ status: status.toLowerCase() }).eq("login_id", existing.loginId)).catch(() => {});
  Promise.resolve(supabase.from("gv_users").update({ status: status.toLowerCase() }).eq("login_id", existing.loginId)).catch(() => {});
}

// ─── Teacher CRUD ───────────────────────────────────────────────────────────

export function listTeacherCredentials(): TeacherCredential[] {
  return Object.values(read().teachers);
}

export function getTeacherCredential(teacherId: string): TeacherCredential | undefined {
  return read().teachers[teacherId];
}

export async function createTeacherAuthAccount(params: {
  teacherId: string;
  loginId: string;
  password: string;
  name: string;
  email: string;
  mobile?: string;
}) {
  const { loginId, password, name, email, mobile } = params;
  const teacherEmail = (email && email.includes("@")) ? email.trim() : `${loginId.toLowerCase()}@sunshineschool.edu`;

  const { triggerServerUserProvisioning } = await import("./supabaseAuth");
  const serverRes = await triggerServerUserProvisioning({
    login_id: loginId,
    email: teacherEmail,
    password: password,
    role: "teacher",
    name: name,
    mobile: mobile || "9876543210",
  });

  return {
    loginId,
    email: teacherEmail,
    authUserId: serverRes?.data?.authUserId || null,
  };
}

export async function generateTeacherCredential(
  teacherId: string,
  opts?: { customLoginId?: string; password?: string; teacher?: Teacher },
): Promise<TeacherCredential> {
  const teacher = opts?.teacher || {
    id: teacherId,
    name: "Teacher User",
    email: `teacher.${teacherId}@sunshineschool.edu`,
    phone: "9876543210",
  } as any;

  const now = new Date().toISOString();
  const store = read();
  const existing = store.teachers[teacherId];
  const loginId = opts?.customLoginId?.trim() || suggestTeacherLoginId(teacher);
  const password = opts?.password ?? generatePassword();
  const cred: TeacherCredential = {
    kind: "teacher",
    teacherId,
    loginId,
    password,
    status: "Active",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  store.teachers[teacherId] = cred;
  write(store);
  saveCredToSupabase(cred);

  await createTeacherAuthAccount({
    teacherId,
    loginId,
    password,
    name: teacher.name || "Teacher",
    email: teacher.email || `${loginId.toLowerCase()}@sunshineschool.edu`,
    mobile: teacher.phone,
  });

  return cred;
}

export async function resetTeacherPassword(teacherId: string): Promise<TeacherCredential> {
  const store = read();
  const existing = store.teachers[teacherId];
  if (!existing) {
    return generateTeacherCredential(teacherId);
  }
  const newPassword = generatePassword();
  const updated: TeacherCredential = {
    ...existing,
    password: newPassword,
    status: "Active",
    updatedAt: new Date().toISOString(),
  };
  store.teachers[teacherId] = updated;
  write(store);
  saveCredToSupabase(updated);

  await createTeacherAuthAccount({
    teacherId,
    loginId: updated.loginId,
    password: newPassword,
    name: "Teacher",
    email: `${updated.loginId.toLowerCase()}@sunshineschool.edu`,
  });

  return updated;
}

export function setTeacherStatus(teacherId: string, status: CredentialStatus) {
  const store = read();
  const existing = store.teachers[teacherId];
  if (!existing) return;
  const updated = { ...existing, status, updatedAt: new Date().toISOString() };
  store.teachers[teacherId] = updated;
  write(store);
  saveCredToSupabase(updated);
  notifyAutoRefresh("staff");
  Promise.resolve(supabase.from("users").update({ status: status.toLowerCase() }).eq("login_id", existing.loginId)).catch(() => {});
  Promise.resolve(supabase.from("gv_users").update({ status: status.toLowerCase() }).eq("login_id", existing.loginId)).catch(() => {});
}
