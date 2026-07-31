// Shared credentials store for generated Teacher and Parent logins.
// Persisted in localStorage so Office-issued credentials survive reloads
// and can be used from the shared /login page.

import type { Student, Teacher } from "@/lib/mockData";
import type { Role } from "@/lib/roleConfig";
import { supabase } from "@/lib/supabase";

const KEY = "sunshine.credentials.v1";

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

function empty(): Store {
  return { parents: {}, teachers: {} };
}

function read(): Store {
  if (typeof window === "undefined") return empty();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as Partial<Store>;
    return { parents: parsed.parents ?? {}, teachers: parsed.teachers ?? {} };
  } catch {
    return empty();
  }
}

function write(store: Store) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(store));
  window.dispatchEvent(new CustomEvent("sunshine:credentials"));
}

// ─── Suggestions ────────────────────────────────────────────────────────────

export function suggestParentLoginId(student: Partial<Student>): string {
  const adm = student.admissionNo || student.id || "ADM1001";
  const cleaned = adm.replace(/[^A-Za-z0-9]/g, "");
  return cleaned.toUpperCase();
}

export function alternativeParentLoginId(student: Partial<Student>): string {
  const phone = student.phone || "9876543210";
  const digits = phone.replace(/\D/g, "");
  return digits.slice(-10) || phone;
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
    admissionNo: `ADM-${studentId}`,
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

  Promise.resolve(
    supabase.from("profiles").upsert([{
      login_id: loginId,
      role: "parent",
      full_name: student.parent || "Parent",
      email: `${loginId.toLowerCase()}@sunshine.edu`,
      mobile: student.phone || "9876543210",
      status: "active",
    }])
  ).catch(() => {});

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
  return updated;
}

export function setParentStatus(studentId: string, status: CredentialStatus) {
  const store = read();
  const existing = store.parents[studentId];
  if (!existing) return;
  store.parents[studentId] = { ...existing, status, updatedAt: new Date().toISOString() };
  write(store);
  Promise.resolve(supabase.from("profiles").update({ status: status.toLowerCase() }).eq("login_id", existing.loginId)).catch(() => {});
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
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id, auth_user_id")
      .eq("login_id", loginId)
      .maybeSingle();

    if (existingProfile) {
      await supabase
        .from("profiles")
        .update(profilePayload)
        .eq("login_id", loginId);
    } else {
      await supabase.from("profiles").upsert([profilePayload]);
    }
  } catch (err) {
    console.warn("Supabase profile upsert notice:", err);
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

  Promise.resolve(
    createTeacherAuthAccount({
      teacherId,
      loginId,
      password,
      name: teacher.name || "Teacher",
      email: teacher.email || `${loginId.toLowerCase()}@sunshine.edu`,
      mobile: teacher.phone,
    })
  ).catch(() => {});

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
  store.teachers[teacherId] = { ...existing, status, updatedAt: new Date().toISOString() };
  write(store);
  Promise.resolve(supabase.from("profiles").update({ status: status.toLowerCase() }).eq("login_id", existing.loginId)).catch(() => {});
}

// ─── Authentication (used by shared login page) ─────────────────────────

export interface AuthResolvedIdentity {
  role: Role;
  name: string;
  loginId: string;
  linkId: string;
}

export function authenticateGenerated(loginId: string, password: string): AuthResolvedIdentity | null {
  const id = loginId.trim();
  if (!id || !password) return null;
  const store = read();

  const parent = Object.values(store.parents).find((c) => c.loginId.toLowerCase() === id.toLowerCase());
  if (parent) {
    if (parent.status !== "Active") return null;
    if (parent.password !== password) return null;
    return {
      role: "parent",
      name: "Parent User",
      loginId: parent.loginId,
      linkId: parent.studentId,
    };
  }

  const teacher = Object.values(store.teachers).find((c) => c.loginId.toLowerCase() === id.toLowerCase());
  if (teacher) {
    if (teacher.status !== "Active") return null;
    if (teacher.password !== password) return null;
    return {
      role: "teacher",
      name: "Teacher User",
      loginId: teacher.loginId,
      linkId: teacher.teacherId,
    };
  }

  return null;
}

// Subscribe to changes across tabs / same-tab updates.
export function subscribeCredentials(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onCustom = () => cb();
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) cb(); };
  window.addEventListener("sunshine:credentials", onCustom);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener("sunshine:credentials", onCustom);
    window.removeEventListener("storage", onStorage);
  };
}
