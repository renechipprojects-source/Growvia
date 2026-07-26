import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type AssignmentRole = "class" | "subject";
export type AssignmentStatus = "active" | "inactive";

export interface ClassAssignment {
  id: string;
  teacherId: string;
  teacherName: string;
  academicYear: string;
  role: AssignmentRole;
  className: string;
  section: string;
  subject?: string;
  status: AssignmentStatus;
}

const KEY = "sunshine.classAssignments.v1";

const SEED: ClassAssignment[] = [
  { id: "CA-1", teacherId: "TCH100", teacherName: "Mrs. Priya", academicYear: "2026-27", role: "class", className: "Nursery", section: "A", status: "active" },
  { id: "CA-2", teacherId: "TCH100", teacherName: "Mrs. Priya", academicYear: "2026-27", role: "subject", className: "LKG", section: "B", subject: "English", status: "active" },
  { id: "CA-3", teacherId: "TCH100", teacherName: "Mrs. Priya", academicYear: "2026-27", role: "subject", className: "UKG", section: "A", subject: "English", status: "active" },
  { id: "CA-4", teacherId: "TCH101", teacherName: "Ms. Anjali", academicYear: "2026-27", role: "class", className: "LKG", section: "A", status: "active" },
  { id: "CA-5", teacherId: "TCH102", teacherName: "Mr. Rakesh", academicYear: "2026-27", role: "class", className: "UKG", section: "B", status: "active" },
];

export function readAssignments(): ClassAssignment[] {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as ClassAssignment[];
  } catch { /* noop */ }
  window.localStorage.setItem(KEY, JSON.stringify(SEED));
  return SEED;
}

interface State {
  assignments: ClassAssignment[];
  create: (a: Omit<ClassAssignment, "id">) => void;
  update: (id: string, patch: Partial<ClassAssignment>) => void;
  remove: (id: string) => void;
  toggle: (id: string) => void;
  forTeacher: (teacherId: string) => ClassAssignment[];
}

const Ctx = createContext<State | null>(null);

export function ClassAssignmentProvider({ children }: { children: ReactNode }) {
  const [assignments, setAssignments] = useState<ClassAssignment[]>(() => readAssignments());

  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify(assignments));
  }, [assignments]);

  const create: State["create"] = useCallback((a) => {
    setAssignments((prev) => [{ ...a, id: `CA-${Date.now()}` }, ...prev]);
  }, []);
  const update: State["update"] = useCallback((id, patch) => {
    setAssignments((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }, []);
  const remove: State["remove"] = useCallback((id) => {
    setAssignments((prev) => prev.filter((a) => a.id !== id));
  }, []);
  const toggle: State["toggle"] = useCallback((id) => {
    setAssignments((prev) => prev.map((a) => (a.id === id ? { ...a, status: a.status === "active" ? "inactive" : "active" } : a)));
  }, []);
  const forTeacher = useCallback((teacherId: string) => assignments.filter((a) => a.teacherId === teacherId), [assignments]);

  const value = useMemo(() => ({ assignments, create, update, remove, toggle, forTeacher }), [assignments, create, update, remove, toggle, forTeacher]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useClassAssignments(): State {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useClassAssignments must be used inside <ClassAssignmentProvider>");
  return ctx;
}
