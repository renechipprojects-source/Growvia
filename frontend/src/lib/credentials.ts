// Shared credentials store for generated Teacher and Parent logins.
// Persisted in localStorage so Office-issued credentials survive reloads
// and can be used from the shared /login page.

import type { Student, Teacher } from "@/lib/mockData";
import type { Role } from "@/lib/roleConfig";
import { supabase } from "@/lib/supabase";
import { notifyAutoRefresh } from "./autoRefreshContext";

export function generateCanonicalAdmissionNo(year: number = 2026, sequence: number = 1): string {
  const yy = String(year).slice(-2);
  const nnnn = String(Math.max(1, sequence)).padStart(4, "0");
  return `${yy}${nnnn}`;
}

export function toCanonicalAdmissionNo(rawNo?: string | number, id?: string | number, joinYear?: number | string): string {
  const str = String(rawNo ?? "").trim();

  // If already exactly 6 numeric digits, return immediately
  if (/^\d{6}$/.test(str)) {
    return str;
  }

  // Extract all digits from rawNo or fallback id
  const digitsOnly = str.replace(/\D/g, "") || String(id ?? "").replace(/\D/g, "");

  // Determine YY (Joining Year)
  let yy = "26";
  if (joinYear !== undefined && joinYear !== null && String(joinYear).trim() !== "") {
    yy = String(joinYear).trim().slice(-2);
  } else if (digitsOnly.length === 8 && (digitsOnly.startsWith("202") || digitsOnly.startsWith("203"))) {
    // e.g. 20260001 -> 26, 20270001 -> 27
    yy = digitsOnly.slice(2, 4);
  } else if (digitsOnly.length === 6 && (digitsOnly.startsWith("24") || digitsOnly.startsWith("25") || digitsOnly.startsWith("26") || digitsOnly.startsWith("27") || digitsOnly.startsWith("28") || digitsOnly.startsWith("29") || digitsOnly.startsWith("30"))) {
    // e.g. 270001 -> 27, 260005 -> 26
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

  // Determine Sequence NNNN
  let seq = 1;
  if (digitsOnly.length >= 4) {
    const rawSeq = parseInt(digitsOnly.slice(-4), 10);
    seq = isNaN(rawSeq) || rawSeq === 0 ? 1 : rawSeq;
  } else if (digitsOnly.length > 0) {
    const rawSeq = parseInt(digitsOnly, 10);
    seq = isNaN(rawSeq) || rawSeq === 0 ? 1 : rawSeq;
  }

  if (seq > 9999) {
    seq = (seq % 9999) || 1;
  }

  return `${yy}${String(seq).padStart(4, "0")}`;
}



export type CredentialStatus = "Active" | "Inactive";

export interface ParentCredential {
  kind: "parent";
  studentId: string;      // primary linkage — one credential per student/child
  loginId: string;        // suggested from admission number or parent mobile
  password: string;
  status: CredentialStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TeacherCredential {
  kind: "teacher";
  teacherId: string;      // employee/teacher code (TCH###)
  loginId: string;        // suggested from employee id
  password: string;
  status: CredentialStatus;
  createdAt: string;
  updatedAt: string;
}

export type AnyCredential = ParentCredential | TeacherCredential;

interface Store {
  parents: Record<string, ParentCredential>;   // key: studentId
  teachers: Record<string, TeacherCredential>; // key: teacherId
}

const STORAGE_KEY = "sunshine.credentials.v3";

const defaultParents: Record<string, ParentCredential> = {};

const defaultTeachers: Record<string, TeacherCredential> = {};

let memoryCredentialsStore: Store = { parents: defaultParents, teachers: defaultTeachers };

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
  // Strip password — never persist plaintext passwords to the database
  const { password: _omitted, ...safeFields } = cred;
  const payload = {
    id: `cred_${cred.kind}_${key}`,
    request_type: "generated_credential",
    applicant_or_child_name: cred.loginId,
    status: cred.status,
    reason_or_notes: JSON.stringify(safeFields),
  };
  Promise.resolve(supabase.from("gv_requests").upsert([payload])).catch(() => {});
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
              store.parents[cred.studentId] = cred;
              updated = true;
            } else if (cred.kind === "teacher" && cred.teacherId) {
              store.teachers[cred.teacherId] = cred;
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

// ─── Suggestions ────────────────────────────────────────────────────────────

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
    if (fallbackId && !UUID_PATTERN.test(fallbackId.trim())) {
      return fallbackId;
    }
    return "Assigned Teacher";
  }
  const trimmed = rawName.trim();
  if (UUID_PATTERN.test(trimmed)) {
    if (fallbackId && !UUID_PATTERN.test(fallbackId.trim())) {
      return fallbackId;
    }
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

export function generateParentCredential(
  studentId: string,
  opts?: { loginIdBasis?: "admission" | "mobile"; customLoginId?: string; password?: string; student?: Student },
): ParentCredential {
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

  const cleanPhone = (student.phone || "").replace(/\D/g, "");
  const parentUserId =
    student.parentId ||
    (cleanPhone.length >= 10 ? `PAR-${cleanPhone.slice(-10)}` : `PAR-${loginId.toUpperCase()}`);

  const parentPayload = {
    id: parentUserId,
    auth_user_id: parentUserId,
    login_id: loginId,
    role: "parent",
    full_name: student.parent || "Parent User",
    email: `${loginId.toLowerCase()}@growvia.edu`,
    mobile: student.phone || "9876543210",
    status: "active",
    must_change_password: false,
  };

  Promise.resolve(
    supabase.from("gv_users").upsert([parentPayload], { onConflict: "login_id" })
  ).catch(() => {});

  const provisionPromise = import("./supabaseAuth").then(({ triggerServerUserProvisioning }) =>
    triggerServerUserProvisioning({
      login_id: loginId,
      password: cred.password,
      role: "parent",
      email: `${loginId.toLowerCase()}@growvia.edu`,
      name: student.parent || "Parent User",
    })
  );
  (cred as any)._provisionPromise = provisionPromise;

  return cred;
}

export function resetParentPassword(studentId: string): ParentCredential {
  const store = read();
  const existing = store.parents[studentId];
  if (!existing) {
    return generateParentCredential(studentId);
  }
  const updated: ParentCredential = {
    ...existing,
    password: generatePassword(),
    status: "Active",
    updatedAt: new Date().toISOString(),
  };
  store.parents[studentId] = updated;
  write(store);
  saveCredToSupabase(updated);
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
  const teacherEmail = (email && email.includes("@")) ? email.trim() : `${loginId.toLowerCase()}@sunshine.edu`;

  let authUserId: string | null = null;

  try {
    const { data: authData } = await supabase.auth.signUp({
      email: teacherEmail,
      password: password,
      options: {
        data: {
          full_name: name,
          role: "teacher",
          login_id: loginId,
        },
      },
    });

    if (authData?.user?.id) {
      authUserId = authData.user.id;
    }
  } catch (e) {
    console.warn("Supabase Auth teacher signUp notice:", e);
  }

  // Always invoke server-side provisioning to ensure auth.users record is created & active
  try {
    const { triggerServerUserProvisioning } = await import("./supabaseAuth");
    const serverRes = await triggerServerUserProvisioning({
      login_id: loginId,
      email: teacherEmail,
      password: password,
      role: "teacher",
      name: name,
    });
    if (serverRes?.data?.authUserId) {
      authUserId = serverRes.data.authUserId;
    }
  } catch {}

  const profilePayload: any = {
    login_id: loginId,
    role: "teacher",
    full_name: name || "Teacher",
    email: teacherEmail,
    mobile: mobile || "9876543210",
    status: "active",
    must_change_password: false,
  };

  if (authUserId) {
    profilePayload.id = authUserId;
    profilePayload.auth_user_id = authUserId;
  }

  try {
    let { data: existingUser } = await supabase
      .from("gv_users")
      .select("id, auth_user_id")
      .eq("login_id", loginId)
      .maybeSingle();

    if (!existingUser) {
      const fallbackUserRes = await supabase.from("users").select("id, auth_user_id").eq("login_id", loginId).maybeSingle();
      if (fallbackUserRes.data) {
        existingUser = fallbackUserRes.data;
      }
    }

    if (existingUser) {
      await supabase
        .from("gv_users")
        .update(profilePayload)
        .eq("login_id", loginId);
      Promise.resolve(supabase.from("users").update(profilePayload).eq("login_id", loginId)).catch(() => {});
    } else {
      await supabase.from("gv_users").upsert([profilePayload]);
      Promise.resolve(supabase.from("users").upsert([profilePayload])).catch(() => {});
    }
    // Dual-write profiles for backward compatibility fallback
    Promise.resolve(supabase.from("gv_users").upsert([profilePayload])).catch(() => {});
  } catch (err) {
    console.warn("Supabase user upsert notice:", err);
  }

  return {
    loginId,
    email: teacherEmail,
    authUserId,
  };
}

export function generateTeacherCredential(
  teacherId: string,
  opts?: { customLoginId?: string; password?: string; teacher?: Teacher },
): TeacherCredential {
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

  const provisionPromise = createTeacherAuthAccount({
    teacherId,
    loginId,
    password,
    name: teacher.name || "Teacher",
    email: teacher.email || `${loginId.toLowerCase()}@sunshine.edu`,
    mobile: teacher.phone,
  });
  (cred as any)._provisionPromise = provisionPromise;

  return cred;
}

export function resetTeacherPassword(teacherId: string): TeacherCredential {
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

  Promise.resolve(
    createTeacherAuthAccount({
      teacherId,
      loginId: updated.loginId,
      password: newPassword,
      name: "Teacher",
      email: `${updated.loginId.toLowerCase()}@sunshine.edu`,
    })
  ).catch(() => {});

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
  Promise.resolve(supabase.from("gv_users").update({ status: status.toLowerCase() }).eq("login_id", existing.loginId)).catch(() => {});
}

// ─── Authentication (used by shared login page) ─────────────────────────

export interface AuthResolvedIdentity {
  role: Role;
  name: string;
  loginId: string;
  linkId: string;
}

export function authenticateGenerated(loginId: string, password: string): AuthResolvedIdentity | null {
  const id = loginId.trim().toLowerCase();
  const pw = password.trim();
  if (!id || !pw) return null;
  const store = read();

  const parent = Object.values(store.parents).find(
    (c) =>
      c.loginId.toLowerCase() === id ||
      c.studentId.toLowerCase() === id ||
      `par-${c.loginId.toLowerCase()}` === id
  );
  if (parent) {
    if (parent.status === "Active" && (parent.password === password || parent.password.trim() === pw)) {
      return {
        role: "parent",
        name: "Parent User",
        loginId: parent.loginId,
        linkId: parent.studentId,
      };
    }
  }

  const teacher = Object.values(store.teachers).find(
    (c) =>
      c.loginId.toLowerCase() === id ||
      c.teacherId.toLowerCase() === id ||
      `tch-${c.loginId.toLowerCase()}` === id
  );
  if (teacher) {
    if (teacher.status === "Active" && (teacher.password === password || teacher.password.trim() === pw)) {
      return {
        role: "teacher",
        name: "Teacher User",
        loginId: teacher.loginId,
        linkId: teacher.teacherId,
      };
    }
  }

  return null;
}

// Subscribe to changes across tabs / same-tab updates.
export function subscribeCredentials(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onCustom = () => cb();
  window.addEventListener("sunshine:credentials", onCustom);
  return () => {
    window.removeEventListener("sunshine:credentials", onCustom);
  };
}
