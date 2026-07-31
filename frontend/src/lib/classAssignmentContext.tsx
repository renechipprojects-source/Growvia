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

export interface TeacherWorkload {
  teacherId: string;
  teacherName: string;
  classTeacherOf: string | null; // e.g. "LKG-A" or null
  subjectAssignments: { className: string; section: string; subject: string }[];
  totalClasses: number;
  totalSubjects: number;
}

const KEY = "sunshine.classAssignments.v1";

const SEED: ClassAssignment[] = [
  { id: "CA-1", teacherId: "TCH100", teacherName: "Mrs. Priya", academicYear: "2026-27", role: "class", className: "Nursery", section: "A", status: "active" },
  { id: "CA-2", teacherId: "TCH100", teacherName: "Mrs. Priya", academicYear: "2026-27", role: "subject", className: "UKG", section: "A", subject: "English", status: "active" },
  { id: "CA-3", teacherId: "TCH100", teacherName: "Mrs. Priya", academicYear: "2026-27", role: "subject", className: "UKG", section: "B", subject: "English", status: "active" },
  { id: "CA-4", teacherId: "TCH100", teacherName: "Mrs. Priya", academicYear: "2026-27", role: "subject", className: "Nursery", section: "A", subject: "Rhymes", status: "active" },
  { id: "CA-5", teacherId: "TCH101", teacherName: "Ms. Anjali", academicYear: "2026-27", role: "class", className: "LKG", section: "A", status: "active" },
  { id: "CA-6", teacherId: "TCH101", teacherName: "Ms. Anjali", academicYear: "2026-27", role: "subject", className: "LKG", section: "A", subject: "Drawing & Art", status: "active" },
  { id: "CA-7", teacherId: "TCH102", teacherName: "Mr. Rakesh", academicYear: "2026-27", role: "class", className: "UKG", section: "B", status: "active" },
  { id: "CA-8", teacherId: "TCH102", teacherName: "Mr. Rakesh", academicYear: "2026-27", role: "subject", className: "LKG", section: "A", subject: "Mathematics", status: "active" },
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
  getWorkload: (teacherIdOrName: string) => TeacherWorkload;
  getClassTeacher: (className: string, section: string) => ClassAssignment | null;
  getSubjectTeachers: (className: string, section: string) => ClassAssignment[];
}

const Ctx = createContext<State | null>(null);

export function ClassAssignmentProvider({ children }: { children: ReactNode }) {
  const [assignments, setAssignments] = useState<ClassAssignment[]>(() => readAssignments());

  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify(assignments));
  }, [assignments]);

  const create: State["create"] = useCallback((a) => {
    setAssignments((prev) => {
      let updated = [...prev];
      // Rule 1: If role === "class", deactivate any existing Class Teacher for same class & section OR same teacher
      if (a.role === "class" && a.status === "active") {
        updated = updated.map((item) => {
          if (
            item.role === "class" &&
            ((item.className.toLowerCase() === a.className.toLowerCase() && item.section.toUpperCase() === a.section.toUpperCase()) ||
             item.teacherId === a.teacherId || item.teacherName.toLowerCase() === a.teacherName.toLowerCase())
          ) {
            return { ...item, status: "inactive" };
          }
          return item;
        });
      }
      return [{ ...a, id: `CA-${Date.now()}` }, ...updated];
    });
  }, []);

  const update: State["update"] = useCallback((id, patch) => {
    setAssignments((prev) => {
      return prev.map((a) => {
        if (a.id === id) {
          const merged = { ...a, ...patch };
          return merged;
        }
        return a;
      });
    });
  }, []);

  const remove: State["remove"] = useCallback((id) => {
    setAssignments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const toggle: State["toggle"] = useCallback((id) => {
    setAssignments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: a.status === "active" ? "inactive" : "active" } : a))
    );
  }, []);

  const forTeacher = useCallback(
    (teacherIdOrName: string) =>
      assignments.filter(
        (a) =>
          a.status === "active" &&
          (a.teacherId === teacherIdOrName || a.teacherName.toLowerCase().includes(teacherIdOrName.toLowerCase()))
      ),
    [assignments]
  );

  const getWorkload = useCallback(
    (teacherIdOrName: string): TeacherWorkload => {
      const active = assignments.filter(
        (a) =>
          a.status === "active" &&
          (a.teacherId === teacherIdOrName || a.teacherName.toLowerCase().includes(teacherIdOrName.toLowerCase()))
      );

      const classRoleItem = active.find((a) => a.role === "class");
      const classTeacherOf = classRoleItem ? `${classRoleItem.className}-${classRoleItem.section}` : null;

      const subjectAssignments = active
        .filter((a) => a.role === "subject" && a.subject)
        .map((a) => ({ className: a.className, section: a.section, subject: a.subject! }));

      const uniqueClasses = new Set<string>();
      if (classRoleItem) uniqueClasses.add(`${classRoleItem.className}-${classRoleItem.section}`);
      subjectAssignments.forEach((s) => uniqueClasses.add(`${s.className}-${s.section}`));

      return {
        teacherId: teacherIdOrName,
        teacherName: active[0]?.teacherName || teacherIdOrName,
        classTeacherOf,
        subjectAssignments,
        totalClasses: uniqueClasses.size,
        totalSubjects: subjectAssignments.length,
      };
    },
    [assignments]
  );

  const getClassTeacher = useCallback(
    (className: string, section: string): ClassAssignment | null => {
      return (
        assignments.find(
          (a) =>
            a.status === "active" &&
            a.role === "class" &&
            a.className.toLowerCase() === className.toLowerCase() &&
            (a.section.toUpperCase() === section.toUpperCase() || !section)
        ) || null
      );
    },
    [assignments]
  );

  const getSubjectTeachers = useCallback(
    (className: string, section: string): ClassAssignment[] => {
      return assignments.filter(
        (a) =>
          a.status === "active" &&
          a.role === "subject" &&
          a.className.toLowerCase() === className.toLowerCase() &&
          (a.section.toUpperCase() === section.toUpperCase() || !section)
      );
    },
    [assignments]
  );

  const value = useMemo(
    () => ({
      assignments,
      create,
      update,
      remove,
      toggle,
      forTeacher,
      getWorkload,
      getClassTeacher,
      getSubjectTeachers,
    }),
    [assignments, create, update, remove, toggle, forTeacher, getWorkload, getClassTeacher, getSubjectTeachers]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useClassAssignments(): State {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useClassAssignments must be used inside <ClassAssignmentProvider>");
  return ctx;
}
