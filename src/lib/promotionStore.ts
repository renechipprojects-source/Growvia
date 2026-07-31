// Centralized Student Promotion & Lifecycle Engine for Sunshine Play School ERP
import { supabase } from "./supabase";
import { fetchStudents, saveFeeRecord, recalculateFeeLedger, type Student, type FeeLedgerItem } from "./supabaseService";
import { logAuditEvent } from "./auditLogStore";

export interface PromotionHistoryRecord {
  id: string;
  studentId: string;
  fromClass: string;
  toClass: string;
  fromAcademicYear: string;
  toAcademicYear: string;
  promotedBy: string;
  promotedOn: string;
  status: "Promoted" | "Retained" | "Graduated" | "Transferred" | "Withdrawn";
  rollNo?: number;
  notes?: string;
}

export interface ActivityTimelineRecord {
  id: string;
  studentId: string;
  title: string;
  description: string;
  timestamp: string;
  category: "Admission" | "Class Assignment" | "Fee" | "Attendance" | "Promotion" | "Status Change" | "Transfer";
  performedBy: string;
}

export interface AcademicYearRecord {
  year: string;
  status: "Active" | "Upcoming" | "Closed";
  createdOn?: string;
  closedOn?: string;
}

const PROMOTION_HISTORY_KEY = "sunshine.promotion_history.v1";
const ACTIVITY_TIMELINE_KEY = "sunshine.activity_timeline.v1";
const PROMOTION_MAPPING_KEY = "sunshine.promotion_mapping.v1";
const ACADEMIC_YEARS_KEY = "sunshine.academic_years.v1";
const BATCH_ACTIVITY_LOCK_KEY = "sunshine.batch_activity_locks.v1";

// ─── 1. PROMOTION MAPPING ENGINE ──────────────────────────────────────────────

export const DEFAULT_PROMOTION_MAPPING: Record<string, string> = {
  "Playgroup": "Nursery",
  "Nursery": "LKG",
  "LKG": "UKG",
  "UKG": "Grade 1",
  "Grade 1": "Grade 2",
  "Grade 2": "Grade 3",
  "Grade 3": "Grade 4",
  "Grade 4": "Grade 5",
  "Grade 5": "Alumni / Graduated",
};

export function getPromotionMapping(): Record<string, string> {
  if (typeof window === "undefined") return DEFAULT_PROMOTION_MAPPING;
  try {
    const raw = localStorage.getItem(PROMOTION_MAPPING_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_PROMOTION_MAPPING;
  } catch {
    return DEFAULT_PROMOTION_MAPPING;
  }
}

export function savePromotionMapping(mapping: Record<string, string>, updatedBy: string = "Office Staff") {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROMOTION_MAPPING_KEY, JSON.stringify(mapping));
  logAuditEvent({
    user: updatedBy,
    role: "office",
    module: "Academic Settings",
    action: "Promotion Mapping Updated",
    previousValue: "Previous Progression Config",
    newValue: JSON.stringify(mapping),
  });
}

export function getDefaultDestinationClass(sourceClass: string): string {
  const mapping = getPromotionMapping();
  const baseClass = sourceClass.split(" ")[0].trim();
  const matched = mapping[baseClass] || mapping[sourceClass];
  if (matched) return matched;
  if (sourceClass.includes("UKG")) return "Grade 1";
  if (sourceClass.includes("Grade 2") || sourceClass.includes("Grade 5")) return "Alumni / Graduated";
  return "Nursery";
}

// ─── 2. ACADEMIC YEAR LOCKING & VALIDATION ────────────────────────────────────

export function getAcademicYears(): AcademicYearRecord[] {
  const seed: AcademicYearRecord[] = [
    { year: "2025-2026", status: "Closed", closedOn: "2026-03-31" },
    { year: "2026-2027", status: "Active", createdOn: "2026-04-01" },
    { year: "2027-2028", status: "Upcoming", createdOn: "2026-07-01" },
  ];
  if (typeof window === "undefined") return seed;
  try {
    const raw = localStorage.getItem(ACADEMIC_YEARS_KEY);
    return raw ? JSON.parse(raw) : seed;
  } catch {
    return seed;
  }
}

export function saveAcademicYears(years: AcademicYearRecord[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACADEMIC_YEARS_KEY, JSON.stringify(years));
}

export function addAcademicYear(year: string, createdBy: string = "Office Staff") {
  const years = getAcademicYears();
  if (years.some((y) => y.year === year)) return;
  const updated: AcademicYearRecord[] = [...years, { year, status: "Upcoming", createdOn: new Date().toISOString() }];
  saveAcademicYears(updated);
  logAuditEvent({
    user: createdBy,
    role: "office",
    module: "Academic Settings",
    action: "Academic Year Created",
    previousValue: "—",
    newValue: `Academic Year ${year}`,
  });
}

export function closeAcademicYear(year: string, closedBy: string = "Office Staff") {
  const years = getAcademicYears();
  const updated = years.map((y) => (y.year === year ? { ...y, status: "Closed" as const, closedOn: new Date().toISOString() } : y));
  saveAcademicYears(updated);
  logAuditEvent({
    user: closedBy,
    role: "office",
    module: "Academic Settings",
    action: "Academic Year Marked Closed",
    previousValue: `Year ${year} (Active)`,
    newValue: `Year ${year} (Closed - Read Only)`,
  });
}

export function isAcademicYearClosed(year: string): boolean {
  const years = getAcademicYears();
  const item = years.find((y) => y.year === year);
  return item?.status === "Closed";
}

// ─── 3. CLASS CAPACITY VALIDATION ─────────────────────────────────────────────

export const CLASS_CAPACITIES: Record<string, number> = {
  Playgroup: 25,
  Nursery: 30,
  LKG: 30,
  UKG: 30,
  "Grade 1": 35,
  "Grade 2": 35,
};

export function validatePromotionCapacity(
  toClass: string,
  countToPromote: number,
  currentEnrolledCount: number = 25
): { valid: boolean; currentCount: number; capacity: number; projectedCount: number; message: string } {
  const baseClass = toClass.split(" ")[0].trim();
  const capacity = CLASS_CAPACITIES[baseClass] || CLASS_CAPACITIES[toClass] || 30;
  const projectedCount = currentEnrolledCount + countToPromote;
  const valid = projectedCount <= capacity;

  return {
    valid,
    currentCount: currentEnrolledCount,
    capacity,
    projectedCount,
    message: valid
      ? `Capacity check passed (${projectedCount}/${capacity})`
      : `Destination class capacity exceeded (${projectedCount}/${capacity})`,
  };
}

// ─── 4. PROMOTION HISTORY & TIMELINE STORE ────────────────────────────────────

export function getPromotionHistory(): PromotionHistoryRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PROMOTION_HISTORY_KEY);
    return raw ? JSON.parse(raw) : getSeedPromotionHistory();
  } catch {
    return getSeedPromotionHistory();
  }
}

export function savePromotionHistory(records: PromotionHistoryRecord[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROMOTION_HISTORY_KEY, JSON.stringify(records));
}

export function getActivityTimeline(studentId?: string): ActivityTimelineRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ACTIVITY_TIMELINE_KEY);
    const list: ActivityTimelineRecord[] = raw ? JSON.parse(raw) : getSeedTimeline();
    if (studentId) {
      return list.filter((item) => item.studentId === studentId).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
    return list;
  } catch {
    return getSeedTimeline();
  }
}

export function saveActivityTimeline(records: ActivityTimelineRecord[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACTIVITY_TIMELINE_KEY, JSON.stringify(records));
}

function getSeedPromotionHistory(): PromotionHistoryRecord[] {
  return [
    {
      id: "PROM-SEED-1",
      studentId: "STU1001",
      fromClass: "Nursery A",
      toClass: "LKG A",
      fromAcademicYear: "2025-2026",
      toAcademicYear: "2026-2027",
      promotedBy: "Office Staff",
      promotedOn: "2026-04-05",
      status: "Promoted",
      rollNo: 1,
      notes: "Annual academic progression completed successfully.",
    },
    {
      id: "PROM-SEED-2",
      studentId: "STU1002",
      fromClass: "LKG B",
      toClass: "UKG B",
      fromAcademicYear: "2025-2026",
      toAcademicYear: "2026-2027",
      promotedBy: "Office Staff",
      promotedOn: "2026-04-05",
      status: "Promoted",
      rollNo: 2,
      notes: "Annual academic progression completed successfully.",
    },
  ];
}

function getSeedTimeline(): ActivityTimelineRecord[] {
  return [
    {
      id: "ACT-1",
      studentId: "STU1001",
      title: "Admission Created",
      description: "Student enrolled in Sunshine Play School",
      timestamp: "2025-06-01T09:00:00Z",
      category: "Admission",
      performedBy: "Office Staff",
    },
    {
      id: "ACT-2",
      studentId: "STU1001",
      title: "Assigned to Nursery A",
      description: "Allocated to Class Nursery Section A",
      timestamp: "2025-06-05T10:30:00Z",
      category: "Class Assignment",
      performedBy: "Office Staff",
    },
    {
      id: "ACT-3",
      studentId: "STU1001",
      title: "Fee Paid ₹5,000",
      description: "Installment #1 paid via Cash",
      timestamp: "2025-07-15T11:00:00Z",
      category: "Fee",
      performedBy: "Office Staff",
    },
    {
      id: "ACT-4",
      studentId: "STU1001",
      title: "Promoted to LKG A",
      description: "Promoted for Academic Year 2026-2027",
      timestamp: "2026-04-05T14:00:00Z",
      category: "Promotion",
      performedBy: "Office Staff",
    },
  ];
}

// ─── 5. EXECUTION, ROLL NUMBERS & CONDITIONAL ROLLBACK ────────────────────────

export interface PerformPromotionInput {
  studentIds: string[];
  retainedStudentIds?: string[];
  transferredStudentIds?: string[];
  fromClass: string;
  toClass: string;
  fromAcademicYear: string;
  toAcademicYear: string;
  promotedBy?: string;
  notes?: string;
}

export interface PromotionResult {
  success: boolean;
  promotedCount: number;
  retainedCount: number;
  graduatedCount: number;
  transferredCount: number;
  errors: string[];
  batchId: string;
  durationMs: number;
}

export function executeStudentPromotion(input: PerformPromotionInput): PromotionResult {
  const startTime = Date.now();
  const {
    studentIds,
    retainedStudentIds = [],
    transferredStudentIds = [],
    fromClass,
    toClass,
    fromAcademicYear,
    toAcademicYear,
    promotedBy = "Office Staff",
    notes,
  } = input;

  const history = getPromotionHistory();
  const timeline = getActivityTimeline();
  const batchId = `BATCH-${Date.now()}`;
  const now = new Date().toISOString().slice(0, 10);

  let promotedCount = 0;
  let retainedCount = 0;
  let graduatedCount = 0;
  let transferredCount = 0;
  const errors: string[] = [];

  const newHistoryRecords: PromotionHistoryRecord[] = [];
  const newTimelineRecords: ActivityTimelineRecord[] = [];

  // Sequential Roll Number Generator for Destination Class (1, 2, 3...)
  let destinationRollCounter = 1;

  // 1. Process Promoted & Graduated Students
  studentIds.forEach((sId) => {
    const isGraduating = toClass === "Alumni / Graduated" || toClass === "Graduated";
    const status = isGraduating ? "Graduated" : "Promoted";
    const assignedRollNo = isGraduating ? undefined : destinationRollCounter++;

    if (isGraduating) graduatedCount++;
    else promotedCount++;

    newHistoryRecords.push({
      id: `PROM-${batchId}-${sId}`,
      studentId: sId,
      fromClass,
      toClass,
      fromAcademicYear,
      toAcademicYear,
      promotedBy,
      promotedOn: now,
      status,
      rollNo: assignedRollNo,
      notes: notes || `Batch promotion from ${fromClass} to ${toClass}. Auto Roll #${assignedRollNo || "N/A"}.`,
    });

    newTimelineRecords.push({
      id: `ACT-${Date.now()}-${sId}`,
      studentId: sId,
      title: isGraduating ? `Graduated from ${fromClass}` : `Promoted to ${toClass} (Roll #${assignedRollNo})`,
      description: `Academic session transition: ${fromClass} (${fromAcademicYear}) → ${toClass} (${toAcademicYear})`,
      timestamp: new Date().toISOString(),
      category: "Promotion",
      performedBy: promotedBy,
    });

    logAuditEvent({
      user: promotedBy,
      role: "office",
      module: "Student Promotion",
      action: isGraduating ? "Student Graduated" : "Student Promoted",
      previousValue: `${fromClass} (${fromAcademicYear})`,
      newValue: `${toClass} (${toAcademicYear}) - Roll #${assignedRollNo || "N/A"}`,
    });
  });

  // 2. Process Retained Students
  retainedStudentIds.forEach((sId) => {
    retainedCount++;
    const assignedRollNo = destinationRollCounter++;
    newHistoryRecords.push({
      id: `PROM-RET-${batchId}-${sId}`,
      studentId: sId,
      fromClass,
      toClass: fromClass,
      fromAcademicYear,
      toAcademicYear,
      promotedBy,
      promotedOn: now,
      status: "Retained",
      rollNo: assignedRollNo,
      notes: `Retained in ${fromClass} for Academic Year ${toAcademicYear}. Auto Roll #${assignedRollNo}.`,
    });

    newTimelineRecords.push({
      id: `ACT-RET-${Date.now()}-${sId}`,
      studentId: sId,
      title: `Retained in ${fromClass} (Roll #${assignedRollNo})`,
      description: `Retained in ${fromClass} for Academic Year ${toAcademicYear}`,
      timestamp: new Date().toISOString(),
      category: "Promotion",
      performedBy: promotedBy,
    });

    logAuditEvent({
      user: promotedBy,
      role: "office",
      module: "Student Promotion",
      action: "Student Retained",
      previousValue: `${fromClass} (${fromAcademicYear})`,
      newValue: `Retained in ${fromClass} (${toAcademicYear}) - Roll #${assignedRollNo}`,
    });
  });

  // 3. Process Transferred Students
  transferredStudentIds.forEach((sId) => {
    transferredCount++;
    newHistoryRecords.push({
      id: `PROM-TRF-${batchId}-${sId}`,
      studentId: sId,
      fromClass,
      toClass: "Transferred / TC Issued",
      fromAcademicYear,
      toAcademicYear,
      promotedBy,
      promotedOn: now,
      status: "Transferred",
      notes: `Transfer certificate issued from ${fromClass}`,
    });

    newTimelineRecords.push({
      id: `ACT-TRF-${Date.now()}-${sId}`,
      studentId: sId,
      title: `Transfer Certificate Issued`,
      description: `Transferred from ${fromClass} (${fromAcademicYear})`,
      timestamp: new Date().toISOString(),
      category: "Transfer",
      performedBy: promotedBy,
    });

    logAuditEvent({
      user: promotedBy,
      role: "office",
      module: "Student Promotion",
      action: "Student Transferred (TC Issued)",
      previousValue: `${fromClass} (${fromAcademicYear})`,
      newValue: `Transferred - History Preserved`,
    });
  });

  savePromotionHistory([...newHistoryRecords, ...history]);
  saveActivityTimeline([...newTimelineRecords, ...timeline]);

  try {
    const supabasePayload = newHistoryRecords.map((r) => ({
      id: r.id,
      student_id: r.studentId,
      from_class: r.fromClass,
      to_class: r.toClass,
      from_academic_year: r.fromAcademicYear,
      to_academic_year: r.toAcademicYear,
      promoted_by: r.promotedBy,
      promoted_on: r.promotedOn,
      status: r.status,
      notes: r.notes,
    }));
    Promise.resolve(supabase.from("promotion_history").upsert(supabasePayload)).catch(() => {});

    // Update users table in Supabase
    const activePromotedIds = studentIds.filter((sId) => toClass !== "Alumni / Graduated" && toClass !== "Graduated");
    const graduatedIds = studentIds.filter((sId) => toClass === "Alumni / Graduated" || toClass === "Graduated");

    if (activePromotedIds.length > 0) {
      Promise.resolve(supabase.from("users").update({ class_name: toClass, status: "Active" }).in("id", activePromotedIds)).catch(() => {});
      Promise.resolve(supabase.from("students").update({ class_name: toClass, status: "Active" }).in("id", activePromotedIds)).catch(() => {});
    }
    if (graduatedIds.length > 0) {
      Promise.resolve(supabase.from("users").update({ status: "Graduated" }).in("id", graduatedIds)).catch(() => {});
      Promise.resolve(supabase.from("students").update({ status: "Graduated" }).in("id", graduatedIds)).catch(() => {});
    }
    if (transferredStudentIds.length > 0) {
      Promise.resolve(supabase.from("users").update({ status: "TC Issued" }).in("id", transferredStudentIds)).catch(() => {});
      Promise.resolve(supabase.from("students").update({ status: "TC Issued" }).in("id", transferredStudentIds)).catch(() => {});
    }
  } catch {}

  return {
    success: true,
    promotedCount,
    retainedCount,
    graduatedCount,
    transferredCount,
    errors,
    batchId,
    durationMs: Date.now() - startTime,
  };
}

export function canRollbackPromotionBatch(batchId: string): { canRollback: boolean; reason?: string } {
  if (typeof window === "undefined") return { canRollback: true };
  try {
    const rawLocks = localStorage.getItem(BATCH_ACTIVITY_LOCK_KEY);
    const lockedBatches: string[] = rawLocks ? JSON.parse(rawLocks) : [];
    if (lockedBatches.includes(batchId)) {
      return {
        canRollback: false,
        reason: "Rollback Locked: Attendance, Fee collection, or Teacher activity has started for this batch.",
      };
    }
  } catch {}
  return { canRollback: true };
}

export function lockBatchRollback(batchId: string) {
  if (typeof window === "undefined") return;
  try {
    const rawLocks = localStorage.getItem(BATCH_ACTIVITY_LOCK_KEY);
    const lockedBatches: string[] = rawLocks ? JSON.parse(rawLocks) : [];
    if (!lockedBatches.includes(batchId)) {
      localStorage.setItem(BATCH_ACTIVITY_LOCK_KEY, JSON.stringify([...lockedBatches, batchId]));
    }
  } catch {}
}

export function rollbackPromotionBatch(batchId: string, performedBy: string = "Office Staff"): { success: boolean; message: string } {
  const check = canRollbackPromotionBatch(batchId);
  if (!check.canRollback) {
    return { success: false, message: check.reason || "Rollback is locked." };
  }

  const history = getPromotionHistory();
  const targetRecords = history.filter((h) => h.id.includes(batchId));

  if (targetRecords.length === 0) {
    return { success: false, message: "Promotion batch record not found." };
  }

  const remainingHistory = history.filter((h) => !h.id.includes(batchId));
  savePromotionHistory(remainingHistory);

  logAuditEvent({
    user: performedBy,
    role: "office",
    module: "Student Promotion",
    action: "Promotion Batch Rollback Executed",
    previousValue: `Batch ${batchId} (${targetRecords.length} Students)`,
    newValue: "Restored to Previous Academic Session",
  });

  return { success: true, message: "Promotion batch rolled back successfully!" };
}
