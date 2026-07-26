// Shared credentials store for generated Teacher and Parent logins.
// Persisted in localStorage so Office-issued credentials survive reloads
// and can be used from the shared /login page. Mock/demo-only — a real
// deployment would hold these server-side with hashed passwords.

import { STUDENTS, TEACHERS, getHousehold, type Student, type Teacher } from "@/lib/mockData";
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

// Admission numbers look like "SUN/26-2001". Strip non-alphanumerics for a
// cleaner login id (SUN26-2001 → SUN262001).
export function suggestParentLoginId(student: Student): string {
  const cleaned = student.admissionNo.replace(/[^A-Za-z0-9]/g, "");
  return cleaned.toUpperCase();
}

export function alternativeParentLoginId(student: Student): string {
  // Digits only, last 10, so both "+91 90..." and "9012345678" collapse.
  const digits = student.phone.replace(/\D/g, "");
  return digits.slice(-10) || student.phone;
}

export function suggestTeacherLoginId(teacher: Teacher): string {
  return teacher.id.toUpperCase(); // e.g. TCH100
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
  opts?: { loginIdBasis?: "admission" | "mobile"; customLoginId?: string; password?: string },
): ParentCredential {
  const student = STUDENTS.find((s) => s.id === studentId);
  if (!student) throw new Error("Student not found");
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
  Promise.resolve(supabase.from("profiles").insert([{
    login_id: loginId,
    role: "parent",
    full_name: student.parent,
    email: `${loginId.toLowerCase()}@sunshine.edu`,
    mobile: student.phone,
    status: "active"
  }])).catch(() => {});
  return cred;
}

export function resetParentPassword(studentId: string): ParentCredential {
  const store = read();
  const existing = store.parents[studentId];
  if (!existing) throw new Error("No credential to reset");
  const updated: ParentCredential = { ...existing, password: generatePassword(), status: "Active", updatedAt: new Date().toISOString() };
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
}

// ─── Teacher CRUD ───────────────────────────────────────────────────────────

export function listTeacherCredentials(): TeacherCredential[] {
  return Object.values(read().teachers);
}

export function getTeacherCredential(teacherId: string): TeacherCredential | undefined {
  return read().teachers[teacherId];
}

export function generateTeacherCredential(
  teacherId: string,
  opts?: { customLoginId?: string; password?: string },
): TeacherCredential {
  const teacher = TEACHERS.find((t) => t.id === teacherId);
  if (!teacher) throw new Error("Teacher not found");
  const now = new Date().toISOString();
  const store = read();
  const existing = store.teachers[teacherId];
  const cred: TeacherCredential = {
    kind: "teacher",
    teacherId,
    loginId: opts?.customLoginId?.trim() || suggestTeacherLoginId(teacher),
    password: opts?.password ?? generatePassword(),
    status: "Active",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  store.teachers[teacherId] = cred;
  write(store);
  Promise.resolve(supabase.from("profiles").insert([{
    login_id: cred.loginId,
    role: "teacher",
    full_name: teacher.name,
    email: teacher.email,
    mobile: teacher.phone,
    status: "active"
  }])).catch(() => {});
  return cred;
}

export function resetTeacherPassword(teacherId: string): TeacherCredential {
  const store = read();
  const existing = store.teachers[teacherId];
  if (!existing) throw new Error("No credential to reset");
  const updated: TeacherCredential = { ...existing, password: generatePassword(), status: "Active", updatedAt: new Date().toISOString() };
  store.teachers[teacherId] = updated;
  write(store);
  return updated;
}

export function setTeacherStatus(teacherId: string, status: CredentialStatus) {
  const store = read();
  const existing = store.teachers[teacherId];
  if (!existing) return;
  store.teachers[teacherId] = { ...existing, status, updatedAt: new Date().toISOString() };
  write(store);
}

// ─── Authentication (used by the shared login page) ─────────────────────────

export interface AuthResolvedIdentity {
  role: Role;
  name: string;
  loginId: string;
  linkId: string; // studentId for parents, teacherId for teachers
}

export function authenticateGenerated(loginId: string, password: string): AuthResolvedIdentity | null {
  const id = loginId.trim();
  if (!id || !password) return null;
  const store = read();

  const parent = Object.values(store.parents).find((c) => c.loginId.toLowerCase() === id.toLowerCase());
  if (parent) {
    if (parent.status !== "Active") return null;
    if (parent.password !== password) return null;
    const student = STUDENTS.find((s) => s.id === parent.studentId);
    const household = student ? getHousehold(student.parentId) : undefined;
    return {
      role: "parent",
      name: household?.primaryContact ?? student?.parent ?? "Parent",
      loginId: parent.loginId,
      linkId: parent.studentId,
    };
  }

  const teacher = Object.values(store.teachers).find((c) => c.loginId.toLowerCase() === id.toLowerCase());
  if (teacher) {
    if (teacher.status !== "Active") return null;
    if (teacher.password !== password) return null;
    const t = TEACHERS.find((x) => x.id === teacher.teacherId);
    return {
      role: "teacher",
      name: t?.name ?? "Teacher",
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
