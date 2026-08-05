import { supabase } from "./supabase";
import type { Student, Teacher, Enquiry, Fee, Expense } from "./mockData";
import { generateParentCredential } from "./credentials";
import { pushAdminNotification } from "./admin-notifications";
import { NotificationService } from "./notifications";

export type { Student, Teacher, Enquiry, Fee, Expense };

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
  className: string;
  section?: string;
  academicYear?: string;
  originalFee: number;
  discountAmount: number;
  finalFee: number;
  amount: number;
  paid: number;
  remainingAmount: number;
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

export async function fetchCirculars(): Promise<{ data: Circular[]; isFromSupabase: boolean }> {
  try {
    let rows: any[] = [];
    const { data, error } = await supabase
      .from("gv_communications")
      .select("*")
      .eq("message_type", "circular")
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      rows = data;
    } else {
      const { data: allComms } = await supabase.from("gv_communications").select("*");
      if (allComms && allComms.length > 0) {
        rows = allComms.filter((c: any) => c.message_type === "circular");
      } else {
        try {
          const res = await fetch(`${API_URL}/api/communications?channel=circular`);
          if (res.ok) {
            const json = await res.json();
            rows = json.data || [];
          }
        } catch {}
      }
    }

    const mapped: Circular[] = rows.map((d: any) => {
      let meta: any = {};
      try {
        meta = JSON.parse(d.body || "{}");
      } catch {
        meta = { description: d.body };
      }

      return {
        id: d.id,
        title: d.title || meta.subject || "School Notice",
        subject: meta.subject || d.title,
        description: meta.description || d.body || "",
        content: meta.description || d.body || "",
        published_date: d.published_at?.slice(0, 10) || new Date().toISOString().split("T")[0],
        publishDate: d.published_at?.slice(0, 10) || new Date().toISOString().split("T")[0],
        expiryDate: "2026-12-31",
        target_audience: d.recipient_role || "All",
        recipients: meta.recipients || ["Parents", "Teachers"],
        author: d.sender_name || "Principal Office",
        priority: d.priority || meta.priority || "Medium",
        status: meta.status || "Published",
        attachment: meta.attachmentName,
        attachmentUrl: d.attachment_url || meta.attachmentUrl,
        createdAt: d.created_at || new Date().toISOString(),
        history: [{ at: d.created_at || new Date().toISOString(), action: meta.status || "Published" }],
      };
    });

    return { data: mapped, isFromSupabase: true };
  } catch {
    return { data: [], isFromSupabase: false };
  }
}

export async function createCircular(circular: any): Promise<{ data: any | null; error: string | null }> {
  try {
    const meta = {
      subject: circular.subject || circular.title,
      description: circular.description || circular.content || circular.title,
      priority: circular.priority || "Medium",
      recipients: Array.isArray(circular.recipients) && circular.recipients.length > 0 ? circular.recipients : ["Parents", "Teachers"],
      attachmentName: circular.attachmentName || circular.attachment,
      attachmentUrl: circular.attachmentUrl,
      status: circular.status || "Published",
    };

    const newId = `COM-CIRC-${Date.now().toString().slice(-4)}`;
    const payload = {
      id: newId,
      message_type: "circular",
      title: circular.title,
      body: JSON.stringify(meta),
      sender_id: "PRINCIPAL001",
      sender_name: circular.author || "Principal Office",
      sender_role: "principal",
      recipient_role: Array.isArray(circular.recipients) ? circular.recipients.join(",") : "all",
      priority: circular.priority || "Medium",
      published_at: new Date().toISOString(),
    };

    let resultData = null;
    let resultErr = null;

    try {
      const { data, error } = await supabase.from("gv_communications").insert([payload]).select();
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
      NotificationService.circularPublished(circular.title);
      return { data: resultData, error: null };
    }

    return { data: null, error: resultErr || "Failed to publish circular." };
  } catch (err: any) {
    return { data: null, error: err?.message || "Failed to save circular." };
  }
}

export async function deleteCircular(id: string) {
  try {
    const { error } = await supabase.from("gv_communications").delete().eq("id", id);
    return { error: error?.message || null };
  } catch (err: any) {
    return { error: err?.message || "Failed to delete circular." };
  }
}

// ─── 2. STUDENTS ─────────────────────────────────────────────────────────────

export async function fetchStudents(): Promise<{ data: Student[]; isFromSupabase: boolean }> {
  try {
    let rows: any[] = [];
    const { data, error } = await supabase
      .from("gv_users")
      .select("*")
      .or("role.ilike.%student%,role.eq.student,role.eq.Student");

    if (!error && data && data.length > 0) {
      rows = data;
    } else {
      const { data: allData } = await supabase.from("gv_users").select("*");
      if (allData && allData.length > 0) {
        rows = allData.filter((u: any) =>
          u.role ? u.role.toString().toLowerCase().includes("student") : false
        );
      }
      if (rows.length === 0) {
        try {
          const directRes = await fetch(
            "https://nyhnkftlkigoliyogwvp.supabase.co/rest/v1/gv_users?select=*",
            {
              headers: {
                apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55aG5rZnRsa2lnb2xpeW9nd3ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0NzQ2NTMsImV4cCI6MjEwMTA1MDY1M30.KxjH42Wg0IVLfXLLJSbBLvcZ098hvJRUHkDu10NJfB4",
                Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55aG5rZnRsa2lnb2xpeW9nd3ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0NzQ2NTMsImV4cCI6MjEwMTA1MDY1M30.KxjH42Wg0IVLfXLLJSbBLvcZ098hvJRUHkDu10NJfB4",
              },
            }
          );
          if (directRes.ok) {
            const rawJson = await directRes.json();
            rows = (rawJson || []).filter((u: any) =>
              u.role ? u.role.toString().toLowerCase().includes("student") : false
            );
          }
        } catch {}
      }
      if (rows.length === 0) {
        try {
          const res = await fetch(`${API_URL}/api/users?role=student`);
          if (res.ok) {
            const json = await res.json();
            rows = json.data || [];
          }
        } catch {}
      }
    }

    const mapped: Student[] = rows.map((d: any) => ({
      id: d.id || d.login_id,
      rollNo: d.roll_no || 1,
      admissionNo: d.admission_no || d.id,
      name: d.full_name || "Student",
      age: d.age || 4,
      dob: d.date_of_birth || "2022-01-01",
      className: d.class_name || "Nursery",
      section: d.section || "A",
      parent: d.parent_name || "Parent",
      parentId: d.parent_id || `PAR-${d.id}`,
      phone: d.mobile || "9876543210",
      gender: d.gender === "Girl" || d.gender === "Female" ? "Girl" : "Boy",
      house: d.house || "Red",
      admissionDate: d.created_at?.slice(0, 10) || new Date().toISOString().split("T")[0],
      feeStatus: (d.fee_status as any) || "Pending",
      avatar: d.photo_url || `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(d.full_name || "Student")}`,
      attendance: Number(d.attendance_pct || 95.0),
      branch: d.branch || "Main Branch",
    }));

    return { data: mapped, isFromSupabase: true };
  } catch (err) {
    console.error("fetchStudents exception:", err);
    return { data: [], isFromSupabase: false };
  }
}

export async function createStudent(student: Omit<Student, "id"> & { id?: string }) {
  const ts = Date.now().toString();
  const newId = student.id || `STU-${ts.slice(-6)}`;
  const parentId = student.parentId || `PAR-${ts.slice(-6)}`;
  const payload = {
    id: newId,
    login_id: newId,
    email: `${newId.toLowerCase()}@growvia.edu`,
    full_name: student.name,
    role: "student",
    status: "active",
    admission_no: student.admissionNo || `ADM-${ts.slice(-6)}`,
    class_name: student.className || "Nursery",
    section: student.section || "A",
    parent_name: student.parent || "Parent",
    parent_id: parentId,
    mobile: student.phone || "9876543210",
    date_of_birth: student.dob && student.dob.trim() ? student.dob : null,
    gender: ((student.gender as string) === "Female" || student.gender === "Girl") ? "Girl" : "Boy",
    house: student.house || "Red",
    fee_status: student.feeStatus || "Pending",
    attendance_pct: student.attendance || 95.0,
    branch: student.branch || "Main Branch",
  };

  try {
    const { data, error } = await supabase.from("gv_users").upsert([payload], { onConflict: "id" }).select();
    return { data: data ? data[0] : payload, error: error?.message || null };
  } catch (err: any) {
    return { data: null, error: err?.message || "Failed to create student." };
  }
}

export async function updateStudent(id: string, updates: Partial<Student>) {
  try {
    const payload: Record<string, any> = {};
    if (updates.name) payload.full_name = updates.name;
    if (updates.className) payload.class_name = updates.className;
    if (updates.section) payload.section = updates.section;
    if (updates.parent) payload.parent_name = updates.parent;
    if (updates.phone) payload.mobile = updates.phone;
    if (updates.feeStatus) payload.fee_status = updates.feeStatus;

    const { data, error } = await supabase.from("gv_users").update(payload).eq("id", id).select();
    return { data, error: error?.message || null };
  } catch (err: any) {
    return { data: null, error: err?.message || "Failed to update student." };
  }
}

export async function deleteStudent(id: string) {
  try {
    const { error } = await supabase.from("gv_users").delete().eq("id", id);
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
      await supabase.from("gv_users").update({ roll_no: newRoll }).eq("id", s.id);
      updatedCount++;
    }
    return { count: updatedCount, error: null };
  } catch (err) {
    return { count: 0, error: err };
  }
}

// ─── 3. TEACHERS & STAFF ──────────────────────────────────────────────────

export async function fetchTeachers(): Promise<{ data: Teacher[]; isFromSupabase: boolean }> {
  try {
    let rows: any[] = [];
    const { data, error } = await supabase
      .from("gv_users")
      .select("*")
      .or("role.ilike.%teacher%,role.eq.teacher,role.eq.Teacher")
      .order("full_name", { ascending: true });

    if (!error && data && data.length > 0) {
      rows = data;
    } else {
      const { data: allData } = await supabase.from("gv_users").select("*");
      if (allData && allData.length > 0) {
        rows = allData.filter((u: any) =>
          u.role ? u.role.toString().toLowerCase().includes("teacher") : false
        );
      }
      if (rows.length === 0) {
        try {
          const directRes = await fetch(
            "https://nyhnkftlkigoliyogwvp.supabase.co/rest/v1/gv_users?select=*",
            {
              headers: {
                apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55aG5rZnRsa2lnb2xpeW9nd3ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0NzQ2NTMsImV4cCI6MjEwMTA1MDY1M30.KxjH42Wg0IVLfXLLJSbBLvcZ098hvJRUHkDu10NJfB4",
                Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55aG5rZnRsa2lnb2xpeW9nd3ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0NzQ2NTMsImV4cCI6MjEwMTA1MDY1M30.KxjH42Wg0IVLfXLLJSbBLvcZ098hvJRUHkDu10NJfB4",
              },
            }
          );
          if (directRes.ok) {
            const rawJson = await directRes.json();
            rows = (rawJson || []).filter((u: any) =>
              u.role ? u.role.toString().toLowerCase().includes("teacher") : false
            );
          }
        } catch {}
      }
    }

    const mapped: Teacher[] = rows.map((d: any) => ({
      id: d.id || d.login_id,
      name: d.full_name,
      className: d.class_name || "Nursery A",
      subject: d.subject || "General",
      email: d.email || `${d.full_name.toLowerCase().replace(/\s+/g, ".")}@sunshine.edu`,
      phone: d.mobile || "9876543210",
      experience: d.experience || 2,
      joined: d.created_at?.slice(0, 10) || new Date().toISOString().split("T")[0],
      avatar: d.photo_url || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(d.full_name)}`,
      branch: d.branch || "Main Branch",
    }));

    return { data: mapped, isFromSupabase: true };
  } catch {
    return { data: [], isFromSupabase: false };
  }
}

export async function createTeacher(teacher: Omit<Teacher, "id"> & { id?: string }) {
  const newId = teacher.id || `TCH-${Date.now().toString().slice(-4)}`;
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
  };

  try {
    const { data, error } = await supabase.from("gv_users").insert([payload]).select();
    return { data: data ? data[0] : payload, error: error?.message || null };
  } catch (err: any) {
    return { data: null, error: err?.message || "Failed to create teacher." };
  }
}

export async function deleteTeacher(id: string) {
  try {
    const { error } = await supabase.from("gv_users").delete().eq("id", id);
    return { error: error?.message || null };
  } catch (err: any) {
    return { error: err?.message || "Failed to delete teacher." };
  }
}

// ─── 4. ENQUIRIES ─────────────────────────────────────────────────────────

export async function fetchEnquiries(): Promise<{ data: Enquiry[]; isFromSupabase: boolean }> {
  try {
    const { data, error } = await supabase
      .from("gv_requests")
      .select("*")
      .eq("request_type", "enquiry")
      .order("created_at", { ascending: false });

    if (error) return { data: [], isFromSupabase: false };
    const rows = data || [];

    const mapped: Enquiry[] = rows.map((d: any) => ({
      id: d.id,
      childName: d.applicant_or_child_name,
      parentName: d.parent_name || "Parent",
      phone: d.phone || "9876543210",
      altPhone: "",
      email: d.email || "",
      address: d.address || "",
      gender: d.gender === "Girl" ? "Girl" : "Boy",
      dob: d.dob || "2022-01-01",
      previousSchool: "",
      age: 3,
      interestedClass: d.leave_type_or_interested_class || "Nursery",
      source: d.source || "Walk-in",
      status: (d.status as any) || "New",
      followUp: d.follow_up_date || d.created_at?.slice(0, 10),
      notes: d.reason_or_notes || "",
      createdAt: d.created_at || new Date().toISOString(),
    }));

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

  const { data, error } = await supabase.from("gv_requests").insert([payload]).select();
  return { data, error: error?.message || null };
}

// ─── 5. FEES & PAYMENTS ───────────────────────────────────────────────────

export function recalculateFeeLedger(ledger: Partial<FeeLedgerItem>): FeeLedgerItem {
  const originalFee = Number(ledger.originalFee ?? ledger.amount ?? 8500);
  const discountAmount = Math.max(0, Number(ledger.discountAmount ?? 0));
  const finalFee = Math.max(0, originalFee - discountAmount);
  const payments = Array.isArray(ledger.payments) ? ledger.payments : [];
  const paid = payments.reduce((acc, p) => acc + Number(p.amount || 0), Number(ledger.paid || 0));
  const remainingAmount = Math.max(0, finalFee - paid);
  const status: "Paid" | "Partial" | "Pending" = remainingAmount === 0 && finalFee > 0 ? "Paid" : paid > 0 ? "Partial" : "Pending";

  return {
    id: ledger.id || `FP-${Date.now()}`,
    studentId: ledger.studentId || "STU1001",
    studentName: ledger.studentName || "Student",
    admissionNo: ledger.admissionNo || `ADM-${ledger.studentId}`,
    className: ledger.className || "Nursery A",
    section: ledger.section || "A",
    academicYear: ledger.academicYear || "2026-2027",
    originalFee,
    discountAmount,
    finalFee,
    amount: finalFee,
    paid,
    remainingAmount,
    totalInstallments: ledger.totalInstallments || 3,
    paidInstallments: ledger.paidInstallments || (paid > 0 ? 1 : 0),
    status,
    dueDate: ledger.dueDate || "2026-07-15",
    month: ledger.month || "Academic Year 2026-2027",
    payments,
    updatedAt: new Date().toISOString(),
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
      const key = (f.studentId || f.admissionNo || f.studentName).toLowerCase();
      if (!feeMap.has(key)) {
        feeMap.set(key, f);
      }
    });

    const combined: FeeLedgerItem[] = (stData || []).map((s) => {
      const key = (s.id || s.admissionNo || s.name).toLowerCase();
      const existing = feeMap.get(key);
      if (existing) {
        return {
          ...existing,
          admissionNo: existing.admissionNo || s.admissionNo || s.id,
          rollNo: existing.rollNo || s.rollNo,
          section: existing.section || s.section || "A",
        };
      }
      return recalculateFeeLedger({
        id: `FP-${s.id}`,
        studentId: s.id,
        studentName: s.name,
        admissionNo: s.admissionNo || s.id,
        className: s.className || "Nursery",
        section: s.section || "A",
        rollNo: s.rollNo || 1,
        originalFee: 12000,
        discountAmount: 0,
        paid: 0,
        status: "Pending",
      });
    });

    (feData || []).forEach((f) => {
      const key = (f.studentId || f.admissionNo || f.studentName).toLowerCase();
      if (!combined.some((c) => (c.studentId || c.admissionNo || c.studentName).toLowerCase() === key)) {
        combined.push(f);
      }
    });

    return { data: combined, isFromSupabase: true };
  } catch {
    return { data: [], isFromSupabase: false };
  }
}

export async function fetchFees(): Promise<{ data: FeeLedgerItem[]; isFromSupabase: boolean }> {
  try {
    const { data, error } = await supabase
      .from("gv_fees_payments")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return { data: [], isFromSupabase: false };
    const rows = data || [];

    const mapped: FeeLedgerItem[] = rows.map((d: any) =>
      recalculateFeeLedger({
        id: d.id,
        studentId: d.student_id,
        studentName: d.student_name,
        className: d.class_name,
        originalFee: Number(d.amount_due || 12000),
        finalFee: Number(d.amount_due || 12000),
        amount: Number(d.amount_due || 12000),
        paid: Number(d.amount_paid || 0),
        status: (d.status as any) || "Pending",
        payments: d.receipt_number
          ? [
              {
                id: d.id,
                studentId: d.student_id,
                receiptNo: d.receipt_number,
                amount: Number(d.amount_paid || 0),
                date: d.payment_date || d.created_at?.slice(0, 10),
                method: d.payment_method || "Cash",
                feeType: d.fee_type || "Term Fee",
                installmentNo: 1,
                collectedBy: d.recorded_by || "Office Staff",
              },
            ]
          : [],
      })
    );

    return { data: mapped, isFromSupabase: true };
  } catch {
    return { data: [], isFromSupabase: false };
  }
}

export async function saveFeeRecord(fee: FeeLedgerItem) {
  const recalculated = recalculateFeeLedger(fee);
  try {
    await supabase.from("gv_fees_payments").upsert([{
      id: recalculated.id,
      record_type: "payment_receipt",
      student_id: recalculated.studentId,
      student_name: recalculated.studentName,
      class_name: recalculated.className,
      fee_type: "Term Fee",
      amount_due: recalculated.originalFee,
      amount_paid: recalculated.paid,
      balance: recalculated.remainingAmount,
      status: recalculated.status,
    }]);
  } catch (err) {
    console.warn("Supabase fee save notice:", err);
  }
}

export async function saveReceipt(payment: any): Promise<{ data: any; error: string | null }> {
  try {
    const receiptNo = payment.receiptNo || `REC-${Date.now().toString().slice(-6)}`;
    const payload = {
      id: payment.id || `PAY-${Date.now()}`,
      record_type: "payment_receipt",
      student_id: payment.studentId,
      student_name: payment.studentName,
      class_name: payment.className || "Nursery",
      fee_type: payment.feeType || "Term Fee",
      academic_year: "2026-2027",
      installment: payment.installmentNo || 1,
      amount_paid: payment.amount,
      amount_due: payment.amount,
      balance: 0,
      payment_date: payment.date || new Date().toISOString().split("T")[0],
      payment_method: payment.method || "Cash",
      receipt_number: receiptNo,
      transaction_ref: payment.transactionRef || receiptNo,
      status: "Paid",
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
      } catch {}
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

export async function fetchTransportRoutes(): Promise<TransportRoute[]> {
  try {
    const { data, error } = await supabase
      .from("gv_inventory_expenses")
      .select("*")
      .eq("record_type", "transport_route")
      .order("created_at", { ascending: false });

    if (error || !data || data.length === 0) return [];

    return data.map((d: any) => {
      let meta: any = {};
      try {
        if (d.notes && (d.notes.startsWith("{") || d.notes.startsWith("["))) {
          meta = JSON.parse(d.notes);
        }
      } catch {}

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
      .order("created_at", { ascending: false });

    if (error) return { data: [], isFromSupabase: false };
    const rows = data || [];

    const mapped: Expense[] = rows.map((d: any) => ({
      id: d.id,
      category: d.category || "General",
      description: d.title || "Office Expense",
      amount: Number(d.amount_or_unit_cost || 0),
      date: d.transaction_date || d.created_at?.slice(0, 10),
      paidTo: d.supplier_or_paid_to || "Vendor",
    }));

    return { data: mapped, isFromSupabase: true };
  } catch {
    return { data: [], isFromSupabase: false };
  }
}

export async function fetchEvents(): Promise<{ data: any[]; isFromSupabase: boolean }> {
  return { data: [], isFromSupabase: true };
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
