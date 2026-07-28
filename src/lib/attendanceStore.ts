import { useState, useEffect } from "react";
import { STUDENTS } from "@/lib/mockData";

export interface StudentAttendanceEntry {
  studentId: string;
  studentName: string;
  className: string;
  section: string;
  date: string;
  status: "P" | "A" | "L" | "Lv";
  updatedAt: string;
}

const STORAGE_KEY = "sunshine.attendance.v1";
const EVENT_NAME = "sunshine-attendance-update";

function getStoredAttendance(): StudentAttendanceEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveAttendance(
  className: string,
  section: string,
  date: string,
  records: Record<string, "P" | "A" | "L" | "Lv">,
  studentList?: { id: string; name: string }[]
) {
  const current = getStoredAttendance();
  const updatedMap = new Map(current.map((item) => [`${item.studentId}_${item.date}`, item]));

  let localStudents: { id: string; name: string }[] = [];
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("SUNSHINE_STUDENTS");
      if (raw) localStudents = JSON.parse(raw);
    } catch {}
  }

  const time = new Date().toISOString();
  Object.entries(records).forEach(([studentId, status]) => {
    const student =
      (studentList && studentList.find((s) => s.id === studentId)) ||
      localStudents.find((s) => s.id === studentId) ||
      STUDENTS.find((s) => s.id === studentId);

    const entry: StudentAttendanceEntry = {
      studentId,
      studentName: student ? student.name : studentId,
      className,
      section,
      date,
      status,
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
    if (className && item.className !== className) return false;
    if (section && item.section !== section) return false;
    return true;
  });
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
  };
}
