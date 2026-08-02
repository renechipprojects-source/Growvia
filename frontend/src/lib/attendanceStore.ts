import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import { subscribeToRealtimeTable } from "./realtimeService";

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

const EVENT_NAME = "sunshine-attendance-update";
const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

let memoryAttendanceCache: StudentAttendanceEntry[] = [];

export function getStoredAttendance(): StudentAttendanceEntry[] {
  return memoryAttendanceCache;
}

export async function fetchAttendanceFromSupabase(): Promise<StudentAttendanceEntry[]> {
  try {
    const { data, error } = await supabase
      .from("gv_requests")
      .select("*")
      .eq("request_type", "attendance");

    if (error || !data) return memoryAttendanceCache;

    const mapped: StudentAttendanceEntry[] = data.map((d: any) => {
      let meta: any = {};
      try {
        if (d.reason_or_notes && (d.reason_or_notes.startsWith("{") || d.reason_or_notes.startsWith("["))) {
          meta = JSON.parse(d.reason_or_notes);
        }
      } catch {}

      return {
        id: d.id,
        studentId: meta.studentId || d.applicant_or_child_name || d.id,
        studentName: d.applicant_or_child_name || meta.studentName || "Student",
        className: d.class_name || meta.className || "Nursery",
        section: d.section || meta.section || "A",
        admissionNo: meta.admissionNo || `ADM-${d.id}`,
        rollNo: meta.rollNo || 1,
        parentName: meta.parentName || "Parent",
        date: meta.date || d.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
        day: meta.day || "Weekday",
        status: (d.status as any) || meta.status || "P",
        markedBy: meta.markedBy || "Class Teacher",
        updatedAt: d.created_at || new Date().toISOString(),
      };
    });

    memoryAttendanceCache = mapped;
    return mapped;
  } catch {
    return memoryAttendanceCache;
  }
}

export async function saveAttendance(
  className: string,
  section: string,
  date: string,
  records: Record<string, "P" | "A" | "L" | "Lv">,
  studentList?: { id: string; name: string }[],
  markedBy: string = "Class Teacher"
) {
  const current = memoryAttendanceCache;
  const updatedMap = new Map(current.map((item) => [`${item.studentId}_${item.date}`, item]));

  const time = new Date().toISOString();
  const dateObj = new Date(date);
  const dayName = DAYS_OF_WEEK[dateObj.getDay()] || "Weekday";

  const supabasePayloads: any[] = [];

  Object.entries(records).forEach(([studentId, status]) => {
    const student = studentList && studentList.find((s: any) => s.id === studentId);
    const sName = student ? student.name : studentId;

    const entry: StudentAttendanceEntry = {
      id: `ATT-${studentId}-${date}`,
      studentId,
      studentName: sName,
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

    supabasePayloads.push({
      id: `ATT-${studentId}-${date}`,
      request_type: "attendance",
      applicant_or_child_name: sName,
      class_name: className || "Nursery",
      section: section || "A",
      status: status,
      reason_or_notes: JSON.stringify({
        studentId,
        studentName: sName,
        className,
        section,
        date,
        day: dayName,
        status,
        markedBy,
      }),
    });
  });

  memoryAttendanceCache = Array.from(updatedMap.values());
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: memoryAttendanceCache }));
  }

  try {
    await supabase.from("gv_requests").upsert(supabasePayloads);
  } catch {}
}

export function getAttendanceForStudent(studentId: string): StudentAttendanceEntry[] {
  return memoryAttendanceCache.filter((item) => item.studentId === studentId);
}

export function getAttendanceForDate(date: string, className?: string, section?: string): StudentAttendanceEntry[] {
  return memoryAttendanceCache.filter((item) => {
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

  const weeklyRecords = records.slice(0, 5);
  const weeklyPresent = weeklyRecords.filter((r) => r.status === "P").length;
  const weeklyAbsent = weeklyRecords.filter((r) => r.status === "A").length;
  const weeklyLate = weeklyRecords.filter((r) => r.status === "L").length;
  const weeklyLeave = weeklyRecords.filter((r) => r.status === "Lv").length;
  const weeklyPct = weeklyRecords.length ? Math.round(((weeklyPresent + weeklyLate) / weeklyRecords.length) * 100) : 0;

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
  const [data, setData] = useState<StudentAttendanceEntry[]>(() => memoryAttendanceCache);

  useEffect(() => {
    fetchAttendanceFromSupabase().then((res) => {
      if (res) setData(res);
    });

    const unsubscribe = subscribeToRealtimeTable({
      table: "gv_requests",
      onPayload: () => {
        fetchAttendanceFromSupabase().then((res) => {
          if (res) setData(res);
        });
      },
    });

    const handler = () => setData(memoryAttendanceCache);
    window.addEventListener(EVENT_NAME, handler);

    return () => {
      unsubscribe();
      window.removeEventListener(EVENT_NAME, handler);
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
