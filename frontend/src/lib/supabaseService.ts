import { supabase } from "./supabase";
import type { Student, Teacher, Enquiry, Fee, Expense } from "./mockData";
import { generateParentCredential, toCanonicalAdmissionNo, generateCanonicalAdmissionNo, sanitizeTeacherName } from "./credentials";
export { toCanonicalAdmissionNo, generateCanonicalAdmissionNo, sanitizeTeacherName };
import { pushAdminNotification } from "./admin-notifications";
import { NotificationService } from "./notifications";
import { API_URL } from "./api";
import { getUserScopedStorageKey } from "./auth";
import { dedupeAndCacheFetch, invalidateCache } from "./cacheService";
import { triggerAutoRefresh } from "./autoRefreshContext";

export type { Student, Teacher, Enquiry, Fee, Expense };

export function getNextAdmissionNo(existingStudents: Student[] = [], year: number = 2026): string {
  const yy = String(year).slice(-2);
  let maxSeq = 0;
  existingStudents.forEach((s) => {
    const adm = toCanonicalAdmissionNo(s.admissionNo, s.id, year);
    if (adm.startsWith(yy) && adm.length === 6) {
      const seqNum = parseInt(adm.slice(2), 10);
      if (!isNaN(seqNum) && seqNum > maxSeq) {
        maxSeq = seqNum;
      }
    }
  });
  return generateCanonicalAdmissionNo(year, maxSeq + 1);
}

import { normalizeClassAndSection, getLiveTeacherRoster } from "./teacherContext";
export { normalizeClassAndSection, getLiveTeacherRoster };

function normalizeStudents(students: Student[]): Student[] {
  const parentIdMap = new Map<string, string>();
  return students.map((s) => {
    const cleanPhone = (s.phone || "").replace(/[^0-9]/g, "");
    const cleanName = (s.parent || "").trim().toLowerCase();
    const key = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanName;

    let canonicalParentId = s.parentId;
    if (key) {
      if (!parentIdMap.has(key)) {
        const preferredId = s.parentId && s.parentId.startsWith("PAR-") && !s.parentId.includes("STU")
          ? s.parentId
          : `PAR-${cleanPhone.length >= 10 ? cleanPhone.slice(-10) : s.id}`;
        parentIdMap.set(key, preferredId);
      }
      canonicalParentId = parentIdMap.get(key)!;
    } else {
      canonicalParentId = s.parentId || `PAR-${s.id}`;
    }

    const normClsSec = normalizeClassAndSection(s.className, s.section);

    return {
      ...s,
      className: normClsSec.className as any,
      section: normClsSec.section as any,
      parentId: canonicalParentId,
      admissionNo: toCanonicalAdmissionNo(s.admissionNo, s.id),
    };
  });
}

export function notifyAutoRefresh(moduleName: string) {
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new CustomEvent("sunshine-module-refresh", { detail: { module: moduleName } }));
      window.dispatchEvent(new CustomEvent(`sunshine-auto-refresh-${moduleName}`));
      window.dispatchEvent(new CustomEvent("sunshine-auto-refresh"));
    } catch { }
  }
}

export interface Circular {
  id?: string;
  title: string;
  subject?: string;
  description?: string;
  content?: string;
  target_audience?: string;
  recipients?: string[];
  priority?: string;
  published_date?: string;
  publishDate?: string;
  expiry_date?: string;
  expiryDate?: string;
  author?: string;
  status?: string;
  attachment?: string;
  attachmentName?: string;
  attachmentUrl?: string;
  createdAt?: string;
  history?: any[];
}

export interface Message {
  id?: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  receiver_id: string;
  receiver_role: string;
  message_text: string;
  sent_at?: string;
  read_status?: boolean;
}

export interface LeaveRequest {
  id?: string;
  applicant_name: string;
  applicant_role: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
  applied_on?: string;
}



export async function fetchLeaveRequests(): Promise<{ data: LeaveRequest[]; isFromSupabase: boolean }> {
  try {
    const { data, error } = await supabase
      .from("gv_requests")
      .select("*")
      .eq("request_type", "leave")
      .order("created_at", { ascending: false });

    if (error) return { data: [], isFromSupabase: false };
    const rows = data || [];

    const mapped: LeaveRequest[] = rows.map((d: any) => ({
      id: d.id,
      applicant_name: d.applicant_or_child_name,
      applicant_role: "student",
      start_date: d.start_date || d.created_at?.slice(0, 10),
      end_date: d.end_date || d.created_at?.slice(0, 10),
      reason: d.reason_or_notes || "Personal",
      status: (d.status as any) || "Pending",
      applied_on: d.created_at || new Date().toISOString(),
    }));

    return { data: mapped, isFromSupabase: true };
  } catch {
    return { data: [], isFromSupabase: false };
  }
}

export async function createLeaveRequest(leave: Omit<LeaveRequest, "id">) {
  const newId = `LR-${Date.now().toString().slice(-4)}`;
  const payload = {
    id: newId,
    request_type: "leave",
    applicant_or_child_name: leave.applicant_name,
    reason_or_notes: leave.reason,
    status: leave.status || "Pending",
    start_date: leave.start_date,
    end_date: leave.end_date,
    created_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from("gv_requests").insert([payload]).select();
  return { data: data ? data[0] : payload, error: error?.message || null };
}

export interface PaymentTransaction {
  id: string;
  feeLedgerId?: string;
  studentId: string;
  receiptNo: string;
  amount: number;
  date: string;
  method: "Cash" | "UPI" | "Bank Transfer" | "Cheque";
  reference?: string;
  feeType: string;
  installmentNo: number;
  remarks?: string;
  collectedBy: string;
}

export interface FeeLedgerItem {
  id: string;
  studentId: string;
  studentName: string;
  admissionNo?: string;
  rollNo?: number;
  className: string;
  section?: string;
  feeType?: string;
  term?: string;
  academicYear?: string;
  receiptNumber?: string;
  paymentDate?: string;
  admissionFee?: number;
  originalFee: number;
  discountAmount: number;
  finalFee: number;
  amount: number;
  paid: number;
  remainingAmount: number;
  advanceAmount?: number;
  balance?: number;
  totalInstallments: number;
  paidInstallments: number;
  installmentsUsed?: number;
  status: "Paid" | "Partial" | "Pending";
  dueDate?: string;
  month?: string;
  lastPaymentDate?: string;
  payments: PaymentTransaction[];
  updatedAt?: string;
}

// ─── 1. CIRCULARS & NOTICES ──────────────────────────────────────────────

let memoryCircularsCache: Circular[] = [];

export function getCachedCircularsList(): Circular[] {
  if (memoryCircularsCache.length > 0) return memoryCircularsCache;
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("sunshine.circulars.cache.v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          memoryCircularsCache = parsed;
          return memoryCircularsCache;
        }
      }
    } catch { }
  }
  return memoryCircularsCache;
}

export function setCachedCircularsList(circulars: Circular[]) {
  if (!Array.isArray(circulars)) return;
  memoryCircularsCache = circulars;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("sunshine.circulars.cache.v1", JSON.stringify(circulars));
    } catch { }
  }
}

export async function fetchCirculars(): Promise<{ data: Circular[]; isFromSupabase: boolean }> {
  try {
    const { data, error } = await supabase
      .from("gv_communications")
      .select("*")
      .eq("message_type", "circular")
      .order("created_at", { ascending: false });


    if (error) return { data: [], isFromSupabase: false };

    const rows = data || [];
    const mapped: Circular[] = rows.map((d: any) => {
      let meta: any = {};
      try {
        meta = JSON.parse(d.body || "{}");
      } catch {
        meta = { description: d.body };
      }

      let recipientsList: string[] = [];
      if (Array.isArray(meta.recipients) && meta.recipients.length > 0) {
        recipientsList = meta.recipients
          .flatMap((r: any) => (typeof r === "string" ? r.split(",") : [String(r)]))
          .map((s: string) => s.trim())
          .filter(Boolean);
      } else if (typeof d.recipient_role === "string" && d.recipient_role.length > 0) {
        if (d.recipient_role.toLowerCase() === "all") {
          recipientsList = ["Parents", "Teachers", "Office Staff", "Admin"];
        } else {
          recipientsList = d.recipient_role.split(",").map((s: string) => s.trim()).filter(Boolean);
        }
      } else {
        recipientsList = ["Parents", "Teachers", "Office Staff"];
      }

      return {
        id: d.id,
        title: d.title || meta.subject || "School Notice",
        subject: meta.subject || d.title,
        description: meta.description || d.body || "",
        content: meta.description || d.body || "",
        published_date: d.published_at?.slice(0, 10) || meta.publishDate || new Date().toISOString().split("T")[0],
        publishDate: meta.publishDate || d.published_at?.slice(0, 10) || new Date().toISOString().split("T")[0],
        expiryDate: meta.expiryDate || "2026-12-31",
        target_audience: d.recipient_role || meta.target_audience || "All",
        recipients: recipientsList,
        author: d.sender_name || "Principal Office",
        priority: d.priority || meta.priority || "Medium",
        status: meta.status || "Published",
        attachment: meta.attachmentName,
        attachmentName: meta.attachmentName,
        attachmentUrl: d.attachment_url || meta.attachmentUrl,
        createdAt: d.created_at || d.published_at || new Date().toISOString(),
        history: Array.isArray(meta.history) && meta.history.length > 0
          ? meta.history
          : [{ at: d.created_at || new Date().toISOString(), action: meta.status || "Published" }],
      };
    });

    setCachedCircularsList(mapped);
    return { data: mapped, isFromSupabase: true };
  } catch {
    return { data: [], isFromSupabase: false };
  }
}

export async function createCircular(circular: any): Promise<{ data: any | null; error: string | null }> {
  try {
    const publishDate = circular.publishDate || circular.published_date || new Date().toISOString().slice(0, 10);
    const expiryDate = circular.expiryDate || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

    const validRecipients = (Array.isArray(circular.recipients) && circular.recipients.length > 0 ? circular.recipients : ["Parents", "Teachers", "Office Staff"])
      .map((r: any) => String(r).trim())
      .filter((r: string) => r !== "Admin");

    const meta = {
      subject: circular.subject || circular.title,
      description: circular.description || circular.content || circular.title,
      priority: circular.priority || "Medium",
      publishDate,
      expiryDate,
      recipients: validRecipients.length > 0 ? validRecipients : ["Parents", "Teachers", "Office Staff"],
      attachmentName: circular.attachmentName || circular.attachment,
      attachmentUrl: circular.attachmentUrl,
      status: circular.status || "Published",
      history: Array.isArray(circular.history) && circular.history.length > 0
        ? circular.history
        : [{ at: new Date().toISOString(), action: circular.status || "Published" }],
    };

    const targetId = circular.id && circular.id.trim().length > 0
      ? circular.id.trim()
      : `COM-CIRC-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const payload = {
      id: targetId,
      message_type: "circular",
      title: circular.title,
      body: JSON.stringify(meta),
      sender_id: circular.senderId || circular.sender_id || "PRINCIPAL001",
      sender_name: circular.senderName || circular.author || "Principal Office",
      sender_role: circular.senderRole || "principal",
      recipient_role: validRecipients.join(","),
      priority: circular.priority || "Medium",
      published_at: new Date().toISOString(),
    };

    let resultData = null;
    let resultErr = null;

    try {
      const { data, error } = await supabase.from("gv_communications").upsert([payload], { onConflict: "id" }).select();
      if (!error && data && data.length > 0) {
        resultData = data[0];
      } else if (error) {
        resultErr = error.message;
      }
    } catch (e: any) {
      resultErr = e?.message;
    }

    if (!resultData) {
      try {
        const res = await fetch(`${API_URL}/api/communications`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const json = await res.json();
          resultData = json.data ? (Array.isArray(json.data) ? json.data[0] : json.data) : payload;
          resultErr = null;
        }
      } catch (backendErr: any) {
        if (!resultErr) resultErr = backendErr?.message || "Failed to publish circular.";
      }
    }

    if (resultData) {
      pushAdminNotification(`New Circular: ${circular.title}`, "circular");
      notifyAutoRefresh("circulars");
      return { data: resultData, error: null };
    }

    return { data: null, error: resultErr || "Failed to publish circular." };
  } catch (err: any) {
    return { data: null, error: err?.message || "Failed to save circular." };
  }
}

export async function deleteCircular(id: string) {
  memoryCircularsCache = memoryCircularsCache.filter((c) => c.id !== id);
  const localList = getCachedCircularsList().filter((c) => c.id !== id);
  setCachedCircularsList(localList);

  try {
    const rawAlerts = localStorage.getItem("sunshine.alerts.v1");
    if (rawAlerts) {
      const alerts = JSON.parse(rawAlerts);
      if (Array.isArray(alerts)) {
        const updatedAlerts = alerts.filter((a: any) => a.id !== `AL-${id}` && a.id !== id);
        localStorage.setItem("sunshine.alerts.v1", JSON.stringify(updatedAlerts));
      }
    }
  } catch { }

  notifyAutoRefresh("circulars");

  try {
    const { error } = await supabase.from("gv_communications").delete().eq("id", id);
    return { error: error?.message || null };
  } catch (err: any) {
    return { error: err?.message || "Failed to delete circular." };
  }
}

// ─── 1.1 DIARY ENTRIES ────────────────────────────────────────────────────────
export interface DiaryEntry {
  id?: string;
  date: string;
  mood: string;
  note: string;
  author?: string;
  createdAt?: string;
}

export async function fetchDiaryEntries(): Promise<DiaryEntry[]> {
  try {
    const { data, error } = await supabase
      .from("gv_communications")
      .select("*")
      .eq("message_type", "diary")
      .order("created_at", { ascending: false });

    if (error || !data) return [];
    return data.map((d: any) => {
      let meta: any = {};
      try {
        if (d.body && (d.body.startsWith("{") || d.body.startsWith("["))) {
          meta = JSON.parse(d.body);
        }
      } catch { }
      return {
        id: d.id,
        date: meta.date || d.published_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
        mood: meta.mood || "😊",
        note: meta.note || d.body || d.title,
        author: d.sender_name || "Teacher",
        createdAt: d.created_at,
      };
    });
  } catch {
    return [];
  }
}

export async function createDiaryEntry(entry: { date: string; mood: string; note: string; author?: string }) {
  const newId = `COM-DIA-${Date.now().toString().slice(-4)}`;
  const meta = {
    date: entry.date,
    mood: entry.mood,
    note: entry.note,
  };
  const payload = {
    id: newId,
    message_type: "diary",
    title: `Daily Diary - ${entry.date}`,
    body: JSON.stringify(meta),
    sender_id: (entry as any).senderId || (entry as any).sender_id || "TCH100",
    sender_name: (entry as any).senderName || entry.author || "Class Teacher",
    sender_role: (entry as any).senderRole || "teacher",
    recipient_role: "all",
    published_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from("gv_communications").insert([payload]).select();
  notifyAutoRefresh("diary");
  return { data, error };
}

// ─── 2. STUDENTS ─────────────────────────────────────────────────────────────

let memoryStudentsCache: Student[] = [];

export function getCachedStudentsList(): Student[] {
  if (memoryStudentsCache.length > 0) return normalizeStudents(memoryStudentsCache);
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(getUserScopedStorageKey("sunshine.students.cache.v1"));
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          memoryStudentsCache = normalizeStudents(parsed);
          return memoryStudentsCache;
        }
      }
    } catch { }
  }
  return normalizeStudents(memoryStudentsCache);
}

export function setCachedStudentsList(students: Student[]) {
  if (!Array.isArray(students)) return;
  memoryStudentsCache = normalizeStudents(students);
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(getUserScopedStorageKey("sunshine.students.cache.v1"), JSON.stringify(memoryStudentsCache));
    } catch { }
  }
}

import { getSession, safeNormalizeId } from "./auth";
import { readAssignments } from "./classAssignmentContext";

export async function fetchStudents(classNameFilter?: string, sectionFilter?: string): Promise<{ data: Student[]; isFromSupabase: boolean }> {
  const normClass = classNameFilter && classNameFilter !== "all" ? classNameFilter : "all";
  const normSec = sectionFilter && sectionFilter !== "all" ? sectionFilter : "all";
  const cacheKey = `fetchStudents_${normClass}_${normSec}`;

  return dedupeAndCacheFetch(cacheKey, async () => {
    // 1. Primary: Query production Backend API endpoint (bypasses Supabase client RLS restrictions)
    try {
      const res = await fetch(`${API_URL}/api/users?role=student`);
      if (res.ok) {
        const json = await res.json();
        const rows = json.data || json || [];
        if (Array.isArray(rows) && rows.length > 0) {
          const staffRoles = ["teacher", "office", "principal", "admin", "super-admin", "developer", "accountant"];
          const filteredRows = rows.filter((d: any) => {
            const r = (d.role || "").toLowerCase();
            return !staffRoles.includes(r);
          });

          const mapped: Student[] = filteredRows.map((d: any) => {
            const normClsSec = normalizeClassAndSection(d.class_name || d.className, d.section);
            return {
              id: d.id || d.login_id,
              rollNo: d.roll_no ? Number(d.roll_no) : (d.rollNo ? Number(d.rollNo) : undefined as any),
              admissionNo: toCanonicalAdmissionNo(d.admission_no || d.admissionNo, d.id),
              name: d.full_name || d.name || "Student",
              age: d.age ? Number(d.age) : 4,
              dob: d.date_of_birth || d.dob || undefined as any,
              className: normClsSec.className as any,
              section: normClsSec.section as any,
              parent: d.parent_name || d.parent || "Parent",
              parentId: d.parent_id || d.parentId || `PAR-${d.id}`,
              phone: d.mobile || d.phone || undefined as any,
              gender: d.gender ? (d.gender === "Girl" || d.gender === "Female" ? "Girl" : "Boy") : (undefined as any),
              house: d.house || undefined as any,
              address: d.address || undefined,
              email: d.email || d.parent_email || d.parentEmail || undefined,
              occupation: d.occupation || d.parent_occupation || d.father_occupation || d.fatherOccupation || undefined,
              bloodGroup: d.blood_group || d.bloodGroup || undefined,
              admissionDate: d.created_at?.slice(0, 10) || d.admissionDate || undefined as any,
              feeStatus: (d.fee_status || d.feeStatus || "Pending") as any,
              avatar: d.photo_url || d.avatar_url || d.avatar || `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(d.full_name || d.name || "Student")}`,
              attendance: (d.attendance_pct !== undefined && d.attendance_pct !== null) ? Number(d.attendance_pct) : (d.attendance !== undefined ? Number(d.attendance) : undefined as any),
              branch: d.branch || "Main Branch",
            };
          });

          let result = mapped;
          if (classNameFilter && classNameFilter !== "all") {
            const normFilter = normalizeClassAndSection(classNameFilter, sectionFilter);
            result = result.filter((s) => s.className.toLowerCase() === normFilter.className.toLowerCase());
          }
          if (sectionFilter && sectionFilter !== "all") {
            result = result.filter((s) => s.section.toLowerCase() === sectionFilter.toLowerCase());
          }

          const normalized = normalizeStudents(result);
          if (normalized.length > 0) {
            setCachedStudentsList(normalized);
            return { data: normalized, isFromSupabase: true };
          }
        }
      }
    } catch { }

    // 2. Secondary Fallback: Direct Supabase client query
    try {
      let query = supabase
        .from("gv_users")
        .select("*")
        .or("role.eq.student,role.eq.Student,role.ilike.*student*");

      if (classNameFilter && classNameFilter !== "all") {
        const normFilter = normalizeClassAndSection(classNameFilter, sectionFilter);
        query = query.or(`class_name.eq.${classNameFilter},class_name.eq.${normFilter.className},class_name.ilike.%${normFilter.className}%`);
      }
      if (sectionFilter && sectionFilter !== "all") {
        query = query.eq("section", sectionFilter);
      }

      const { data, error } = await query.order("full_name", { ascending: true });

      if (!error && data && data.length > 0) {
        const staffRoles = ["teacher", "office", "principal", "admin", "super-admin", "developer", "accountant"];
        const rows = data.filter((d: any) => {
          const r = (d.role || "").toLowerCase();
          return !staffRoles.includes(r);
        });

        const feeStatusMap = new Map<string, string>();
        try {
          const { data: feeRows } = await supabase
            .from("gv_fees_payments")
            .select("student_id, student_name, status")
            .eq("record_type", "fee_schedule");
          (feeRows || []).forEach((f: any) => {
            if (f.status) {
              if (f.student_id) feeStatusMap.set(String(f.student_id).toLowerCase(), f.status);
              if (f.student_name) feeStatusMap.set(String(f.student_name).toLowerCase(), f.status);
            }
          });
        } catch { }

        const mapped: Student[] = rows.map((d: any) => {
          const sId = (d.id || d.login_id || "").toLowerCase();
          const sAdm = toCanonicalAdmissionNo(d.admission_no || d.admissionNo, d.id).toLowerCase();
          const sName = (d.full_name || d.name || "").toLowerCase();
          const liveStatus = feeStatusMap.get(sId) || feeStatusMap.get(sAdm) || feeStatusMap.get(sName) || d.fee_status || d.feeStatus || "Pending";
          const normClsSec = normalizeClassAndSection(d.class_name || d.className, d.section);

          return {
            id: d.id || d.login_id,
            rollNo: d.roll_no ? Number(d.roll_no) : (d.rollNo ? Number(d.rollNo) : undefined as any),
            admissionNo: toCanonicalAdmissionNo(d.admission_no || d.admissionNo, d.id),
            name: d.full_name || d.name || "Student",
            age: d.age ? Number(d.age) : 4,
            dob: d.date_of_birth || d.dob || undefined as any,
            className: normClsSec.className as any,
            section: normClsSec.section as any,
            parent: d.parent_name || d.parent || "Parent",
            parentId: d.parent_id || d.parentId || `PAR-${d.id}`,
            phone: d.mobile || d.phone || undefined as any,
            gender: d.gender ? (d.gender === "Girl" || d.gender === "Female" ? "Girl" : "Boy") : (undefined as any),
            house: d.house || undefined as any,
            address: d.address || undefined,
            email: d.email || d.parent_email || d.parentEmail || undefined,
            occupation: d.occupation || d.parent_occupation || d.father_occupation || d.fatherOccupation || undefined,
            bloodGroup: d.blood_group || d.bloodGroup || undefined,
            admissionDate: d.created_at?.slice(0, 10) || d.admissionDate || undefined as any,
            feeStatus: liveStatus as any,
            avatar: d.photo_url || d.avatar_url || d.avatar || `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(d.full_name || d.name || "Student")}`,
            attendance: (d.attendance_pct !== undefined && d.attendance_pct !== null) ? Number(d.attendance_pct) : (d.attendance !== undefined ? Number(d.attendance) : undefined as any),
            branch: d.branch || "Main Branch",
          };
        });

        const normalized = normalizeStudents(mapped);
        if (normalized.length > 0) {
          setCachedStudentsList(normalized);
          return { data: normalized, isFromSupabase: true };
        }
      }
    } catch { }

    const cached = getCachedStudentsList();
    if (cached && cached.length > 0) {
      return { data: cached, isFromSupabase: false };
    }
    return { data: [], isFromSupabase: false };
  }, { ttlMs: 15000 });
}


export async function createStudent(student: Omit<Student, "id"> & {
  id?: string;
  fatherName?: string;
  motherName?: string;
  guardianName?: string;
  occupation?: string;
  address?: string;
  email?: string;
}) {
  const existingList = getCachedStudentsList();
  const cleanPhone = (student.phone || "").replace(/[^0-9]/g, "");
  const cleanName = (student.parent || student.fatherName || student.motherName || "").trim().toLowerCase();

  let existingParentStudent = existingList.find((s) => {
    const pPhone = (s.phone || "").replace(/[^0-9]/g, "");
    const pName = (s.parent || "").trim().toLowerCase();
    return (cleanPhone.length >= 10 && pPhone.endsWith(cleanPhone.slice(-10))) || (cleanName.length > 0 && pName === cleanName);
  });

  if (!existingParentStudent && (cleanPhone.length >= 10 || cleanName.length > 0)) {
    try {
      let query = supabase.from("gv_users").select("id, parent_id, parent_name, mobile").or("role.eq.student,role.eq.Student,role.ilike.*student*");
      if (cleanPhone.length >= 10) {
        query = query.ilike("mobile", `%${cleanPhone.slice(-10)}%`);
      } else if (cleanName.length > 0) {
        query = query.ilike("parent_name", `%${cleanName}%`);
      }
      const { data: dbMatches } = await query;
      if (dbMatches && dbMatches.length > 0) {
        const match = dbMatches[0];
        existingParentStudent = {
          id: match.id,
          parentId: match.parent_id,
          parent: match.parent_name,
          phone: match.mobile,
        } as any;
      }
    } catch { }
  }

  const ts = Date.now().toString();
  const newId = student.id || `STU-${ts.slice(-6)}`;
  const parentId =
    student.parentId ||
    existingParentStudent?.parentId ||
    (cleanPhone.length >= 10
      ? `PAR-${cleanPhone.slice(-10)}`
      : `PAR-${cleanName.replace(/[^a-z0-9]/g, "") || ts.slice(-6)}`);

  const admissionYear = new Date().getFullYear();
  const canonicalAdmNo = student.admissionNo
    ? toCanonicalAdmissionNo(student.admissionNo, newId, admissionYear)
    : getNextAdmissionNo(existingList, admissionYear);

  const newStuObj: Student = {
    id: newId,
    rollNo: student.rollNo || 1,
    admissionNo: canonicalAdmNo,
    name: student.name,
    age: student.age || 4,
    dob: student.dob || "2022-01-01",
    className: student.className || "Nursery",
    section: student.section || "A",
    parent: student.parent || student.fatherName || student.motherName || "Parent",
    parentId: parentId,
    phone: student.phone || "9876543210",
    gender: student.gender || "Boy",
    house: student.house || "Red",
    admissionDate: student.admissionDate || new Date().toISOString().split("T")[0],
    feeStatus: student.feeStatus || "Pending",
    avatar: student.avatar || `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(student.name)}`,
    attendance: student.attendance || 100,
    branch: student.branch || "Main Branch",
    email: student.email || undefined,
    address: student.address || undefined,
    occupation: student.occupation || undefined,
  };

  const payload = {
    id: newId,
    login_id: newId,
    email: student.email || `${newId.toLowerCase()}@sunshine.edu`,
    admission_no: canonicalAdmNo,
    full_name: student.name,
    role: "student",
    class_name: student.className || "Nursery",
    section: student.section || "A",
    parent_name: student.parent || student.fatherName || student.motherName || "Parent",
    parent_id: parentId,
    mobile: student.phone || "9876543210",
    gender: student.gender || "Boy",
    house: student.house || "Red",
    fee_status: student.feeStatus || "Pending",
    status: "active",
    photo_url: student.avatar,
    occupation: student.occupation,
    address: student.address,
  };

  try {
    const { data, error } = await supabase.from("gv_users").insert([payload]).select();
    if (!error && data && data[0]) {
      const serverStu: Student = {
        ...newStuObj,
        id: data[0].id || data[0].login_id || newId,
        admissionNo: data[0].admission_no || newStuObj.admissionNo,
      };

      const customFeeAmt = Number((student as any).feeAmount ?? 15000);
      const customFeePlan = (student as any).feePlan || "Standard";
      saveFeeRecord({
        id: `FS-${serverStu.id}`,
        studentId: serverStu.id,
        studentName: serverStu.name,
        admissionNo: serverStu.admissionNo,
        className: serverStu.className || "Nursery",
        section: serverStu.section || "A",
        rollNo: serverStu.rollNo || 0,
        originalFee: customFeeAmt,
        discountAmount: 0,
        finalFee: customFeeAmt,
        paid: 0,
        remainingAmount: customFeeAmt,
        advanceAmount: 0,
        amount: customFeeAmt,
        balance: customFeeAmt,
        status: "Pending",
        totalInstallments: 3,
        paidInstallments: 0,
        academicYear: "2026-2027",
        feeType: customFeePlan,
        payments: [],
      } as any).catch(() => { });

      setCachedStudentsList([serverStu, ...getCachedStudentsList().filter((s) => s.id !== serverStu.id && s.id !== newStuObj.id)]);
      notifyAutoRefresh("students");
      notifyAutoRefresh("admissions");
      notifyAutoRefresh("reports");
      notifyAutoRefresh("fees");
      notifyAutoRefresh("classes");
      return { data: serverStu, error: null };
    }

    try {
      const res = await fetch(`${API_URL}/api/users/provision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const json = await res.json();
        const row = json.data || payload;
        const serverStu: Student = {
          ...newStuObj,
          id: row.id || row.login_id || newId,
          admissionNo: row.admission_no || newStuObj.admissionNo,
        };
        setCachedStudentsList([serverStu, ...getCachedStudentsList().filter((s) => s.id !== serverStu.id && s.id !== newStuObj.id)]);
        notifyAutoRefresh("students");
        notifyAutoRefresh("admissions");
        notifyAutoRefresh("reports");
        notifyAutoRefresh("fees");
        notifyAutoRefresh("classes");
        return { data: serverStu, error: null };
      }
    } catch { }

    return { data: null, error: error?.message || "Failed to create student in database." };
  } catch (err: any) {
    return { data: null, error: err?.message || "Failed to create student in database." };
  }
}

export async function updateStudent(id: string, updates: Partial<Student>) {
  const currentList = getCachedStudentsList();
  const updatedList = currentList.map((s) => {
    if (s.id === id || s.admissionNo === id) {
      return { ...s, ...updates };
    }
    return s;
  });
  setCachedStudentsList(updatedList);
  notifyAutoRefresh("students");

  try {
    const payload: Record<string, any> = {};
    if (updates.name) payload.full_name = updates.name;
    if (updates.className) payload.class_name = updates.className;
    if (updates.section) payload.section = updates.section;
    if (updates.parent) payload.parent_name = updates.parent;
    if (updates.phone) payload.mobile = updates.phone;
    if (updates.email) payload.email = updates.email;
    if (updates.gender) payload.gender = updates.gender;
    if (updates.house) payload.house = updates.house;
    if (updates.address) payload.address = updates.address;
    if (updates.feeStatus) payload.fee_status = updates.feeStatus;
    if (updates.avatar) payload.photo_url = updates.avatar;

    let { data } = await supabase.from("gv_users").update(payload).eq("login_id", id).select();
    if (!data || data.length === 0) {
      const fallback = await supabase.from("gv_users").update(payload).eq("id", id).select();
      data = fallback.data;
    }
    if (!data || data.length === 0) {
      const fallbackAdm = await supabase.from("gv_users").update(payload).eq("admission_no", id).select();
      data = fallbackAdm.data;
    }
    const updatedObj = updatedList.find((s) => s.id === id || s.admissionNo === id);
    invalidateCache("fetchStudents");
    notifyAutoRefresh("students");
    notifyAutoRefresh("admissions");
    notifyAutoRefresh("reports");
    notifyAutoRefresh("fees");
    return { data: data && data.length > 0 ? data : [updatedObj], error: null };
  } catch (err: any) {
    const updatedObj = updatedList.find((s) => s.id === id || s.admissionNo === id);
    return { data: [updatedObj], error: null };
  }
}

export async function deleteStudent(id: string) {
  const currentList = getCachedStudentsList();
  const updatedList = currentList.filter((s) => s.id !== id && s.admissionNo !== id);
  setCachedStudentsList(updatedList);
  invalidateCache("fetchStudents");
  notifyAutoRefresh("students");

  try {
    const { error } = await supabase.from("gv_users").delete().or(`id.eq.${id},login_id.eq.${id},admission_no.eq.${id}`);
    fetchStudents();
    notifyAutoRefresh("students");
    notifyAutoRefresh("admissions");
    notifyAutoRefresh("reports");
    notifyAutoRefresh("fees");
    return { error: error?.message || null };
  } catch (err: any) {
    return { error: err?.message || "Failed to delete student." };
  }
}

export async function allocateRollNumbersAlphabetically(targetClass?: string, targetSection?: string) {
  try {
    const { data: students } = await fetchStudents();
    let filtered = students;
    if (targetClass) filtered = filtered.filter((s) => s.className === targetClass);
    if (targetSection) filtered = filtered.filter((s) => s.section === targetSection);

    let updatedCount = 0;
    const sorted = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    for (let i = 0; i < sorted.length; i++) {
      const s = sorted[i];
      const newRoll = i + 1;
      s.rollNo = newRoll;
      updatedCount++;
    }
    setCachedStudentsList(students);
    notifyAutoRefresh("students");
    return { count: updatedCount };
  } catch (err: any) {
    return { count: 0, error: err?.message };
  }
}

// ─── 3. TEACHERS & STAFF ──────────────────────────────────────────────────

let memoryTeachersCache: Teacher[] = [];

export function getCachedTeachersList(): Teacher[] {
  if (memoryTeachersCache.length > 0) return memoryTeachersCache;
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(getUserScopedStorageKey("sunshine.teachers.cache.v1"));
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          memoryTeachersCache = parsed;
          return memoryTeachersCache;
        }
      }
    } catch { }
  }
  return memoryTeachersCache;
}

export function setCachedTeachersList(teachers: Teacher[]) {
  if (!Array.isArray(teachers)) return;
  memoryTeachersCache = teachers;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(getUserScopedStorageKey("sunshine.teachers.cache.v1"), JSON.stringify(teachers));
    } catch { }
  }
}

export async function fetchTeachers(): Promise<{ data: Teacher[]; isFromSupabase: boolean }> {
  try {
    const { data, error } = await supabase
      .from("gv_users")
      .select("*")
      .or("role.ilike.%teacher%,role.eq.teacher,role.eq.Teacher")
      .order("full_name", { ascending: true });

    if (!error && data && data.length > 0) {
      const rows = data || [];
      const mapped: Teacher[] = rows.map((d: any) => {
        let extraMeta: any = {};
        try {
          if (d.address && d.address.startsWith("{")) {
            extraMeta = JSON.parse(d.address);
          }
        } catch { }

        return {
          id: d.id || d.login_id,
          name: sanitizeTeacherName(d.full_name || d.name, d.login_id),
          className: d.class_name || "",
          subject: d.subject || "General",
          email: d.email || `${(d.full_name || "teacher").toLowerCase().replace(/\s+/g, ".")}@sunshine.edu`,
          phone: d.mobile || "9876543210",
          experience: d.experience || 2,
          joined: d.created_at?.slice(0, 10) || new Date().toISOString().split("T")[0],
          avatar: d.photo_url || d.avatar_url || d.avatar || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(d.full_name || "Teacher")}`,
          branch: d.branch || "Main Branch",
          department: extraMeta.department || d.department || undefined,
          role: d.role || "teacher",
        };
      });

      setCachedTeachersList(mapped);
      return { data: mapped, isFromSupabase: true };
    }

    const cached = getCachedTeachersList();
    if (cached && cached.length > 0) {
      return { data: cached, isFromSupabase: false };
    }
    return { data: [], isFromSupabase: false };
  } catch {
    const cached = getCachedTeachersList();
    if (cached && cached.length > 0) {
      return { data: cached, isFromSupabase: false };
    }
    return { data: [], isFromSupabase: false };
  }
}


export async function createTeacher(teacher: Omit<Teacher, "id"> & { id?: string }) {
  const newId = teacher.id || `TCH-${Date.now().toString().slice(-4)}`;
  const newTeachObj: Teacher = {
    id: newId,
    name: teacher.name,
    className: teacher.className || "Nursery A",
    subject: teacher.subject || "General",
    email: teacher.email || `${newId.toLowerCase()}@sunshine.edu`,
    phone: teacher.phone || "9876543210",
    experience: teacher.experience || 1,
    joined: new Date().toISOString().split("T")[0],
    avatar: teacher.avatar || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(teacher.name)}`,
    branch: teacher.branch || "Main Branch",
  };

  const localList = getCachedTeachersList();
  setCachedTeachersList([newTeachObj, ...localList.filter((t) => t.id !== newId)]);
  notifyAutoRefresh("staff");

  const payload = {
    id: newId,
    login_id: newId,
    email: teacher.email || `${newId.toLowerCase()}@sunshine.edu`,
    full_name: teacher.name,
    role: "teacher",
    status: "active",
    employee_id: `EMP-${newId}`,
    class_name: teacher.className || "Nursery A",
    subject: teacher.subject || "General",
    mobile: teacher.phone || "9876543210",
    experience: teacher.experience || 1,
    branch: teacher.branch || "Main Branch",
    photo_url: teacher.avatar,
  };

  try {
    const { data, error } = await supabase.from("gv_users").insert([payload]).select();
    try {
      import("./credentials").then(({ generateTeacherCredential }) => {
        generateTeacherCredential(newId, { teacher: newTeachObj });
      });
    } catch { }
    return { data: data ? data[0] : newTeachObj, error: error?.message || null };
  } catch (err: any) {
    return { data: newTeachObj, error: null };
  }
}

export async function updateTeacher(id: string, updates: Partial<Teacher>) {
  const currentList = getCachedTeachersList();
  const updatedList = currentList.map((t) => {
    if (t.id === id) {
      return { ...t, ...updates };
    }
    return t;
  });
  setCachedTeachersList(updatedList);
  notifyAutoRefresh("staff");

  try {
    const payload: Record<string, any> = {};
    if (updates.name) payload.full_name = updates.name;
    if (updates.className) payload.class_name = updates.className;
    if (updates.subject) payload.subject = updates.subject;
    if (updates.phone) payload.mobile = updates.phone;
    if (updates.email) payload.email = updates.email;
    if (updates.avatar) {
      payload.photo_url = updates.avatar;
    }

    let { data } = await supabase.from("gv_users").update(payload).eq("login_id", id).select();
    if (!data || data.length === 0) {
      const fallback = await supabase.from("gv_users").update(payload).eq("id", id).select();
      data = fallback.data;
    }
    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: null };
  }
}

export async function deleteTeacher(id: string) {
  const currentList = getCachedTeachersList();
  const updatedList = currentList.filter((t) => t.id !== id);
  setCachedTeachersList(updatedList);
  notifyAutoRefresh("staff");

  try {
    const { error } = await supabase.from("gv_users").delete().or(`id.eq.${id},login_id.eq.${id}`);
    fetchTeachers();
    return { error: error?.message || null };
  } catch (err: any) {
    return { error: err?.message || "Failed to delete teacher." };
  }
}

// ─── 4. ENQUIRIES ─────────────────────────────────────────────────────────

const ENQUIRIES_STORAGE_KEY = "sunshine.enquiries.cache.v1";

export function getStoredEnquiries(): Enquiry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ENQUIRIES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStoredEnquiries(list: Enquiry[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ENQUIRIES_STORAGE_KEY, JSON.stringify(list));
  } catch { }
}

export async function fetchEnquiries(): Promise<{ data: Enquiry[]; isFromSupabase: boolean }> {
  try {
    const { data, error } = await supabase
      .from("gv_requests")
      .select("*")
      .eq("request_type", "enquiry")
      .order("created_at", { ascending: false });

    if (error) return { data: [], isFromSupabase: false };

    const rows = data || [];
    let enrolledStudentsSet = new Set<string>();
    try {
      const { data: stList } = await fetchStudents();
      if (stList && stList.length > 0) {
        stList.forEach((s) => {
          if (s.name) enrolledStudentsSet.add(s.name.trim().toLowerCase());
          if (s.phone) enrolledStudentsSet.add((s.phone || "").replace(/\D/g, "").slice(-10));
        });
      }
    } catch { }

    const normalizeStatus = (s: string, childName?: string, phone?: string): Enquiry["status"] => {
      if (!s) {
        const cName = (childName || "").trim().toLowerCase();
        const pNum = (phone || "").replace(/\D/g, "").slice(-10);
        if ((cName && enrolledStudentsSet.has(cName)) || (pNum && enrolledStudentsSet.has(pNum))) {
          return "Enrolled";
        }
        return "New";
      }
      const st = s.trim().toLowerCase();
      if (st.includes("enroll") || st.includes("convert")) return "Enrolled";
      if (st.includes("completed")) return "Visit Completed";
      if (st.includes("doc")) return "Documents Pending";
      if (st.includes("approv")) return "Admission Approved";
      if (st.includes("drop") || st.includes("cancel")) return "Dropped";
      if (st.includes("schedul")) return "Visit Scheduled";
      if (st.includes("contact")) return "Contacted";

      const cName = (childName || "").trim().toLowerCase();
      const pNum = (phone || "").replace(/\D/g, "").slice(-10);
      if ((cName && enrolledStudentsSet.has(cName)) || (pNum && enrolledStudentsSet.has(pNum))) {
        return "Enrolled";
      }
      return "New";
    };

    const mapped: Enquiry[] = rows.map((d: any) => {
      const childName = d.applicant_or_child_name || "Child";
      const phone = d.phone || "";
      const status = normalizeStatus(d.status, childName, phone);
      const createdDate = d.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10);
      return {
        id: d.id,
        childName,
        parentName: d.parent_name || "Parent",
        phone,
        altPhone: "",
        email: d.email || "",
        address: d.address || "",
        gender: d.gender === "Girl" ? "Girl" : "Boy",
        dob: d.dob || "2022-01-01",
        previousSchool: "",
        age: 3,
        interestedClass: d.leave_type_or_interested_class || "Nursery",
        source: d.source || "Walk-in",
        status,
        stage: status,
        targetClass: d.leave_type_or_interested_class || "Nursery",
        createdDate,
        followUp: d.follow_up_date || createdDate,
        notes: d.reason_or_notes || "",
        createdAt: d.created_at || new Date().toISOString(),
      };
    });

    saveStoredEnquiries(mapped);
    return { data: mapped, isFromSupabase: true };
  } catch {
    return { data: [], isFromSupabase: false };
  }
}

export async function createEnquiry(enquiry: Omit<Enquiry, "id" | "createdAt">) {
  const ts = Date.now().toString();
  const newId = `REQ-ENQ-${ts.slice(-6)}`;
  const payload = {
    id: newId,
    request_type: "enquiry",
    applicant_or_child_name: enquiry.childName,
    parent_name: enquiry.parentName,
    phone: enquiry.phone,
    email: enquiry.email && enquiry.email.trim() ? enquiry.email : null,
    address: enquiry.address && enquiry.address.trim() ? enquiry.address : null,
    gender: enquiry.gender || "Boy",
    dob: enquiry.dob && enquiry.dob.trim() ? enquiry.dob : null,
    leave_type_or_interested_class: enquiry.interestedClass,
    source: enquiry.source || "Walk-in",
    status: enquiry.status || "New",
    follow_up_date: enquiry.followUp && enquiry.followUp.trim() ? enquiry.followUp : null,
    reason_or_notes: enquiry.notes && enquiry.notes.trim() ? enquiry.notes : null,
  };

  const newEnqObj: Enquiry = {
    id: newId,
    childName: enquiry.childName,
    parentName: enquiry.parentName,
    phone: enquiry.phone,
    altPhone: "",
    email: enquiry.email || "",
    address: enquiry.address || "",
    gender: enquiry.gender || "Boy",
    dob: enquiry.dob || "2022-01-01",
    previousSchool: "",
    age: (enquiry as any).age || 3,
    interestedClass: enquiry.interestedClass,
    source: enquiry.source || "Walk-in",
    status: enquiry.status || "New",
    followUp: enquiry.followUp || new Date().toISOString().split("T")[0],
    notes: enquiry.notes || "",
    createdAt: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase.from("gv_requests").insert([payload]).select();
    return { data: data || [newEnqObj], error: error?.message || null };
  } catch (err: any) {
    return { data: [newEnqObj], error: null };
  }
}

export interface FeeComponents {
  tuitionFee: number;
  developmentFee: number;
  examinationFee: number;
}

export function calculateFeeComponents(finalFee: number): FeeComponents {
  const safeFee = Math.max(0, Math.round(finalFee));
  const tuitionFee = Math.round(safeFee * 0.6);
  const developmentFee = Math.round(safeFee * 0.2);
  const examinationFee = safeFee - tuitionFee - developmentFee;
  return {
    tuitionFee,
    developmentFee,
    examinationFee,
  };
}

export interface FeeLedgerItem {
  id: string;
  studentId: string;
  studentName: string;
  admissionNo?: string;
  rollNo?: number;
  className: string;
  section?: string;
  feeType?: string;
  term?: string;
  academicYear?: string;
  receiptNumber?: string;
  paymentDate?: string;
  admissionFee?: number;
  originalFee: number;
  discountAmount: number;
  finalFee: number;
  feeComponents?: FeeComponents;
  amount: number;
  paid: number;
  remainingAmount: number;
  advanceAmount?: number;
  balance?: number;
  totalInstallments: number;
  paidInstallments: number;
  installmentsUsed?: number;
  status: "Paid" | "Partial" | "Pending";
  dueDate?: string;
  month?: string;
  lastPaymentDate?: string;
  payments: PaymentTransaction[];
  updatedAt?: string;
}

// ─── 5. FEES & PAYMENTS ───────────────────────────────────────────────────

const FEE_OVERRIDES_CACHE_KEY = "sunshine.fee_overrides.v1";

export interface FeeOverrideRecord {
  originalFee: number;
  discountAmount: number;
  finalFee: number;
  feeComponents?: FeeComponents;
  feeType?: string;
  updatedAt: string;
}

export function getStoredFeeOverrides(): Record<string, FeeOverrideRecord> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(FEE_OVERRIDES_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveStoredFeeOverride(
  studentId: string,
  admissionNo: string,
  studentName: string,
  override: { originalFee: number; discountAmount: number; finalFee: number; feeComponents?: FeeComponents; feeType?: string }
) {
  if (typeof window === "undefined") return;
  try {
    const overrides = getStoredFeeOverrides();
    const rec: FeeOverrideRecord = {
      ...override,
      feeComponents: override.feeComponents || calculateFeeComponents(override.finalFee),
      updatedAt: new Date().toISOString(),
    };
    if (studentId) overrides[studentId.toLowerCase()] = rec;
    if (admissionNo) {
      overrides[admissionNo.toLowerCase()] = rec;
      const canonical = toCanonicalAdmissionNo(admissionNo, studentId).toLowerCase();
      overrides[canonical] = rec;
    }
    if (studentName) overrides[studentName.toLowerCase()] = rec;
    localStorage.setItem(FEE_OVERRIDES_CACHE_KEY, JSON.stringify(overrides));
  } catch { }
}

export function recalculateFeeLedger(ledger: Partial<FeeLedgerItem>): FeeLedgerItem {
  const payments = Array.isArray(ledger.payments) ? ledger.payments : [];
  const paymentsSum = payments.reduce((acc, p) => acc + Number(p.amount || 0), 0);

  const rawOrig = Number(ledger.originalFee ?? ledger.amount ?? 0);
  const originalFee = Math.max(0, rawOrig);
  const discountAmount = Math.max(0, Number(ledger.discountAmount ?? 0));
  const finalFee = Math.max(0, originalFee - discountAmount);
  const admissionFee = Number(ledger.admissionFee ?? (ledger as any).initialFee ?? finalFee);
  const feeComponents = calculateFeeComponents(finalFee);

  // Authoritative Raw Paid Total from actual payment transactions / records
  const rawPaid = payments.length > 0 ? paymentsSum : Math.max(0, Number(ledger.paid || 0));

  // Consistent fee-change rules:
  // 1. Never increase paid amount automatically (e.g. if paid ₹8k, changing total must not change paid to ₹10k)
  // 2. If total was fully paid ₹15k and later reduced to ₹10k, cap displayed paid amount at ₹10k and recalculate balance/status
  const paid = finalFee > 0 ? Math.min(rawPaid, finalFee) : rawPaid;

  // Authoritative calculations
  const remainingAmount = Math.max(0, finalFee - rawPaid);
  const advanceAmount = Math.max(0, rawPaid - finalFee);
  const status: "Paid" | "Partial" | "Pending" =
    remainingAmount === 0 && finalFee > 0
      ? "Paid"
      : paid > 0
        ? "Partial"
        : "Pending";

  return {
    id: ledger.id || `FP-${Date.now()}`,
    studentId: ledger.studentId || "",
    studentName: ledger.studentName || "Student",
    admissionNo: ledger.admissionNo || ledger.studentId || "",
    className: ledger.className || "Nursery",
    section: ledger.section || "A",
    rollNo: ledger.rollNo || 1,
    feeType: ledger.feeType || (ledger as any).feeType || "Standard",
    admissionFee,
    originalFee,
    discountAmount,
    finalFee,
    feeComponents,
    paid,
    remainingAmount,
    advanceAmount,
    amount: finalFee,
    balance: remainingAmount,
    status,
    totalInstallments: ledger.totalInstallments || 3,
    paidInstallments: payments.length > 0 ? payments.length : (paid >= finalFee && finalFee > 0 ? 3 : paid > 0 ? 1 : 0),
    term: (ledger as any).term || "Full Year",
    academicYear: ledger.academicYear || "2026-2027",
    receiptNumber: (ledger as any).receiptNumber,
    paymentDate: (ledger as any).paymentDate,
    payments,
  };
}

export interface ParentFeeView {
  totalFee: number;
  paid: number;
  remainingAmount: number;
  status: "Paid" | "Partially Paid" | "Unpaid";
  payments: PaymentTransaction[];
}

export function getParentFeeView(feeRecord: FeeLedgerItem | null): ParentFeeView {
  if (!feeRecord) {
    return {
      totalFee: 0,
      paid: 0,
      remainingAmount: 0,
      status: "Unpaid",
      payments: [],
    };
  }

  const payments = Array.isArray(feeRecord.payments) ? feeRecord.payments : [];
  const paymentsSum = payments.reduce((acc, p) => acc + Number(p.amount || 0), 0);

  const origFee = Number(feeRecord.originalFee ?? feeRecord.amount ?? 0);
  const discAmt = Number(feeRecord.discountAmount ?? 0);
  const currentFinalFee = Math.max(0, origFee - discAmt);
  const admissionFee = Number(feeRecord.admissionFee ?? (feeRecord as any).initialFee ?? currentFinalFee);

  const totalPaid = payments.length > 0 ? paymentsSum : Math.max(0, Number(feeRecord.paid || 0));

  // Parent Fee Visibility Rules:
  // - Parents normally see the fee entered by Office staff during admission (admissionFee).
  // - If fee changes BEFORE any payment (totalPaid === 0), updated fee (currentFinalFee) may be shown.
  // - If fee is changed AFTER payment has started or after full collection (totalPaid > 0),
  //   do NOT automatically show that later administrative change to the parent.
  //   Freeze/cap displayed totalFee for parent at admissionFee (or currentFinalFee if fully paid).

  let parentTotalFee = currentFinalFee;

  if (totalPaid > 0) {
    if (totalPaid >= currentFinalFee && currentFinalFee > 0) {
      parentTotalFee = currentFinalFee;
    } else {
      parentTotalFee = Math.max(totalPaid, admissionFee);
    }
  }

  const parentPaid = Math.min(totalPaid, parentTotalFee);
  const parentRemaining = Math.max(0, parentTotalFee - parentPaid);

  let parentStatus: "Paid" | "Partially Paid" | "Unpaid" = "Unpaid";
  if (parentRemaining === 0 && parentTotalFee > 0) {
    parentStatus = "Paid";
  } else if (parentPaid > 0) {
    parentStatus = "Partially Paid";
  }

  return {
    totalFee: parentTotalFee,
    paid: parentPaid,
    remainingAmount: parentRemaining,
    status: parentStatus,
    payments,
  };
}

export async function fetchMergedFeeLedgers(): Promise<{ data: FeeLedgerItem[]; isFromSupabase: boolean }> {
  try {
    const [{ data: stData }, { data: feData }] = await Promise.all([
      fetchStudents(),
      fetchFees(),
    ]);

    const feeMap = new Map<string, FeeLedgerItem>();
    (feData || []).forEach((f) => {
      if (f.studentId) feeMap.set(f.studentId.toLowerCase(), f);
      if (f.admissionNo) feeMap.set(f.admissionNo.toLowerCase(), f);
      if (f.studentName) feeMap.set(f.studentName.toLowerCase(), f);
    });

    const overrides = getStoredFeeOverrides();

    const combined: FeeLedgerItem[] = (stData || []).map((s) => {
      const canonicalAdm = toCanonicalAdmissionNo(s.admissionNo, s.id);
      const k1 = (s.id || "").toLowerCase();
      const k2 = (s.admissionNo || "").toLowerCase();
      const k3 = canonicalAdm.toLowerCase();
      const k4 = (s.name || "").toLowerCase();

      const existing = feeMap.get(k1) || feeMap.get(k2) || feeMap.get(k3) || feeMap.get(k4);
      const ov = overrides[k1] || overrides[k2] || overrides[k3] || overrides[k4];

      if (existing) {
        const origFee = ov ? ov.originalFee : existing.originalFee;
        const discAmt = ov ? ov.discountAmount : existing.discountAmount;

        return recalculateFeeLedger({
          ...existing,
          studentId: s.id,
          admissionNo: canonicalAdm,
          studentName: s.name || existing.studentName,
          className: s.className || existing.className,
          section: s.section || existing.section || "A",
          rollNo: existing.rollNo || s.rollNo,
          originalFee: origFee,
          discountAmount: discAmt,
          paid: existing.paid,
          payments: existing.payments,
          feeType: ov?.feeType || existing.feeType,
        });
      }

      const defaultStuFee = Number((s as any).feeAmount || 15000);
      const origFee = ov ? ov.originalFee : defaultStuFee;
      const discAmt = ov ? ov.discountAmount : 0;

      return recalculateFeeLedger({
        id: `FP-${s.id}`,
        studentId: s.id,
        studentName: s.name,
        admissionNo: canonicalAdm,
        className: s.className || "Nursery",
        section: s.section || "A",
        rollNo: s.rollNo || 1,
        feeType: ov?.feeType || (s as any).feePlan || "Standard",
        originalFee: origFee,
        discountAmount: discAmt,
        paid: s.feeStatus === "Paid" ? origFee - discAmt : 0,
        status: s.feeStatus === "Paid" ? "Paid" : "Pending",
      });
    });

    return { data: combined, isFromSupabase: true };
  } catch {
    return { data: [], isFromSupabase: false };
  }
}


export async function fetchFees(studentIdFilter?: string): Promise<{ data: FeeLedgerItem[]; isFromSupabase: boolean }> {
  try {
    let query = supabase
      .from("gv_fees_payments")
      .select("*");

    const session = getSession();
    if (session && ((session.role as string) === "parent" || (session.role as string) === "student")) {
      const targetId = studentIdFilter || session.linkId || session.loginId;
      if (targetId) {
        query = query.eq("student_id", targetId);
      }
    } else if (studentIdFilter) {
      query = query.eq("student_id", studentIdFilter);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) return { data: [], isFromSupabase: false };
    const rows = data || [];

    // Build student lookup index to resolve student_id, admissionNo, or student_name to canonical student ID
    const studentLookupMap = new Map<string, string>();
    try {
      const { data: stList } = await fetchStudents();
      if (stList && stList.length > 0) {
        stList.forEach((s) => {
          studentLookupMap.set(s.id.toLowerCase(), s.id);
          if (s.admissionNo) {
            studentLookupMap.set(s.admissionNo.toLowerCase(), s.id);
            studentLookupMap.set(toCanonicalAdmissionNo(s.admissionNo, s.id).toLowerCase(), s.id);
          }
          if (s.name) {
            studentLookupMap.set(s.name.toLowerCase(), s.id);
          }
        });
      }
    } catch { }

    const studentLedgerMap = new Map<string, {
      studentId: string;
      studentName: string;
      className: string;
      feeType: string;
      originalFee: number;
      discountAmount: number;
      schedulePaid: number;
      payments: PaymentTransaction[];
    }>();

    rows.forEach((d: any) => {
      const rawId = (d.student_id || "").toLowerCase();
      const rawName = (d.student_name || "").toLowerCase();
      const canonicalAdm = toCanonicalAdmissionNo(d.student_id, d.student_id).toLowerCase();

      const canonicalId =
        studentLookupMap.get(rawId) ||
        studentLookupMap.get(canonicalAdm) ||
        studentLookupMap.get(rawName) ||
        rawId ||
        rawName ||
        "unknown";

      if (!studentLedgerMap.has(canonicalId)) {
        studentLedgerMap.set(canonicalId, {
          studentId: d.student_id || canonicalId,
          studentName: d.student_name || "Student",
          className: d.class_name || "Nursery",
          feeType: d.fee_type || "Standard",
          originalFee: Number(d.original_fee || d.amount_due || 0),
          discountAmount: Number(d.discount_amount || 0),
          schedulePaid: Number(d.amount_paid || 0),
          payments: [],
        });
      }
      const ledger = studentLedgerMap.get(canonicalId)!;
      if (d.student_name && ledger.studentName === "Student") ledger.studentName = d.student_name;
      if (d.class_name && ledger.className === "Nursery") ledger.className = d.class_name;

      if (d.record_type === "fee_schedule") {
        if (d.amount_due || d.original_fee) {
          ledger.originalFee = Number(d.original_fee || d.amount_due);
          ledger.discountAmount = Number(d.discount_amount || 0);
          if (d.fee_type) ledger.feeType = d.fee_type;
        }
        if (d.amount_paid !== undefined && d.amount_paid !== null && Number(d.amount_paid) > 0) {
          ledger.schedulePaid = Number(d.amount_paid);
        }
      }
      if (d.record_type === "payment_receipt" && (d.receipt_number || d.amount_paid)) {
        const receiptNo = d.receipt_number || `REC-${d.id}`;
        if (!ledger.payments.some((p) => p.receiptNo === receiptNo || p.id === d.id)) {
          ledger.payments.push({
            id: d.id,
            studentId: d.student_id,
            receiptNo,
            amount: Number(d.amount_paid || 0),
            date: d.payment_date || d.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
            method: d.payment_method || "Cash",
            feeType: d.fee_type || "Term Fee",
            installmentNo: d.installment || 1,
            collectedBy: d.recorded_by || "Office Staff",
          });
        }
      }
    });

    const overrides = getStoredFeeOverrides();

    const mapped: FeeLedgerItem[] = Array.from(studentLedgerMap.values()).map((item) => {
      item.payments.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
      const paymentsSum = item.payments.reduce((sum, p) => sum + p.amount, 0);
      const actualPaid = item.payments.length > 0 ? paymentsSum : item.schedulePaid;

      const k1 = (item.studentId || "").toLowerCase();
      const k2 = (item.studentName || "").toLowerCase();
      const ov = overrides[k1] || overrides[k2];

      const origFee = ov ? ov.originalFee : item.originalFee;
      const discAmt = ov ? ov.discountAmount : item.discountAmount;

      return recalculateFeeLedger({
        id: `FP-${item.studentId}`,
        studentId: item.studentId,
        studentName: item.studentName,
        className: item.className,
        feeType: ov?.feeType || item.feeType,
        originalFee: origFee,
        discountAmount: discAmt,
        paid: actualPaid,
        payments: item.payments,
      });
    });

    return { data: mapped, isFromSupabase: true };
  } catch {
    return { data: [], isFromSupabase: false };
  }
}

export async function fetchReceipts(): Promise<{ data: any[]; isFromSupabase: boolean }> {
  try {
    const { data, error } = await supabase
      .from("gv_fees_payments")
      .select("*")
      .eq("record_type", "payment_receipt")
      .order("payment_date", { ascending: false });

    if (error || !data) return { data: [], isFromSupabase: false };

    const seenIds = new Set<string>();
    const receipts: any[] = [];

    data.forEach((d: any) => {
      if (!d.id || seenIds.has(d.id)) return;
      seenIds.add(d.id);

      receipts.push({
        id: d.id,
        receiptNo: d.receipt_number || `REC-${d.id}`,
        receipt_number: d.receipt_number || `REC-${d.id}`,
        studentName: d.student_name || "Student",
        student_name: d.student_name || "Student",
        admissionNo: d.student_id || "ADM",
        student_id: d.student_id || "ADM",
        className: d.class_name || "Nursery",
        class_name: d.class_name || "Nursery",
        feeType: d.fee_type || "Term Fee",
        fee_type: d.fee_type || "Term Fee",
        amountDue: Number(d.amount_due || 0),
        amount_due: Number(d.amount_due || 0),
        amountPaid: Number(d.amount_paid || 0),
        amount_paid: Number(d.amount_paid || 0),
        amount: Number(d.amount_paid || 0),
        balance: Number(d.balance || 0),
        method: d.payment_method || "Cash",
        payment_method: d.payment_method || "Cash",
        reference: d.transaction_ref || d.receipt_number || "REF",
        transaction_ref: d.transaction_ref || d.receipt_number || "REF",
        date: d.payment_date || d.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
        payment_date: d.payment_date || d.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
        remarks: d.recorded_by ? `Recorded by ${d.recorded_by}` : "Paid",
        status: d.status || "Paid",
        collectedBy: d.recorded_by || "Office Staff",
        recorded_by: d.recorded_by || "Office Staff",
      });
    });

    return { data: receipts, isFromSupabase: true };
  } catch {
    return { data: [], isFromSupabase: false };
  }
}

export async function saveFeeRecord(fee: FeeLedgerItem): Promise<{ success: boolean; data?: FeeLedgerItem; error?: string }> {
  const origFee = Number(fee.originalFee ?? fee.amount ?? 0);
  const discAmt = Number(fee.discountAmount ?? 0);

  if (isNaN(origFee) || origFee < 0) {
    return { success: false, error: "Total Fee must be a valid non-negative number." };
  }
  if (isNaN(discAmt) || discAmt < 0) {
    return { success: false, error: "Discount Amount must be a valid non-negative number." };
  }
  if (discAmt > origFee) {
    return { success: false, error: "Discount cannot exceed original total fee." };
  }

  const recalculated = recalculateFeeLedger({
    ...fee,
    originalFee: origFee,
    discountAmount: discAmt,
  });

  // 1. Persistent local storage cache override (guarantees survival across reloads/reconnects)
  saveStoredFeeOverride(
    recalculated.studentId,
    recalculated.admissionNo || "",
    recalculated.studentName,
    {
      originalFee: recalculated.originalFee,
      discountAmount: recalculated.discountAmount,
      finalFee: recalculated.finalFee,
      feeType: recalculated.feeType,
    }
  );

  // 2. Real Database Upsert in gv_fees_payments
  try {
    const canonicalAdm = toCanonicalAdmissionNo(recalculated.admissionNo, recalculated.studentId);
    
    // Find existing fee_schedule record ID for this student if any
    let scheduleId = recalculated.id || `FS-${recalculated.studentId}`;
    const { data: existingRows } = await supabase
      .from("gv_fees_payments")
      .select("id")
      .eq("record_type", "fee_schedule")
      .or(`student_id.eq.${recalculated.studentId},student_id.eq.${canonicalAdm}`)
      .limit(1);

    if (existingRows && existingRows.length > 0 && existingRows[0].id) {
      scheduleId = existingRows[0].id;
    }

    await supabase.from("gv_fees_payments").upsert([{
      id: scheduleId,
      record_type: "fee_schedule",
      student_id: recalculated.studentId,
      student_name: recalculated.studentName,
      class_name: recalculated.className,
      fee_type: recalculated.feeType || "Standard",
      amount_due: recalculated.finalFee,
      original_fee: recalculated.originalFee,
      discount_amount: recalculated.discountAmount,
      amount_paid: recalculated.paid,
      balance: recalculated.remainingAmount,
      status: recalculated.status,
    }]);

    if (recalculated.studentId) {
      await supabase.from("gv_users").update({
        fee_status: recalculated.status,
      }).or(`id.eq.${recalculated.studentId},login_id.eq.${recalculated.studentId},admission_no.eq.${recalculated.admissionNo}`);
    }
  } catch (err) {
    console.warn("Supabase fee schedule save notice:", err);
  }

  notifyAutoRefresh("fees");
  notifyAutoRefresh("students");
  notifyAutoRefresh("admissions");

  return { success: true, data: recalculated };
}

export async function saveReceipt(payment: any): Promise<{ data: any; error: string | null }> {
  notifyAutoRefresh("fees");
  try {
    const receiptNo = payment.receiptNo || `REC-${Date.now().toString().slice(-6)}`;
    const payload = {
      id: payment.id || `PAY-${Date.now()}`,
      record_type: "payment_receipt",
      student_id: payment.studentId || payment.admissionNo,
      student_name: payment.studentName,
      class_name: payment.className || "Nursery",
      fee_type: payment.feeType || "Term Fee",
      academic_year: "2026-2027",
      installment: payment.installmentNo || 1,
      amount_paid: payment.amountPaid ?? payment.amount,
      amount_due: payment.amountDue ?? payment.amount,
      balance: payment.balance ?? 0,
      payment_date: payment.date || new Date().toISOString().split("T")[0],
      payment_method: payment.method || "Cash",
      receipt_number: receiptNo,
      transaction_ref: payment.transactionRef || payment.reference || receiptNo,
      status: payment.status || "Paid",
      recorded_by: payment.collectedBy || "Office Staff",
    };

    const { data, error } = await supabase.from("gv_fees_payments").upsert([payload], { onConflict: "id" }).select();
    if (error) {
      try {
        const res = await fetch(`${API_URL}/api/fees`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const json = await res.json();
          return { data: json.data ? json.data[0] : payload, error: null };
        }
      } catch { }
      return { data: null, error: error.message };
    }
    return { data: data ? data[0] : payload, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || "Failed to save receipt." };
  }
}

// ─── 5B. TRANSPORT MODULE ──────────────────────────────────────────────────

export interface TransportRoute {
  id: string;
  routeName: string;
  vehicleNo: string;
  driverName: string;
  driverPhone: string;
  capacity: number;
  assignedStudentsCount: number;
  monthlyFare: number;
  status: "Active" | "Maintenance" | "Inactive";
}

export async function fetchTransportRoutes(studentIdFilter?: string): Promise<TransportRoute[]> {
  try {
    let query = supabase
      .from("gv_inventory_expenses")
      .select("*");

    const session = getSession();
    if (session && ((session.role as string) === "parent" || (session.role as string) === "student")) {
      const targetId = studentIdFilter || session.linkId || session.loginId;
      if (targetId) {
        query = query.eq("record_type", "transport_allocation").or(`id.eq.${targetId},id.eq.ALLOC-${targetId},notes.cs.{"studentId":"${targetId}"}`);
      } else {
        query = query.eq("record_type", "transport_allocation");
      }
    } else {
      query = query.in("record_type", ["transport_route", "transport_allocation"]);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error || !data || data.length === 0) return [];

    return data.map((d: any) => {
      let meta: any = {};
      try {
        if (d.notes && (d.notes.startsWith("{") || d.notes.startsWith("["))) {
          meta = JSON.parse(d.notes);
        }
      } catch { }

      return {
        id: d.id,
        routeName: d.title || meta.routeName || "Route 1",
        vehicleNo: d.supplier_or_paid_to || meta.vehicleNo || "KA-01-EXP-1001",
        driverName: meta.driverName || "Driver",
        driverPhone: meta.driverPhone || "9876543210",
        capacity: Number(d.quantity || meta.capacity || 30),
        assignedStudentsCount: Number(meta.assignedStudentsCount || 15),
        monthlyFare: Number(d.amount_or_unit_cost || meta.monthlyFare || 1500),
        status: meta.status || "Active",
      };
    });
  } catch {
    return [];
  }
}

export async function saveTransportRoute(route: Partial<TransportRoute>): Promise<{ data: any; error: string | null }> {
  try {
    const id = route.id || `TR-${Date.now().toString().slice(-6)}`;
    const payload = {
      id,
      record_type: "transport_route",
      title: route.routeName || "School Route",
      category: "Transport",
      amount_or_unit_cost: route.monthlyFare || 1500,
      quantity: route.capacity || 30,
      supplier_or_paid_to: route.vehicleNo || "KA-01-EXP-1001",
      notes: JSON.stringify(route),
      created_by: "Office Staff",
    };

    const { data, error } = await supabase.from("gv_inventory_expenses").upsert([payload], { onConflict: "id" }).select();
    return { data: data ? data[0] : payload, error: error?.message || null };
  } catch (err: any) {
    return { data: null, error: err?.message || "Failed to save transport route." };
  }
}

export async function deleteTransportRoute(id: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.from("gv_inventory_expenses").delete().eq("id", id);
    return { error: error?.message || null };
  } catch (err: any) {
    return { error: err?.message || "Failed to delete transport route." };
  }
}

// ─── 6. EXPENSES & INVENTORY ──────────────────────────────────────────────

export async function fetchExpenses(): Promise<{ data: Expense[]; isFromSupabase: boolean }> {
  try {
    const { data, error } = await supabase
      .from("gv_inventory_expenses")
      .select("*")
      .eq("record_type", "expense")
      .order("transaction_date", { ascending: false });

    if (error || !data) return { data: [], isFromSupabase: false };

    const mapped: Expense[] = data.map((d: any) => {
      let meta: any = {};
      try {
        if (d.notes && typeof d.notes === "string" && (d.notes.startsWith("{") || d.notes.startsWith("["))) {
          meta = JSON.parse(d.notes);
        }
      } catch {}

      return {
        id: d.id,
        category: d.category || meta.category || "General",
        description: d.title || meta.description || "Office Expense",
        amount: Number(d.amount_or_unit_cost || meta.amount || 0),
        date: d.transaction_date || d.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
        paidTo: d.supplier_or_paid_to || meta.paidTo || "Vendor",
        paymentMethod: meta.paymentMethod || "Bank Transfer",
        notes: meta.notes || d.title || "",
        salaryBreakdown: meta.salaryBreakdown || (d.category === "Salary" ? meta.salaryItems : undefined),
      };
    });

    return { data: mapped, isFromSupabase: true };
  } catch {
    return { data: [], isFromSupabase: false };
  }
}

export async function saveExpenseRecord(exp: Partial<Expense>): Promise<{ error: string | null; data?: Expense }> {
  try {
    const id = exp.id || `EXP-${Date.now().toString().slice(-6)}`;
    const category = exp.category || "General";
    const description = exp.description || "Office Expense";
    const amount = Math.max(0, Number(exp.amount || 0));
    const date = exp.date || new Date().toISOString().slice(0, 10);
    const paidTo = exp.paidTo || "Vendor";
    const paymentMethod = exp.paymentMethod || "Bank Transfer";
    const notes = exp.notes || description;

    const payload = {
      id,
      record_type: "expense",
      title: description,
      category,
      amount_or_unit_cost: amount,
      transaction_date: date,
      supplier_or_paid_to: paidTo,
      notes: JSON.stringify({
        description,
        paidTo,
        paymentMethod,
        notes,
        salaryRecipient: category === "Salary" ? paidTo : undefined,
        salaryAmount: category === "Salary" ? amount : undefined,
        salaryBreakdown: exp.salaryBreakdown,
      }),
    };

    const { error } = await supabase
      .from("gv_inventory_expenses")
      .upsert([payload], { onConflict: "id" });

    if (error) return { error: error.message };

    const savedExp: Expense = {
      id,
      category,
      description,
      amount,
      date,
      paidTo,
      paymentMethod,
      notes,
      salaryBreakdown: exp.salaryBreakdown,
    };

    triggerAutoRefresh("expenses");
    return { error: null, data: savedExp };
  } catch (err: any) {
    return { error: err?.message || "Failed to save expense." };
  }
}

export async function deleteExpenseRecord(id: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from("gv_inventory_expenses")
      .delete()
      .eq("id", id);

    if (error) return { error: error.message };

    triggerAutoRefresh("expenses");
    return { error: null };
  } catch (err: any) {
    return { error: err?.message || "Failed to delete expense." };
  }
}

export interface SchoolEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  venue?: string;
  location?: string;
  type: "Academic" | "Cultural" | "Sports" | "Holiday" | "Other" | "Meeting";
  description: string;
  audiences?: string[];
  audience?: string[] | string;
  status?: string;
}

export async function fetchEvents(): Promise<{ data: SchoolEvent[]; isFromSupabase: boolean }> {
  try {
    const { data, error } = await supabase
      .from("gv_communications")
      .select("*")
      .eq("message_type", "event")
      .order("created_at", { ascending: false });

    if (error || !data) return { data: [], isFromSupabase: false };

    const mapped: SchoolEvent[] = data.map((d: any) => {
      let meta: any = {};
      try {
        if (d.body && (d.body.startsWith("{") || d.body.startsWith("["))) {
          meta = JSON.parse(d.body);
        }
      } catch { }

      const aud = Array.isArray(meta.audience)
        ? meta.audience
        : Array.isArray(meta.audiences)
          ? meta.audiences
          : d.recipient_role
            ? d.recipient_role.split(",")
            : ["All"];

      return {
        id: d.id,
        title: d.title || meta.title || "School Event",
        date: meta.date || d.published_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
        time: meta.time || "09:00 AM",
        location: meta.location || meta.venue || "Main Auditorium",
        venue: meta.venue || meta.location || "Main Auditorium",
        type: meta.type || "Academic",
        description: meta.description || d.body || "",
        audience: aud,
        audiences: aud,
        status: meta.status || "Upcoming",
      };
    });

    return { data: mapped, isFromSupabase: true };
  } catch {
    return { data: [], isFromSupabase: false };
  }
}

export async function createEvent(event: Omit<SchoolEvent, "id">): Promise<{ data: any; error: string | null }> {
  try {
    const newId = `EVT-${Date.now().toString(36).toUpperCase()}`;
    const aud = Array.isArray(event.audience) ? event.audience : Array.isArray(event.audiences) ? event.audiences : ["All"];
    const meta = {
      title: event.title,
      description: event.description,
      date: event.date,
      time: event.time,
      location: event.location || event.venue || "Main Campus",
      venue: event.venue || event.location || "Main Campus",
      type: event.type,
      audience: aud,
      audiences: aud,
      status: event.status || "Upcoming",
    };

    const payload = {
      id: newId,
      message_type: "event",
      title: event.title,
      body: JSON.stringify(meta),
      sender_id: (event as any).senderId || (event as any).sender_id || "PRINCIPAL001",
      sender_name: (event as any).senderName || (event as any).sender_name || "Principal Office",
      sender_role: (event as any).senderRole || "principal",
      recipient_role: aud.join(","),
      published_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from("gv_communications").insert([payload]).select();
    notifyAutoRefresh("events");
    return { data: data ? data[0] : payload, error: error?.message || null };
  } catch (err: any) {
    return { data: null, error: err?.message || "Failed to create event" };
  }
}

export async function updateEvent(id: string, event: Partial<SchoolEvent>): Promise<{ error: string | null }> {
  try {
    const aud = Array.isArray(event.audience) ? event.audience : Array.isArray(event.audiences) ? event.audiences : ["All"];
    const meta = {
      title: event.title,
      description: event.description,
      date: event.date,
      time: event.time,
      location: event.location || event.venue || "Main Campus",
      venue: event.venue || event.location || "Main Campus",
      type: event.type,
      audience: aud,
      audiences: aud,
      status: event.status || "Upcoming",
    };

    const payload: any = {
      body: JSON.stringify(meta),
      updated_at: new Date().toISOString(),
    };
    if (event.title) payload.title = event.title;
    if (aud.length > 0) payload.recipient_role = aud.join(",");

    const { error } = await supabase.from("gv_communications").update(payload).eq("id", id);
    notifyAutoRefresh("events");
    return { error: error?.message || null };
  } catch (err: any) {
    return { error: err?.message || "Failed to update event" };
  }
}

export async function deleteEvent(id: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.from("gv_communications").delete().eq("id", id);
    notifyAutoRefresh("events");
    return { error: error?.message || null };
  } catch (err: any) {
    return { error: err?.message || "Failed to delete event" };
  }
}

// ─── 5C. STUDENT PROGRESS & MARKS MODULE ─────────────────────────────────────

export interface MarkRecord {
  id: string;
  studentId: string;
  studentName?: string;
  rollNo?: number;
  className: string;
  section: string;
  subject: string;
  assessment: string;
  outOf: number;
  score: number;
  remarks: string;
  updatedAt?: string;
}

export async function fetchClassMarks(className?: string, section?: string): Promise<MarkRecord[]> {
  try {
    let query = supabase
      .from("gv_requests")
      .select("*")
      .eq("request_type", "marks");

    if (className && section) {
      query = query.eq("leave_type_or_interested_class", `${className} ${section}`);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((d: any) => {
      let meta: any = {};
      try {
        if (d.reason_or_notes && (d.reason_or_notes.startsWith("{") || d.reason_or_notes.startsWith("["))) {
          meta = JSON.parse(d.reason_or_notes);
        }
      } catch { }

      const parts = (d.leave_type_or_interested_class || "").split(" ");
      const cName = meta.className || parts[0] || "Nursery";
      const sSec = meta.section || parts[1] || "A";

      return {
        id: d.id,
        studentId: meta.studentId || d.parent_name || d.id,
        studentName: meta.studentName || d.applicant_or_child_name || "Student",
        rollNo: meta.rollNo || 0,
        className: cName,
        section: sSec,
        subject: meta.subject || "General",
        assessment: meta.assessment || "Unit Test 1",
        outOf: Number(meta.outOf || 100),
        score: Number(meta.score || 0),
        remarks: meta.remarks || "",
        updatedAt: d.updated_at,
      };
    });
  } catch {
    return [];
  }
}

export async function saveClassMarks(marks: Omit<MarkRecord, "id">[]): Promise<{ count: number; error: string | null }> {
  try {
    if (!marks || marks.length === 0) return { count: 0, error: null };

    const payloads = marks.map((m) => {
      const sanitizedSubject = m.subject.replace(/[^a-zA-Z0-9]/g, "");
      const sanitizedAssessment = m.assessment.replace(/[^a-zA-Z0-9]/g, "");
      const recordId = `MRK-${m.studentId}-${sanitizedSubject}-${sanitizedAssessment}`;
      const pct = m.outOf ? (m.score / m.outOf) * 100 : 0;
      const statusGrade = pct >= 90 ? "A+" : pct >= 80 ? "A" : pct >= 70 ? "B+" : pct >= 60 ? "B" : pct >= 50 ? "C" : "D";

      const meta = {
        studentId: m.studentId,
        studentName: m.studentName,
        rollNo: m.rollNo,
        className: m.className,
        section: m.section,
        subject: m.subject,
        assessment: m.assessment,
        outOf: m.outOf,
        score: m.score,
        remarks: m.remarks,
      };

      return {
        id: recordId,
        request_type: "marks",
        applicant_or_child_name: m.studentName || m.studentId,
        parent_name: m.studentId,
        leave_type_or_interested_class: `${m.className} ${m.section}`,
        reason_or_notes: JSON.stringify(meta),
        status: statusGrade,
        updated_at: new Date().toISOString(),
      };
    });

    const { error } = await supabase.from("gv_requests").upsert(payloads, { onConflict: "id" });
    if (error) throw new Error(error.message);

    notifyAutoRefresh("marks");
    return { count: payloads.length, error: null };
  } catch (err: any) {
    return { count: 0, error: err?.message || "Failed to save marks." };
  }
}

export interface StudentSkillProgress {
  language: number;
  motor: number;
  social: number;
  creativity: number;
  hasRecords: boolean;
}

export async function fetchStudentSkills(
  studentId: string,
  className?: string,
  section?: string
): Promise<StudentSkillProgress> {
  try {
    if (!studentId || studentId === "NO-STUDENT") {
      return { language: 0, motor: 0, social: 0, creativity: 0, hasRecords: false };
    }

    const cleanId = studentId.trim().toLowerCase();

    // 1. Check gv_requests for explicit "skills" request_type
    const { data: skillRows } = await supabase
      .from("gv_requests")
      .select("*")
      .eq("request_type", "skills");

    if (skillRows && skillRows.length > 0) {
      const match = skillRows.find((r: any) => {
        const pName = (r.parent_name || "").toLowerCase();
        const cName = (r.applicant_or_child_name || "").toLowerCase();
        let notes: any = {};
        try {
          if (r.reason_or_notes && r.reason_or_notes.startsWith("{")) {
            notes = JSON.parse(r.reason_or_notes);
          }
        } catch { }
        const sId = (notes.studentId || "").toLowerCase();
        return pName === cleanId || sId === cleanId || cName.includes(cleanId);
      });

      if (match && match.reason_or_notes) {
        try {
          const parsed = JSON.parse(match.reason_or_notes);
          if (parsed && typeof parsed === "object") {
            return {
              language: Math.min(100, Math.max(0, Number(parsed.language || 0))),
              motor: Math.min(100, Math.max(0, Number(parsed.motor || 0))),
              social: Math.min(100, Math.max(0, Number(parsed.social || 0))),
              creativity: Math.min(100, Math.max(0, Number(parsed.creativity || 0))),
              hasRecords: true,
            };
          }
        } catch { }
      }
    }

    // 2. Check gv_requests for "marks" request_type for this student and compute domain averages
    const allMarks = await fetchClassMarks(className, section);
    const studentMarks = allMarks.filter(
      (m) => (m.studentId || "").toLowerCase() === cleanId || (m.studentName || "").toLowerCase().includes(cleanId)
    );

    if (studentMarks.length > 0) {
      let langSum = 0, langCount = 0;
      let motorSum = 0, motorCount = 0;
      let socialSum = 0, socialCount = 0;
      let creativeSum = 0, creativeCount = 0;

      studentMarks.forEach((m) => {
        const pct = m.outOf > 0 ? (m.score / m.outOf) * 100 : 0;
        const subj = (m.subject || "").toLowerCase();

        if (/english|hindi|tamil|language|reading|writing|rhymes|story/i.test(subj)) {
          langSum += pct;
          langCount++;
        } else if (/physical|pt|activity|motor|games|play|outdoor/i.test(subj)) {
          motorSum += pct;
          motorCount++;
        } else if (/social|evs|environment|behavior|habits|moral/i.test(subj)) {
          socialSum += pct;
          socialCount++;
        } else if (/art|craft|drawing|music|creativity|color/i.test(subj)) {
          creativeSum += pct;
          creativeCount++;
        } else {
          langSum += pct;
          langCount++;
          socialSum += pct;
          socialCount++;
        }
      });

      if (langCount > 0 || motorCount > 0 || socialCount > 0 || creativeCount > 0) {
        return {
          language: langCount > 0 ? Math.round(langSum / langCount) : 0,
          motor: motorCount > 0 ? Math.round(motorSum / motorCount) : (langCount > 0 ? Math.round(langSum / langCount) : 0),
          social: socialCount > 0 ? Math.round(socialSum / socialCount) : (langCount > 0 ? Math.round(langSum / langCount) : 0),
          creativity: creativeCount > 0 ? Math.round(creativeSum / creativeCount) : (langCount > 0 ? Math.round(langSum / langCount) : 0),
          hasRecords: true,
        };
      }
    }

    return { language: 0, motor: 0, social: 0, creativity: 0, hasRecords: false };
  } catch {
    return { language: 0, motor: 0, social: 0, creativity: 0, hasRecords: false };
  }
}

export async function checkSupabaseConnection(): Promise<{
  connected: boolean;
  profileCount: number;
  message: string;
}> {
  try {
    const { data, error, count } = await supabase
      .from("gv_users")
      .select("*", { count: "exact", head: true });

    if (error) {
      return {
        connected: false,
        profileCount: 0,
        message: `Connection error: ${error.message}`,
      };
    }

    return {
      connected: true,
      profileCount: count ?? 0,
      message: "Successfully connected to production Supabase database!",
    };
  } catch (err: any) {
    return {
      connected: false,
      profileCount: 0,
      message: `Failed to connect: ${err?.message || "Unknown error"}`,
    };
  }
}
