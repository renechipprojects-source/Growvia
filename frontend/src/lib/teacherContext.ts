import type { Student } from "./mockData";
import { readAssignments, type ClassAssignment } from "./classAssignmentContext";
import { getSession, safeNormalizeId } from "./auth";

export type AssignmentType = "class" | "subject";

export interface TeacherAssignment {
  id: string;
  type: AssignmentType;
  className: string;
  section: string;
  subject?: string;
}

export function normalizeClassAndSection(rawClass?: string, rawSec?: string): { className: string; section: string } {
  let cls = (rawClass || "").trim();
  let sec = (rawSec || "").trim().toUpperCase();

  if (cls) {
    const match = cls.match(/^(.*?)[-–_\s]+([A-D])$/i);
    if (match) {
      cls = match[1].trim();
      if (!sec || sec === "A") {
        sec = match[2].toUpperCase();
      }
    }
  }

  return {
    className: cls || "Nursery",
    section: sec || "A",
  };
}

function toTeacherAssignment(a: ClassAssignment): TeacherAssignment {
  const norm = normalizeClassAndSection(a.className, a.section);
  return { id: a.id, type: a.role, className: norm.className, section: norm.section, subject: a.subject };
}

function myActive(customAssignments?: ClassAssignment[]): ClassAssignment[] {
  const session = getSession();
  const activeId = safeNormalizeId(session?.linkId || session?.loginId);
  const activeName = (session?.name || "").trim().toLowerCase();

  const sourceList = customAssignments && customAssignments.length > 0 ? customAssignments : readAssignments();

  const assignments = sourceList.filter(
    (a) =>
      a.status === "active" &&
      ((activeId && safeNormalizeId(a.teacherId) === activeId) ||
        (activeId && safeNormalizeId(a.id) === activeId) ||
        (activeName && a.teacherName.trim().toLowerCase() === activeName))
  );

  const sessAny = session as any;
  if (assignments.length === 0 && (sessAny?.className || sessAny?.class_name)) {
    const rawClass = (sessAny.className || sessAny.class_name || "").trim();
    const rawSection = (sessAny.section || "A").trim().toUpperCase();
    const norm = normalizeClassAndSection(rawClass, rawSection);
    return [
      {
        id: `ASG-${activeId || "TCH"}`,
        teacherId: activeId,
        teacherName: session?.name || "Teacher",
        role: "class",
        className: norm.className,
        section: norm.section,
        academicYear: "2026-2027",
        status: "active",
      },
    ];
  }

  return assignments.map((a) => {
    const norm = normalizeClassAndSection(a.className, a.section);
    return { ...a, className: norm.className, section: norm.section };
  });
}

export function getClassAssignments(customAssignments?: ClassAssignment[]): TeacherAssignment[] {
  return myActive(customAssignments).filter((a) => a.role === "class").map(toTeacherAssignment);
}

export function getSubjectAssignments(customAssignments?: ClassAssignment[]): TeacherAssignment[] {
  return myActive(customAssignments).filter((a) => a.role === "subject").map(toTeacherAssignment);
}

export function getAssignment(id: string, customAssignments?: ClassAssignment[]): TeacherAssignment | undefined {
  const list = customAssignments && customAssignments.length > 0 ? customAssignments : readAssignments();
  const found = list.find((a) => a.id === id);
  return found ? toTeacherAssignment(found) : undefined;
}

export function getStudentsForAssignment(a: TeacherAssignment, allStudents: Student[] = []): Student[] {
  if (!a || !allStudents.length) return [];
  const targetClass = (a.className || "").trim().toLowerCase();
  const targetSec = (a.section || "A").trim().toUpperCase();
  return allStudents.filter(
    (s) =>
      (s.className || "").trim().toLowerCase() === targetClass &&
      (s.section || "A").trim().toUpperCase() === targetSec
  );
}
