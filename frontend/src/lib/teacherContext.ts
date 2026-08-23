import type { Student } from "./mockData";
import { readAssignments, type ClassAssignment } from "./classAssignmentContext";
import { getSession } from "./auth";

export type AssignmentType = "class" | "subject";

export interface TeacherAssignment {
  id: string;
  type: AssignmentType;
  className: string;
  section: string;
  subject?: string;
}

function toTeacherAssignment(a: ClassAssignment): TeacherAssignment {
  return { id: a.id, type: a.role, className: a.className, section: a.section, subject: a.subject };
}

function myActive(): ClassAssignment[] {
  const session = getSession();
  const activeId = session?.linkId || session?.loginId || "";
  const activeName = session?.name || "";

  const assignments = readAssignments().filter(
    (a) =>
      a.status === "active" &&
      ((activeId && a.teacherId === activeId) ||
        (activeName && a.teacherName.toLowerCase() === activeName.toLowerCase()))
  );

  const sessAny = session as any;
  if (assignments.length === 0 && (sessAny?.className || sessAny?.class_name)) {
    const rawClass = (sessAny.className || sessAny.class_name || "").trim();
    const rawSection = (sessAny.section || "A").trim().toUpperCase();
    return [
      {
        id: `ASG-${activeId || "TCH"}`,
        teacherId: activeId,
        teacherName: activeName || "Teacher",
        role: "class",
        className: rawClass,
        section: rawSection,
        academicYear: "2026-2027",
        status: "active",
      },
    ];
  }

  return assignments;
}

export function getClassAssignments(): TeacherAssignment[] {
  return myActive().filter((a) => a.role === "class").map(toTeacherAssignment);
}

export function getSubjectAssignments(): TeacherAssignment[] {
  return myActive().filter((a) => a.role === "subject").map(toTeacherAssignment);
}

export function getAssignment(id: string): TeacherAssignment | undefined {
  const found = readAssignments().find((a) => a.id === id);
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
