import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";

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
  classTeacherOf: string | null;
  subjectAssignments: { className: string; section: string; subject: string }[];
  totalClasses: number;
  totalSubjects: number;
}

let memoryAssignmentsCache: ClassAssignment[] = [];

export function readAssignments(): ClassAssignment[] {
  return memoryAssignmentsCache;
}

export async function fetchAssignmentsFromSupabase(): Promise<ClassAssignment[]> {
  try {
    const { data, error } = await supabase
      .from("gv_requests")
      .select("*")
      .eq("request_type", "class_assignment");

    if (error || !data) {
      memoryAssignmentsCache = [];
      return [];
    }

    const mapped: ClassAssignment[] = data.map((d: any) => {
      let meta: any = {};
      try {
        if (d.reason_or_notes && (d.reason_or_notes.startsWith("{") || d.reason_or_notes.startsWith("["))) {
          meta = JSON.parse(d.reason_or_notes);
        }
      } catch {}

      return {
        id: d.id,
        teacherId: meta.teacherId || d.applicant_or_child_name || "TCH100",
        teacherName: d.applicant_or_child_name || meta.teacherName || "Teacher",
        academicYear: meta.academicYear || "2026-27",
        role: meta.role || "class",
        className: d.class_name || meta.className || "Nursery",
        section: d.section || meta.section || "A",
        subject: meta.subject,
        status: (d.status as any) || meta.status || "active",
      };
    });

    memoryAssignmentsCache = mapped;
    return mapped;
  } catch {
    memoryAssignmentsCache = [];
    return [];
  }
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
  const [assignments, setAssignments] = useState<ClassAssignment[]>(() => memoryAssignmentsCache);

  useEffect(() => {
    fetchAssignmentsFromSupabase().then((res) => {
      setAssignments(res || []);
    });
  }, []);

  const saveToSupabase = (newItems: ClassAssignment[]) => {
    memoryAssignmentsCache = newItems;
    const payloads = newItems.map((a) => ({
      id: a.id,
      request_type: "class_assignment",
      applicant_or_child_name: a.teacherName,
      class_name: a.className,
      section: a.section,
      status: a.status,
      reason_or_notes: JSON.stringify(a),
    }));
    Promise.resolve(supabase.from("gv_requests").upsert(payloads)).catch(() => {});
  };

  const create: State["create"] = useCallback((a) => {
    setAssignments((prev) => {
      let updated = [...prev];
      if (a.role === "class" && a.status === "active") {
        updated = updated.map((item) => {
          if (
            item.role === "class" &&
            ((item.className.toLowerCase() === a.className.toLowerCase() && item.section.toUpperCase() === a.section.toUpperCase()) ||
             item.teacherId === a.teacherId || item.teacherName.toLowerCase() === a.teacherName.toLowerCase())
          ) {
            return { ...item, status: "inactive" as AssignmentStatus };
          }
          return item;
        });
      }
      const next = [{ ...a, id: `CA-${Date.now()}` }, ...updated];
      saveToSupabase(next);
      return next;
    });
  }, []);

  const update: State["update"] = useCallback((id, patch) => {
    setAssignments((prev) => {
      const next = prev.map((a) => (a.id === id ? { ...a, ...patch } : a));
      saveToSupabase(next);
      return next;
    });
  }, []);

  const remove: State["remove"] = useCallback((id) => {
    setAssignments((prev) => {
      const next = prev.filter((a) => a.id !== id);
      saveToSupabase(next);
      Promise.resolve(supabase.from("gv_requests").delete().eq("id", id)).catch(() => {});
      return next;
    });
  }, []);

  const toggle: State["toggle"] = useCallback((id) => {
    setAssignments((prev) => {
      const next = prev.map((a) => (a.id === id ? { ...a, status: a.status === "active" ? "inactive" : "active" as AssignmentStatus } : a));
      saveToSupabase(next);
      return next;
    });
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
      const ct = active.find((a) => a.role === "class");
      const sub = active.filter((a) => a.role === "subject").map((a) => ({ className: a.className, section: a.section, subject: a.subject || "General" }));
      return {
        teacherId: ct?.teacherId || active[0]?.teacherId || teacherIdOrName,
        teacherName: ct?.teacherName || active[0]?.teacherName || teacherIdOrName,
        classTeacherOf: ct ? `${ct.className}-${ct.section}` : null,
        subjectAssignments: sub,
        totalClasses: active.length,
        totalSubjects: sub.length,
      };
    },
    [assignments]
  );

  const getClassTeacher = useCallback(
    (className: string, section: string) => {
      return (
        assignments.find(
          (a) =>
            a.role === "class" &&
            a.status === "active" &&
            a.className.toLowerCase() === className.toLowerCase() &&
            a.section.toUpperCase() === section.toUpperCase()
        ) || null
      );
    },
    [assignments]
  );

  const getSubjectTeachers = useCallback(
    (className: string, section: string) => {
      return assignments.filter(
        (a) =>
          a.role === "subject" &&
          a.status === "active" &&
          a.className.toLowerCase() === className.toLowerCase() &&
          a.section.toUpperCase() === section.toUpperCase()
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

export function useClassAssignments() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useClassAssignments must be used inside ClassAssignmentProvider");
  return ctx;
}
