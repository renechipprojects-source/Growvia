// Centralized Student Promotion & Lifecycle Engine for Sunshine Play School ERP
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
  notes?: string;
}

export interface ActivityTimelineRecord {
  id: string;
  studentId: string;
  title: string;
  description: string;
  timestamp: string;
  category: "Admission" | "Class Assignment" | "Fee" | "Attendance" | "Promotion" | "Status Change";
  performedBy: string;
}

const PROMOTION_HISTORY_KEY = "sunshine.promotion_history.v1";
const ACTIVITY_TIMELINE_KEY = "sunshine.activity_timeline.v1";
const PROMOTED_STUDENTS_KEY = "sunshine.promoted_students.v1";

// Helper to read/write local storage stores
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

export function logActivityTimeline(entry: Omit<ActivityTimelineRecord, "id" | "timestamp">) {
  const current = getActivityTimeline();
  const record: ActivityTimelineRecord = {
    ...entry,
    id: `ACT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
  };
  saveActivityTimeline([record, ...current]);
}

// Seed data generators
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

export interface PerformPromotionInput {
  studentIds: string[];
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
  errors: string[];
  batchId: string;
}

export function executeStudentPromotion(input: PerformPromotionInput): PromotionResult {
  const { studentIds, fromClass, toClass, fromAcademicYear, toAcademicYear, promotedBy = "Office Staff", notes } = input;

  const history = getPromotionHistory();
  const timeline = getActivityTimeline();
  const batchId = `BATCH-${Date.now()}`;
  const now = new Date().toISOString().slice(0, 10);

  let promotedCount = 0;
  let retainedCount = 0;
  let graduatedCount = 0;
  const errors: string[] = [];

  const newHistoryRecords: PromotionHistoryRecord[] = [];
  const newTimelineRecords: ActivityTimelineRecord[] = [];

  studentIds.forEach((sId) => {
    const isGraduating = toClass === "Alumni / Graduated" || toClass === "Graduated";
    const status = isGraduating ? "Graduated" : "Promoted";

    if (isGraduating) graduatedCount++;
    else promotedCount++;

    const pRecord: PromotionHistoryRecord = {
      id: `PROM-${batchId}-${sId}`,
      studentId: sId,
      fromClass,
      toClass,
      fromAcademicYear,
      toAcademicYear,
      promotedBy,
      promotedOn: now,
      status,
      notes: notes || `Batch promotion from ${fromClass} to ${toClass}`,
    };
    newHistoryRecords.push(pRecord);

    const tRecord: ActivityTimelineRecord = {
      id: `ACT-${Date.now()}-${sId}`,
      studentId: sId,
      title: isGraduating ? `Graduated from ${fromClass}` : `Promoted to ${toClass}`,
      description: `Academic session transition: ${fromClass} (${fromAcademicYear}) → ${toClass} (${toAcademicYear})`,
      timestamp: new Date().toISOString(),
      category: "Promotion",
      performedBy: promotedBy,
    };
    newTimelineRecords.push(tRecord);
  });

  // Save promotion history & timeline
  savePromotionHistory([...newHistoryRecords, ...history]);
  saveActivityTimeline([...newTimelineRecords, ...timeline]);

  // Log Audit Event
  logAuditEvent({
    user: promotedBy,
    role: "office",
    module: "Student Promotion",
    action: "Batch Promotion Executed",
    previousValue: `${fromClass} (${fromAcademicYear}) - ${studentIds.length} Students`,
    newValue: `Promoted to ${toClass} (${toAcademicYear})`,
  });

  return {
    success: true,
    promotedCount,
    retainedCount,
    graduatedCount,
    errors,
    batchId,
  };
}

export function rollbackPromotionBatch(batchId: string, performedBy: string = "Office Staff") {
  const history = getPromotionHistory();
  const targetRecords = history.filter((h) => h.id.includes(batchId));

  if (targetRecords.length === 0) return false;

  const remainingHistory = history.filter((h) => !h.id.includes(batchId));
  savePromotionHistory(remainingHistory);

  logAuditEvent({
    user: performedBy,
    role: "office",
    module: "Student Promotion",
    action: "Promotion Batch Rollback Executed",
    previousValue: `Batch ${batchId} (${targetRecords.length} Students)`,
    newValue: "Restored to Previous Academic Year & Class",
  });

  return true;
}
