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
    const match = cls.match(/^(.*?)[-–_\s]+([A-Z])$/i);
    if (match) {
      cls = match[1].trim();
      if (!sec || sec === "A") {
        sec = match[2].toUpperCase();
      }
    }
  }

  const cleanClass = cls ? cls.toUpperCase() : "NURSERY";
  const cleanSec = sec || "A";

  return {
    className: cleanClass,
    section: cleanSec,
  };
}

function toTeacherAssignment(a: ClassAssignment): TeacherAssignment {
  const norm = normalizeClassAndSection(a.className, a.section);
  return { id: a.id, type: a.role, className: norm.className, section: norm.section, subject: a.subject };
}

function sanitizeName(str?: string): string {
  return (str || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

function myActive(customAssignments?: ClassAssignment[]): ClassAssignment[] {
  const session = getSession();
  const activeLinkId = sanitizeName(session?.linkId);
  const activeLoginId = sanitizeName(session?.loginId);
  const activeName = sanitizeName(session?.name);

  const sourceList = customAssignments && customAssignments.length > 0 ? customAssignments : readAssignments();

  const assignments = sourceList.filter((a) => {
    if (a.status !== "active") return false;
    const aTeacherId = sanitizeName(a.teacherId);
    const aTeacherName = sanitizeName(a.teacherName);
    const aId = sanitizeName(a.id);

    const idMatch =
      (activeLinkId && aTeacherId === activeLinkId) ||
      (activeLoginId && aTeacherId === activeLoginId) ||
      (activeLinkId && aId === activeLinkId) ||
      (activeLoginId && aId === activeLoginId);

    const nameMatch =
      activeName &&
      aTeacherName &&
      (aTeacherName === activeName || aTeacherName.includes(activeName) || activeName.includes(aTeacherName));

    return Boolean(idMatch || nameMatch);
  });

  const sessAny = session as any;
  const rawClass = (sessAny?.className || sessAny?.class_name || "").trim();
  if (assignments.length === 0 && rawClass && rawClass.toLowerCase() !== "null") {
    const rawSection = (sessAny.section || "A").trim().toUpperCase();
    const norm = normalizeClassAndSection(rawClass, rawSection);
    return [
      {
        id: `ASG-${session?.loginId || session?.linkId || "TCH"}`,
        teacherId: session?.linkId || session?.loginId || "TCH",
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

export function getLiveTeacherRoster(teacherClass?: string, teacherSec?: string, students: Student[] = []): Student[] {
  if (!teacherClass || !students.length) return [];
  const teacherNorm = normalizeClassAndSection(teacherClass, teacherSec);

  return students.filter((s) => {
    const studentNorm = normalizeClassAndSection(s.className, s.section);
    return (
      studentNorm.className === teacherNorm.className &&
      studentNorm.section === teacherNorm.section
    );
  });
}

export function getStudentsForAssignment(a: TeacherAssignment, allStudents: Student[] = []): Student[] {
  if (!a || !allStudents.length) return [];
  return getLiveTeacherRoster(a.className, a.section, allStudents);
}
