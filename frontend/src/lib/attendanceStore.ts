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

import { getUserScopedStorageKey } from "./auth";
import { notifyAutoRefresh } from "./autoRefreshContext";
import { toCanonicalAdmissionNo } from "./credentials";

const EVENT_NAME = "sunshine-attendance-update";
const BASE_STORAGE_KEY = "sunshine.attendance.cache.v1";
const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

let memoryAttendanceCache: StudentAttendanceEntry[] = [];

function loadAttendanceFromStorage(): StudentAttendanceEntry[] {
  if (memoryAttendanceCache.length > 0) return memoryAttendanceCache;
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(getUserScopedStorageKey(BASE_STORAGE_KEY));
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          memoryAttendanceCache = parsed;
          return parsed;
        }
      }
    } catch {}
  }
  return [];
}

function saveAttendanceToStorage(list: StudentAttendanceEntry[]) {
  memoryAttendanceCache = list;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(getUserScopedStorageKey(BASE_STORAGE_KEY), JSON.stringify(list));
    } catch {}
  }
}

export function getStoredAttendance(): StudentAttendanceEntry[] {
  return loadAttendanceFromStorage();
}

export async function fetchAttendanceFromSupabase(): Promise<StudentAttendanceEntry[]> {
  const cached = loadAttendanceFromStorage();
  try {
    const { data, error } = await supabase
      .from("gv_requests")
      .select("*")
      .eq("request_type", "attendance");

    if (error || !data || data.length === 0) return cached;

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
        admissionNo: toCanonicalAdmissionNo(meta.admissionNo, d.id),
        rollNo: meta.rollNo || 1,
        parentName: meta.parentName || "Parent",
        date: meta.date || d.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
        day: meta.day || "Weekday",
        status: (d.status as any) || meta.status || "P",
        markedBy: meta.markedBy || "Class Teacher",
        updatedAt: d.created_at || new Date().toISOString(),
      };
    });

    const combinedMap = new Map<string, StudentAttendanceEntry>();
    cached.forEach((item) => {
      if (item.studentId && item.date) {
        combinedMap.set(`${item.studentId}_${item.date}`, item);
      }
    });
    mapped.forEach((item) => {
      if (item.studentId && item.date) {
        combinedMap.set(`${item.studentId}_${item.date}`, item);
      }
    });

    const combinedList = Array.from(combinedMap.values());
    saveAttendanceToStorage(combinedList);
    return combinedList;
  } catch {
    return cached;
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
  const current = loadAttendanceFromStorage();
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
      admissionNo: toCanonicalAdmissionNo((student as any)?.admissionNo, studentId),
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
      leave_type_or_interested_class: className || "Nursery",
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

  const newList = Array.from(updatedMap.values());
  saveAttendanceToStorage(newList);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: newList }));
  }

  try {
    await supabase.from("gv_requests").upsert(supabasePayloads);
    notifyAutoRefresh("attendance");
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
  const totalDays = records.length;
  const presentDays = records.filter((r) => r.status === "P").length;
  const absentDays = records.filter((r) => r.status === "A").length;
  const lateDays = records.filter((r) => r.status === "L").length;
  const leaveDays = records.filter((r) => r.status === "Lv").length;
  const percentage = totalDays > 0 ? Math.round(((presentDays + lateDays) / totalDays) * 100) : 0;

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
    admissionNo: toCanonicalAdmissionNo(records[0]?.admissionNo || fallbackStudent?.admissionNo, studentId),
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
  const [data, setData] = useState<StudentAttendanceEntry[]>(() => loadAttendanceFromStorage());
  const [activeDate, setActiveDate] = useState<string>(() => date || new Date().toISOString().slice(0, 10));

  useEffect(() => {
    let isMounted = true;

    const refreshData = () => {
      const targetDate = date || new Date().toISOString().slice(0, 10);
      setActiveDate(targetDate);

      fetchAttendanceFromSupabase().then((res) => {
        if (isMounted && res) {
          setData((prev) => (JSON.stringify(prev) === JSON.stringify(res) ? prev : res));
        }
      });
    };

    // Initial fetch
    refreshData();

    // 1. Midnight boundary timer calculation & scheduling
    let midnightTimerId: ReturnType<typeof setTimeout> | null = null;
    const scheduleMidnightRollover = () => {
      const now = new Date();
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
      const msUntilMidnight = Math.max(1000, tomorrow.getTime() - now.getTime());

      midnightTimerId = setTimeout(() => {
        if (isMounted) {
          if (!date) {
            const freshToday = new Date().toISOString().slice(0, 10);
            setActiveDate(freshToday);
          }
          refreshData();
          scheduleMidnightRollover();
        }
      }, msUntilMidnight);
    };
    scheduleMidnightRollover();

    // 2. Periodic check (every 30 seconds) for date transition
    const rolloverTimer = setInterval(() => {
      if (isMounted) {
        const currentToday = new Date().toISOString().slice(0, 10);
        if (!date && currentToday !== activeDate) {
          setActiveDate(currentToday);
          refreshData();
        }
      }
    }, 30000);

    // 3. Realtime subscription: reflects immediately across all associated pages
    const unsubscribe = subscribeToRealtimeTable({
      table: "gv_requests",
      onPayload: () => {
        if (isMounted) refreshData();
      },
    });

    // 4. Local tab event sync
    const handler = () => {
      if (isMounted) setData(getStoredAttendance());
    };
    window.addEventListener(EVENT_NAME, handler);

    return () => {
      isMounted = false;
      if (midnightTimerId) clearTimeout(midnightTimerId);
      clearInterval(rolloverTimer);
      unsubscribe();
      window.removeEventListener(EVENT_NAME, handler);
    };
  }, [date]);

  let filtered = data;
  const filterDate = date || activeDate;
  if (studentId) {
    filtered = filtered.filter((i) => i.studentId === studentId);
    if (date && date !== "all") {
      filtered = filtered.filter((i) => i.date === date);
    }
  } else if (filterDate && filterDate !== "all") {
    filtered = filtered.filter((i) => i.date === filterDate);
  }

  return {
    attendance: filtered,
    saveAttendance,
    getAttendanceForStudent,
    getAttendanceForDate,
    getStudentAttendanceDetails,
  };
}

export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export const STAFF_CHECKIN_CUTOFF_HOUR = 9;
export const STAFF_CHECKIN_CUTOFF_MINUTE = 0;

export type StaffAttendanceStatus = "Present" | "Late" | "Absent" | "Leave" | "Checked Out" | "Not Marked";

export interface StaffStatusResult {
  status: StaffAttendanceStatus;
  checkIn: string;
  checkOut: string;
  workingHours: string;
}

export function computeStaffStatus(
  rec: { status?: string; checkIn?: string; checkOut?: string; workingHours?: string; checkInTimestamp?: string } | undefined,
  selectedDate: string,
  now: Date = new Date()
): StaffStatusResult {
  const todayStr = getLocalDateString(now);
  const isToday = selectedDate === todayStr;
  const isPast = selectedDate < todayStr;

  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const isPastCutoff =
    currentHour > STAFF_CHECKIN_CUTOFF_HOUR ||
    (currentHour === STAFF_CHECKIN_CUTOFF_HOUR && currentMinute > STAFF_CHECKIN_CUTOFF_MINUTE);

  let checkIn = rec?.checkIn && rec.checkIn !== "—" ? rec.checkIn : "—";
  let checkOut = rec?.checkOut && rec.checkOut !== "—" ? rec.checkOut : "—";
  let workingHours = rec?.workingHours || "—";

  // 1. If staff member HAS marked attendance / check-in:
  if (rec && rec.checkIn && rec.checkIn !== "—") {
    if (rec.checkOut && rec.checkOut !== "—") {
      return { status: "Checked Out", checkIn, checkOut, workingHours };
    }
    const rawStatus = (rec.status || "").toLowerCase();
    if (rawStatus === "absent") return { status: "Absent", checkIn, checkOut, workingHours };
    if (rawStatus === "leave" || rawStatus === "on leave") return { status: "Leave", checkIn, checkOut, workingHours };
    if (rawStatus === "late") return { status: "Late", checkIn, checkOut, workingHours };

    // Check if checkIn time itself was past cutoff (09:00 AM)
    if (rec.checkInTimestamp) {
      const inDate = new Date(rec.checkInTimestamp);
      const inHrs = inDate.getHours();
      const inMins = inDate.getMinutes();
      if (inHrs > STAFF_CHECKIN_CUTOFF_HOUR || (inHrs === STAFF_CHECKIN_CUTOFF_HOUR && inMins > STAFF_CHECKIN_CUTOFF_MINUTE)) {
        return { status: "Late", checkIn, checkOut, workingHours };
      }
    }
    return { status: "Present", checkIn, checkOut, workingHours };
  }

  // 2. If staff member has explicit Absent or Leave record:
  if (rec && rec.status) {
    const rawStatus = rec.status.toLowerCase();
    if (rawStatus === "absent") return { status: "Absent", checkIn: "—", checkOut: "—", workingHours: "—" };
    if (rawStatus === "leave" || rawStatus === "on leave") return { status: "Leave", checkIn: "—", checkOut: "—", workingHours: "—" };
    if (rawStatus === "late") return { status: "Late", checkIn: "—", checkOut: "—", workingHours: "—" };
    if (rawStatus === "present") return { status: "Present", checkIn: "—", checkOut: "—", workingHours: "—" };
  }

  // 3. No check-in entry found:
  if (isToday) {
    if (isPastCutoff) {
      // After cutoff time (9:00 AM), every staff member who has not yet marked attendance is Late until marked
      return { status: "Late", checkIn: "—", checkOut: "—", workingHours: "—" };
    }
    return { status: "Not Marked", checkIn: "—", checkOut: "—", workingHours: "—" };
  }

  if (isPast) {
    return { status: "Absent", checkIn: "—", checkOut: "—", workingHours: "—" };
  }

  return { status: "Not Marked", checkIn: "—", checkOut: "—", workingHours: "—" };
}

export async function fetchStaffAttendanceFromSupabase(targetDate?: string): Promise<Record<string, { status: string; checkIn: string; checkOut: string; workingHours?: string; checkInTimestamp?: string; checkOutTimestamp?: string; date: string }>> {
  const dateStr = targetDate || getLocalDateString();
  try {
    const { data, error } = await supabase
      .from("gv_requests")
      .select("*")
      .eq("request_type", "staff_attendance");

    if (!error && data) {
      const out: Record<string, { status: string; checkIn: string; checkOut: string; workingHours?: string; checkInTimestamp?: string; checkOutTimestamp?: string; date: string }> = {};
      data.forEach((d: any) => {
        let meta: any = {};
        try {
          if (d.reason_or_notes && (d.reason_or_notes.startsWith("{") || d.reason_or_notes.startsWith("["))) {
            meta = JSON.parse(d.reason_or_notes);
          }
        } catch {}

        const recDate = meta.date || (d.created_at ? d.created_at.slice(0, 10) : dateStr);
        if (recDate === dateStr) {
          const recObj = {
            status: meta.status || d.status || "Present",
            checkIn: meta.checkIn || "08:30 AM",
            checkOut: meta.checkOut && meta.checkOut !== "—" ? meta.checkOut : "—",
            workingHours: meta.workingHours || "—",
            checkInTimestamp: meta.checkInTimestamp || "",
            checkOutTimestamp: meta.checkOutTimestamp || "",
            date: recDate,
          };

          const keys = [
            meta.staffId,
            d.parent_name,
            d.applicant_or_child_name,
            meta.staffName,
            d.id,
          ].filter(Boolean);

          keys.forEach((k) => {
            out[k] = recObj;
            out[String(k).toLowerCase()] = recObj;
          });
        }
      });
      return out;
    }
  } catch {}
  return {};
}

export async function saveStaffAttendanceRecord(staffId: string, staffName: string, status: string, checkIn = "08:30 AM", checkOut = "—", targetDate?: string) {
  const todayStr = targetDate || getLocalDateString();
  const id = `ATT-STF-${staffId}-${todayStr}`;
  const now = new Date();

  const payload = {
    id,
    request_type: "staff_attendance",
    applicant_or_child_name: staffName,
    parent_name: staffId,
    status,
    reason_or_notes: JSON.stringify({
      staffId,
      staffName,
      date: todayStr,
      status,
      checkIn,
      checkOut,
      checkInTimestamp: now.toISOString(),
    }),
    updated_at: now.toISOString(),
  };

  try {
    const { error } = await supabase.from("gv_requests").upsert([payload], { onConflict: "id" });
    if (error) throw error;
    notifyAutoRefresh("attendance");
    notifyAutoRefresh("staff");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to save staff attendance." };
  }
}

export async function markStaffTimeIn(staffId: string, staffName: string, targetDate?: string) {
  const todayStr = targetDate || getLocalDateString();
  const existingMap = await fetchStaffAttendanceFromSupabase(todayStr);
  const existing =
    existingMap[staffId] ||
    existingMap[staffId.toLowerCase()] ||
    existingMap[staffName] ||
    existingMap[staffName.toLowerCase()];

  if (existing && existing.checkIn && existing.checkIn !== "—") {
    return {
      success: false,
      message: `You have already marked Time In for today at ${existing.checkIn}.`,
    };
  }

  const now = new Date();
  const timeInStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });

  const hours = now.getHours();
  const minutes = now.getMinutes();
  let status = "Present";
  if (hours > 9 || (hours === 9 && minutes > 15)) {
    status = "Late";
  }

  const id = `ATT-STF-${staffId}-${todayStr}`;
  const payload = {
    id,
    request_type: "staff_attendance",
    applicant_or_child_name: staffName,
    parent_name: staffId,
    status,
    reason_or_notes: JSON.stringify({
      staffId,
      staffName,
      date: todayStr,
      status,
      checkIn: timeInStr,
      checkOut: "—",
      checkInTimestamp: now.toISOString(),
      workingHours: "—",
    }),
    updated_at: now.toISOString(),
  };

  try {
    const { error } = await supabase.from("gv_requests").upsert([payload], { onConflict: "id" });
    if (error) throw error;
    notifyAutoRefresh("attendance");
    notifyAutoRefresh("staff");
    return {
      success: true,
      message: `Time In marked successfully at ${timeInStr} (${status}).`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || "Failed to mark Time In.",
    };
  }
}

export async function markStaffTimeOut(staffId: string, staffName: string, targetDate?: string) {
  const todayStr = targetDate || getLocalDateString();
  const existingMap = await fetchStaffAttendanceFromSupabase(todayStr);
  const existing =
    existingMap[staffId] ||
    existingMap[staffId.toLowerCase()] ||
    existingMap[staffName] ||
    existingMap[staffName.toLowerCase()];

  if (!existing || !existing.checkIn || existing.checkIn === "—") {
    return {
      success: false,
      message: "You must mark Time In before marking Time Out.",
    };
  }

  if (existing.checkOut && existing.checkOut !== "—") {
    return {
      success: false,
      message: `You have already marked Time Out for today at ${existing.checkOut}.`,
    };
  }

  const now = new Date();
  const timeOutStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });

  let workingHours = "8h 00m";
  if (existing.checkInTimestamp) {
    const inTime = new Date(existing.checkInTimestamp).getTime();
    const outTime = now.getTime();
    if (outTime > inTime) {
      const diffMs = outTime - inTime;
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      workingHours = `${diffHrs}h ${diffMins}m`;
    }
  }

  const id = `ATT-STF-${staffId}-${todayStr}`;
  const payload = {
    id,
    request_type: "staff_attendance",
    applicant_or_child_name: staffName,
    parent_name: staffId,
    status: existing.status,
    reason_or_notes: JSON.stringify({
      staffId,
      staffName,
      date: todayStr,
      status: existing.status,
      checkIn: existing.checkIn,
      checkOut: timeOutStr,
      checkInTimestamp: existing.checkInTimestamp,
      checkOutTimestamp: now.toISOString(),
      workingHours,
    }),
    updated_at: now.toISOString(),
  };

  try {
    const { error } = await supabase.from("gv_requests").upsert([payload], { onConflict: "id" });
    if (error) throw error;
    notifyAutoRefresh("attendance");
    notifyAutoRefresh("staff");
    return {
      success: true,
      message: `Time Out / Checkout marked successfully at ${timeOutStr}. Total working time: ${workingHours}.`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || "Failed to mark Time Out.",
    };
  }
}
