import { useState, useEffect } from "react";
import { STUDENTS } from "@/lib/mockData";

export interface StudentAttendanceEntry {
  id?: string;
  studentId: string;
  studentName: string;
  className: string;
  section: string;
  admissionNo?: string;
  rollNo?: number | string;
  parentName?: string;
  date: string;
  day?: string;
  status: "P" | "A" | "L" | "Lv";
  markedBy?: string;
  teacherId?: string;
  updatedAt: string;
}

const STORAGE_KEY = "sunshine.attendance.v1";
const EVENT_NAME = "sunshine-attendance-update";

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Seed realistic historical attendance for 30 days if empty
function generateInitialHistoricalAttendance(): StudentAttendanceEntry[] {
  let localStudents: any[] = [];
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("SUNSHINE_STUDENTS");
      if (raw) localStudents = JSON.parse(raw);
    } catch {}
  }
  const studentList = localStudents.length > 0 ? localStudents : STUDENTS;
  const entries: StudentAttendanceEntry[] = [];
  const today = new Date();

  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dayOfWeek = d.getDay();
    if (dayOfWeek === 0) continue; // Skip Sundays

    const dateStr = d.toISOString().slice(0, 10);
    const dayName = DAYS_OF_WEEK[dayOfWeek];

    studentList.forEach((s, idx) => {
      // Deterministic realistic seed
      const hash = (s.id.charCodeAt(s.id.length - 1) + i * 7 + idx * 13) % 20;
      let status: "P" | "A" | "L" | "Lv" = "P";
      if (hash === 1) status = "A";
      else if (hash === 2) status = "L";
      else if (hash === 3) status = "Lv";

      entries.push({
        id: `ATT-HIST-${s.id}-${dateStr}`,
        studentId: s.id,
        studentName: s.name,
        className: s.className || "Playgroup",
        section: s.section || "A",
        admissionNo: s.admissionNo || `ADM-${1000 + idx}`,
        rollNo: s.rollNo || idx + 1,
        parentName: s.parent || "Parent",
        date: dateStr,
        day: dayName,
        status,
        markedBy: "Meenakshi Sundaram (Class Teacher)",
        updatedAt: new Date(d.setHours(8, 45, 0)).toISOString(),
      });
    });
  }

  return entries;
}

export function getStoredAttendance(): StudentAttendanceEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = generateInitialHistoricalAttendance();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const initial = generateInitialHistoricalAttendance();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    return parsed;
  } catch {
    return generateInitialHistoricalAttendance();
  }
}

export function saveAttendance(
  className: string,
  section: string,
  date: string,
  records: Record<string, "P" | "A" | "L" | "Lv">,
  studentList?: { id: string; name: string }[],
  markedBy: string = "Class Teacher"
) {
  const current = getStoredAttendance();
  const updatedMap = new Map(current.map((item) => [`${item.studentId}_${item.date}`, item]));

  let localStudents: any[] = [];
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("SUNSHINE_STUDENTS");
      if (raw) localStudents = JSON.parse(raw);
    } catch {}
  }

  const time = new Date().toISOString();
  const dateObj = new Date(date);
  const dayName = DAYS_OF_WEEK[dateObj.getDay()] || "Weekday";

  Object.entries(records).forEach(([studentId, status]) => {
    const student =
      (studentList && studentList.find((s) => s.id === studentId)) ||
      localStudents.find((s) => s.id === studentId) ||
      STUDENTS.find((s) => s.id === studentId);

    const entry: StudentAttendanceEntry = {
      id: `ATT-${studentId}-${date}`,
      studentId,
      studentName: student ? student.name : studentId,
      className: className || (student as any)?.className || "Playgroup",
      section: section || (student as any)?.section || "A",
      admissionNo: (student as any)?.admissionNo || `ADM-${studentId}`,
      rollNo: (student as any)?.rollNo || 1,
      parentName: (student as any)?.parent || "Parent",
      date,
      day: dayName,
      status,
      markedBy,
      updatedAt: time,
    };
    updatedMap.set(`${studentId}_${date}`, entry);
  });

  const newList = Array.from(updatedMap.values());
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: newList }));
}

export function getAttendanceForStudent(studentId: string): StudentAttendanceEntry[] {
  const current = getStoredAttendance();
  return current.filter((item) => item.studentId === studentId);
}

export function getAttendanceForDate(date: string, className?: string, section?: string): StudentAttendanceEntry[] {
  const current = getStoredAttendance();
  return current.filter((item) => {
    if (item.date !== date) return false;
    if (className && className !== "all" && item.className !== className) return false;
    if (section && section !== "all" && item.section !== section) return false;
    return true;
  });
}

export function getStudentAttendanceDetails(studentId: string, fallbackStudent?: any) {
  const records = getAttendanceForStudent(studentId).sort((a, b) => b.date.localeCompare(a.date));
  const totalDays = records.length || 1;
  const presentDays = records.filter((r) => r.status === "P").length;
  const absentDays = records.filter((r) => r.status === "A").length;
  const lateDays = records.filter((r) => r.status === "L").length;
  const leaveDays = records.filter((r) => r.status === "Lv").length;
  const percentage = Math.round(((presentDays + lateDays) / totalDays) * 100);

  // Weekly Report (Last 5 working days)
  const weeklyRecords = records.slice(0, 5);
  const weeklyPresent = weeklyRecords.filter((r) => r.status === "P").length;
  const weeklyAbsent = weeklyRecords.filter((r) => r.status === "A").length;
  const weeklyLate = weeklyRecords.filter((r) => r.status === "L").length;
  const weeklyLeave = weeklyRecords.filter((r) => r.status === "Lv").length;
  const weeklyPct = weeklyRecords.length ? Math.round(((weeklyPresent + weeklyLate) / weeklyRecords.length) * 100) : 0;

  // Monthly Report (Last 20 working days)
  const monthlyRecords = records.slice(0, 20);
  const monthlyPresent = monthlyRecords.filter((r) => r.status === "P").length;
  const monthlyAbsent = monthlyRecords.filter((r) => r.status === "A").length;
  const monthlyLate = monthlyRecords.filter((r) => r.status === "L").length;
  const monthlyLeave = monthlyRecords.filter((r) => r.status === "Lv").length;
  const monthlyPct = monthlyRecords.length ? Math.round(((monthlyPresent + monthlyLate) / monthlyRecords.length) * 100) : 0;

  return {
    studentId,
    studentName: records[0]?.studentName || fallbackStudent?.name || "Student",
    admissionNo: records[0]?.admissionNo || fallbackStudent?.admissionNo || `ADM-${studentId}`,
    className: records[0]?.className || fallbackStudent?.className || "Playgroup",
    section: records[0]?.section || fallbackStudent?.section || "A",
    rollNo: records[0]?.rollNo || fallbackStudent?.rollNo || 1,
    parentName: records[0]?.parentName || fallbackStudent?.parent || "Parent",
    totalSchoolDays: totalDays,
    presentDays,
    absentDays,
    lateDays,
    leaveDays,
    percentage,
    weeklyReport: {
      days: weeklyRecords,
      totalPresent: weeklyPresent,
      totalAbsent: weeklyAbsent,
      totalLate: weeklyLate,
      totalLeave: weeklyLeave,
      percentage: weeklyPct,
    },
    monthlyReport: {
      workingDays: monthlyRecords.length,
      presentDays: monthlyPresent,
      absentDays: monthlyAbsent,
      lateDays: monthlyLate,
      leaveDays: monthlyLeave,
      percentage: monthlyPct,
    },
    history: records,
  };
}

export function useLiveAttendance(studentId?: string, date?: string) {
  const [data, setData] = useState<StudentAttendanceEntry[]>(() => getStoredAttendance());

  useEffect(() => {
    const handler = () => setData(getStoredAttendance());
    window.addEventListener(EVENT_NAME, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(EVENT_NAME, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  let filtered = data;
  if (studentId) {
    filtered = filtered.filter((i) => i.studentId === studentId);
  }
  if (date) {
    filtered = filtered.filter((i) => i.date === date);
  }

  return {
    attendance: filtered,
    saveAttendance,
    getAttendanceForStudent,
    getAttendanceForDate,
    getStudentAttendanceDetails,
  };
}
