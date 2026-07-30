import type { Student } from "./mockData";
import { readAssignments, type ClassAssignment } from "./classAssignmentContext";

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
  return readAssignments().filter(
    (a) => a.teacherId === CURRENT_TEACHER.id && a.status === "active",
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
