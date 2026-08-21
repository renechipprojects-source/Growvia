import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { sanitizeTeacherName } from "./credentials";
import { getStoredMasterClasses, saveStoredMasterClasses } from "./masterClassesStore";

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

const ASSIGNMENTS_STORAGE_KEY = "sunshine.class_assignments.v1";

export function getStoredAssignments(): ClassAssignment[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ASSIGNMENTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStoredAssignments(list: ClassAssignment[]) {
  memoryAssignmentsCache = list;
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ASSIGNMENTS_STORAGE_KEY, JSON.stringify(list));
  } catch {}
}

let memoryAssignmentsCache: ClassAssignment[] = getStoredAssignments();

export function readAssignments(): ClassAssignment[] {
  const stored = getStoredAssignments();
  if (stored.length > 0) {
    memoryAssignmentsCache = stored;
    return stored;
  }
  return memoryAssignmentsCache;
}

export async function fetchAssignmentsFromSupabase(): Promise<ClassAssignment[]> {
  const localItems = getStoredAssignments();
  try {
    const { data, error } = await supabase
      .from("gv_requests")
      .select("*")
      .eq("request_type", "class_assignment");

    if (!error && data && data.length > 0) {
      const mapped: ClassAssignment[] = data.map((d: any) => {
        let meta: any = {};
        try {
          if (d.reason_or_notes && (d.reason_or_notes.startsWith("{") || d.reason_or_notes.startsWith("["))) {
            meta = JSON.parse(d.reason_or_notes);
          }
        } catch {}

        const cleanName = sanitizeTeacherName(meta.teacherName || d.applicant_or_child_name, meta.teacherId || d.applicant_or_child_name);
        return {
          id: d.id,
          teacherId: meta.teacherId || "TCH100",
          teacherName: cleanName,
          academicYear: meta.academicYear || "2026-27",
          role: meta.role || "class",
          className: d.class_name || meta.className || "Nursery",
          section: d.section || meta.section || "A",
          subject: meta.subject,
          status: (d.status as any) || meta.status || "active",
        };
      });

      const combined = [...mapped];
      localItems.forEach((loc) => {
        if (!combined.some((c) => c.id === loc.id)) combined.push(loc);
      });

      memoryAssignmentsCache = combined;
      saveStoredAssignments(combined);
      return combined;
    }
  } catch {}

  memoryAssignmentsCache = localItems;
  return localItems;
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

import { subscribeToRealtimeTable } from "./realtimeService";

export function ClassAssignmentProvider({ children }: { children: ReactNode }) {
  const [assignments, setAssignments] = useState<ClassAssignment[]>(() => {
    const local = getStoredAssignments();
    return local.length > 0 ? local : memoryAssignmentsCache;
  });

  useEffect(() => {
    let isMounted = true;
    const refresh = () => {
      fetchAssignmentsFromSupabase().then((res) => {
        if (isMounted && res && res.length > 0) {
          setAssignments(res);
        }
      });
    };

    refresh();

    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && Array.isArray(customEvent.detail)) {
        setAssignments(customEvent.detail);
      } else {
        const latest = readAssignments();
        if (latest && latest.length > 0) setAssignments(latest);
      }
    };

    const handleModuleRefresh = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail?.module || detail.module === "assignments" || detail.module === "staff") {
        refresh();
      }
    };

    window.addEventListener("sunshine-class-assignment-update", handleUpdate);
    window.addEventListener("sunshine-module-refresh", handleModuleRefresh);

    const unsubscribe = subscribeToRealtimeTable({
      table: "gv_requests",
      onPayload: () => {
        if (isMounted) refresh();
      },
    });

    return () => {
      isMounted = false;
      window.removeEventListener("sunshine-class-assignment-update", handleUpdate);
      window.removeEventListener("sunshine-module-refresh", handleModuleRefresh);
      unsubscribe();
    };
  }, []);

  const saveToSupabase = (newItems: ClassAssignment[]) => {
    memoryAssignmentsCache = newItems;
    saveStoredAssignments(newItems);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("sunshine-class-assignment-update", { detail: newItems }));
    }

    const payloads = newItems.map((a) => {
      const cleanName = sanitizeTeacherName(a.teacherName, a.teacherId);
      const cleanItem = { ...a, teacherName: cleanName };
      return {
        id: a.id,
        request_type: "class_assignment",
        applicant_or_child_name: cleanName,
        leave_type_or_interested_class: `${a.className} ${a.section}`.trim(),
        status: a.status,
        reason_or_notes: JSON.stringify(cleanItem),
      };
    });

    Promise.resolve(supabase.from("gv_requests").upsert(payloads)).catch(() => {});

    newItems.forEach((a) => {
      if (a.role === "class" && a.status === "active") {
        const clsString = `${a.className} ${a.section}`.trim();
        const cleanName = sanitizeTeacherName(a.teacherName, a.teacherId);

        try {
          const currentMasters = getStoredMasterClasses();
          const matchIndex = currentMasters.findIndex(
            (m) => m.name.toLowerCase() === a.className.toLowerCase() && m.section.toUpperCase() === a.section.toUpperCase()
          );
          if (matchIndex >= 0 && currentMasters[matchIndex].classTeacher !== cleanName) {
            currentMasters[matchIndex].classTeacher = cleanName;
            currentMasters[matchIndex].teacherId = a.teacherId;
            saveStoredMasterClasses(currentMasters);
          }
        } catch {}

        if (a.teacherId) {
          supabase.from("gv_users").update({ class_name: clsString, section: a.section }).eq("id", a.teacherId).then(({ data, error }) => {
            if (error || !data || (Array.isArray(data) && data.length === 0)) {
              supabase.from("gv_users").update({ class_name: clsString, section: a.section }).eq("login_id", a.teacherId);
            }
          });
        }
        if (cleanName && cleanName !== "Select Teacher" && cleanName !== "Unassigned") {
          supabase.from("gv_users").update({ class_name: clsString, section: a.section }).eq("full_name", cleanName);
        }
      }
    });
  };

  const create: State["create"] = useCallback((a) => {
    setAssignments((prev) => {
      let updated = [...prev];
      if (a.role === "class" && a.status === "active") {
        updated = updated.map((item) => {
          if (
            item.role === "class" &&
            item.status === "active" &&
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
      let next = prev.map((a) => (a.id === id ? { ...a, ...patch } : a));
      const target = next.find((a) => a.id === id);
      if (target && target.role === "class" && target.status === "active") {
        next = next.map((item) => {
          if (
            item.id !== id &&
            item.role === "class" &&
            item.status === "active" &&
            ((item.className.toLowerCase() === target.className.toLowerCase() && item.section.toUpperCase() === target.section.toUpperCase()) ||
             item.teacherId === target.teacherId || item.teacherName.toLowerCase() === target.teacherName.toLowerCase())
          ) {
            return { ...item, status: "inactive" as AssignmentStatus };
          }
          return item;
        });
      }
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
