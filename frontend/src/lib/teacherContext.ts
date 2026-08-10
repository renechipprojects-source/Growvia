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

// Current signed-in teacher context
export const CURRENT_TEACHER = {
  id: "TCH100",
  name: "Mrs. Priya",
};

function toTeacherAssignment(a: ClassAssignment): TeacherAssignment {
  return { id: a.id, type: a.role, className: a.className, section: a.section, subject: a.subject };
}

function myActive(): ClassAssignment[] {
  const session = getSession();
  const activeId = session?.linkId || session?.loginId || CURRENT_TEACHER.id;
  const activeName = session?.name || CURRENT_TEACHER.name;
  return readAssignments().filter(
    (a) =>
      a.status === "active" &&
      (a.teacherId === activeId ||
        a.teacherName.toLowerCase() === activeName.toLowerCase() ||
        a.teacherId === CURRENT_TEACHER.id)
  );
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

export function getStudentsForAssignment(a: TeacherAssignment): Student[] {
  return [];
}
