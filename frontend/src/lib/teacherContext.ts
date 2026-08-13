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
  if (assignments.length === 0 && sessAny?.className) {
    const parts = sessAny.className.trim().split(" ");
    const name = parts[0] || sessAny.className;
    const sec = parts[1] || sessAny.section || "A";
    return [
      {
        id: `ASG-${activeId || "TCH"}`,
        teacherId: activeId,
        teacherName: activeName || "Teacher",
        role: "class",
        className: name,
        section: sec,
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
  return allStudents.filter(
    (s) => s.className.toLowerCase() === a.className.toLowerCase() && (!a.section || s.section.toUpperCase() === a.section.toUpperCase())
  );
}
