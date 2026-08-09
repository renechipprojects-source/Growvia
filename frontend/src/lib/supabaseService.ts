import { supabase } from "./supabase";
import type { Student, Teacher, Enquiry, Fee, Expense } from "./mockData";
import { generateParentCredential } from "./credentials";
import { pushAdminNotification } from "./admin-notifications";
import { NotificationService } from "./notifications";

export type { Student, Teacher, Enquiry, Fee, Expense };

export function notifyAutoRefresh(moduleName: string) {
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new CustomEvent(`sunshine-auto-refresh-${moduleName}`));
      window.dispatchEvent(new CustomEvent("sunshine-auto-refresh"));
    } catch {}
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

let circularsCacheMemory: Circular[] = [];
const CIRCULARS_STORAGE_KEY = "sunshine.circulars.cache.v1";

function getCachedCircularsList(): Circular[] {
  if (circularsCacheMemory.length > 0) return circularsCacheMemory;
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(CIRCULARS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          circularsCacheMemory = parsed;
          return parsed;
        }
      }
    } catch {}
  }
  return [];
}

function setCachedCircularsList(list: Circular[]) {
  if (!Array.isArray(list) || list.length === 0) return;
  circularsCacheMemory = list;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(CIRCULARS_STORAGE_KEY, JSON.stringify(list));
    } catch {}
  }
}

export async function fetchCirculars(): Promise<{ data: Circular[]; isFromSupabase: boolean }> {
  const cached = getCachedCircularsList();

  const fetchTask = (async () => {
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

      if (rows.length > 0) {
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

        const localList = getCachedCircularsList();
        const mergedMap = new Map<string, Circular>();
        mapped.forEach((c) => mergedMap.set(c.id, c));
        localList.forEach((localCir) => {
          const dbCir = mergedMap.get(localCir.id);
          if (dbCir) {
            mergedMap.set(localCir.id, { ...dbCir, ...localCir });
          } else {
            mergedMap.set(localCir.id, localCir);
          }
        });

        const finalMerged = Array.from(mergedMap.values());
        setCachedCircularsList(finalMerged);
        return { data: finalMerged, isFromSupabase: true };
      }
    } catch {}

    return { data: getCachedCircularsList(), isFromSupabase: false };
  })();

  const timeoutTask = new Promise<{ data: Circular[]; isFromSupabase: boolean }>((resolve) => {
    setTimeout(() => resolve({ data: getCachedCircularsList(), isFromSupabase: false }), 4000);
  });

  return Promise.race([fetchTask, timeoutTask]);
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
  circularsCacheMemory = circularsCacheMemory.filter((c) => c.id !== id);
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
  } catch {}

  notifyAutoRefresh("circulars");

  try {
    const { error } = await supabase.from("gv_communications").delete().eq("id", id);
    return { error: error?.message || null };
  } catch (err: any) {
    return { error: err?.message || "Failed to delete circular." };
  }
}

// ─── 2. STUDENTS ─────────────────────────────────────────────────────────────

let studentsCacheMemory: Student[] = [];
const STUDENTS_STORAGE_KEY = "sunshine.students.cache.v1";

function getCachedStudentsList(): Student[] {
  if (studentsCacheMemory.length > 0) return studentsCacheMemory;
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(STUDENTS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          studentsCacheMemory = parsed;
          return parsed;
        }
      }
    } catch {}
  }
  return [];
}

function setCachedStudentsList(list: Student[]) {
  if (!Array.isArray(list) || list.length === 0) return;
  studentsCacheMemory = list;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STUDENTS_STORAGE_KEY, JSON.stringify(list));
    } catch {}
  }
}

export async function fetchStudents(): Promise<{ data: Student[]; isFromSupabase: boolean }> {
  const cached = getCachedStudentsList();

  const revalidate = async () => {
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
      }

      if (rows.length > 0) {
        const mapped: Student[] = rows.map((d: any) => {
          const cachedMatch = cached.find((c) => c.id === d.id || c.admissionNo === d.admission_no || c.name === d.full_name);
          return {
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
            avatar: d.photo_url || d.avatar_url || d.avatar || cachedMatch?.avatar || `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(d.full_name || "Student")}`,
            attendance: Number(d.attendance_pct || 95.0),
            branch: d.branch || "Main Branch",
          };
        });

        const localList = getCachedStudentsList();
        const mergedMap = new Map<string, Student>();

        // Set database records first
        mapped.forEach((s) => mergedMap.set(s.id, s));

        // Overlay local records so newly generated/updated local student fields are never lost
        localList.forEach((localStu) => {
          const dbStu = mergedMap.get(localStu.id);
          if (dbStu) {
            mergedMap.set(localStu.id, { ...dbStu, ...localStu });
          } else {
            mergedMap.set(localStu.id, localStu);
          }
        });

        const finalMerged = Array.from(mergedMap.values());
        setCachedStudentsList(finalMerged);
        return { data: finalMerged, isFromSupabase: true };
      }
    } catch {}
    return { data: getCachedStudentsList(), isFromSupabase: false };
  };

  return await revalidate();
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
  const ts = Date.now().toString();
  const newId = student.id || `STU-${ts.slice(-6)}`;
  const parentId = student.parentId || `PAR-${ts.slice(-6)}`;

  const newStuObj: Student = {
    id: newId,
    rollNo: student.rollNo || 1,
    admissionNo: student.admissionNo || newId,
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
  };

  const localList = getCachedStudentsList();
  const updatedList = [newStuObj, ...localList.filter((s) => s.id !== newId && s.admissionNo !== newStuObj.admissionNo)];
  setCachedStudentsList(updatedList);
  notifyAutoRefresh("students");

  const payload = {
    id: newId,
    login_id: newId,
    admission_no: student.admissionNo || newId,
    roll_no: student.rollNo || 1,
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
    avatar_url: student.avatar,
  };

  try {
    const { data, error } = await supabase.from("gv_users").insert([payload]).select();
    return { data: data ? data[0] : newStuObj, error: error?.message || null };
  } catch (err: any) {
    return { data: newStuObj, error: null };
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
    if (updates.feeStatus) payload.fee_status = updates.feeStatus;
    if (updates.avatar) {
      payload.photo_url = updates.avatar;
      payload.avatar_url = updates.avatar;
    }

    let { data } = await supabase.from("gv_users").update(payload).eq("login_id", id).select();
    if (!data || data.length === 0) {
      const fallback = await supabase.from("gv_users").update(payload).eq("id", id).select();
      data = fallback.data;
    }
    if (!data || data.length === 0) {
      const fallbackAdm = await supabase.from("gv_users").update(payload).eq("admission_no", id).select();
      data = fallbackAdm.data;
    }
    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: null };
  }
}

export async function deleteStudent(id: string) {
  try {
    const { error } = await supabase.from("gv_users").delete().eq("id", id);
    if (!error) {
      fetchStudents();
    }
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

let teachersCacheMemory: Teacher[] = [];
const TEACHERS_STORAGE_KEY = "sunshine.teachers.cache.v1";

function getCachedTeachersList(): Teacher[] {
  if (teachersCacheMemory.length > 0) return teachersCacheMemory;
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(TEACHERS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          teachersCacheMemory = parsed;
          return parsed;
        }
      }
    } catch {}
  }
  return [];
}

function setCachedTeachersList(list: Teacher[]) {
  if (!Array.isArray(list) || list.length === 0) return;
  teachersCacheMemory = list;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(TEACHERS_STORAGE_KEY, JSON.stringify(list));
    } catch {}
  }
}

export async function fetchTeachers(): Promise<{ data: Teacher[]; isFromSupabase: boolean }> {
  const cached = getCachedTeachersList();

  const revalidate = async () => {
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
      }

      if (rows.length > 0) {
        const mapped: Teacher[] = rows.map((d: any) => {
          const cachedMatch = cached.find((c) => c.id === d.id || c.name === d.full_name);
          return {
            id: d.id || d.login_id,
            name: d.full_name || "Teacher",
            className: d.class_name || "Nursery A",
            subject: d.subject || "General",
            email: d.email || `${(d.full_name || "teacher").toLowerCase().replace(/\s+/g, ".")}@sunshine.edu`,
            phone: d.mobile || "9876543210",
            experience: d.experience || 2,
            joined: d.created_at?.slice(0, 10) || new Date().toISOString().split("T")[0],
            avatar: d.photo_url || d.avatar_url || d.avatar || cachedMatch?.avatar || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(d.full_name || "Teacher")}`,
            branch: d.branch || "Main Branch",
          };
        });

        const localList = getCachedTeachersList();
        const mergedMap = new Map<string, Teacher>();
        mapped.forEach((t) => mergedMap.set(t.id, t));
        localList.forEach((localTch) => {
          const dbTch = mergedMap.get(localTch.id);
          if (dbTch) {
            mergedMap.set(localTch.id, { ...dbTch, ...localTch });
          } else {
            mergedMap.set(localTch.id, localTch);
          }
        });

        const finalMerged = Array.from(mergedMap.values());
        setCachedTeachersList(finalMerged);
        return { data: finalMerged, isFromSupabase: true };
      }
    } catch {}
    return { data: cached, isFromSupabase: false };
  };

  return await revalidate();
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
    avatar_url: teacher.avatar,
  };

  try {
    const { data, error } = await supabase.from("gv_users").insert([payload]).select();
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
      payload.avatar_url = updates.avatar;
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
  try {
    const { error } = await supabase.from("gv_users").delete().eq("id", id);
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
  } catch {}
}

export async function fetchEnquiries(): Promise<{ data: Enquiry[]; isFromSupabase: boolean }> {
  const localEnquiries = getStoredEnquiries();
  try {
    const { data, error } = await supabase
      .from("gv_requests")
      .select("*")
      .eq("request_type", "enquiry")
      .order("created_at", { ascending: false });

    const rows = data || [];
    if (!error && rows.length > 0) {
      const normalizeStatus = (s: string): Enquiry["status"] => {
        if (!s) return "New";
        const st = s.toLowerCase();
        if (st.includes("completed")) return "Visit Completed";
        if (st.includes("doc")) return "Documents Pending";
        if (st.includes("approv")) return "Admission Approved";
        if (st.includes("enroll")) return "Enrolled";
        if (st.includes("drop") || st.includes("cancel")) return "Dropped";
        return "New";
      };

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
        status: normalizeStatus(d.status),
        followUp: d.follow_up_date || d.created_at?.slice(0, 10),
        notes: d.reason_or_notes || "",
        createdAt: d.created_at || new Date().toISOString(),
      }));

      const combined = [...mapped];
      localEnquiries.forEach((loc) => {
        if (!combined.some((c) => c.id === loc.id)) combined.unshift(loc);
      });

      saveStoredEnquiries(combined);
      return { data: combined, isFromSupabase: true };
    }
  } catch {}

  return { data: localEnquiries, isFromSupabase: false };
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

  const localList = getStoredEnquiries();
  saveStoredEnquiries([newEnqObj, ...localList]);
  // Assuming helpers like notifyAutoRefresh and pushAdminNotification are available in scope
  // If not, these calls should be handled accordingly.
  try {
    const { data, error } = await supabase.from("gv_requests").insert([payload]).select();
    return { data: data || [newEnqObj], error: error?.message || null };
  } catch (err: any) {
    return { data: [newEnqObj], error: null };
  }
}

// ─── 5. FEES & PAYMENTS ───────────────────────────────────────────────────

export function recalculateFeeLedger(ledger: Partial<FeeLedgerItem>): FeeLedgerItem {
  const payments = Array.isArray(ledger.payments) ? ledger.payments : [];
  const paymentsSum = payments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
  const paid = Math.max(paymentsSum, Number(ledger.paid || 0));

  const rawOrig = Number(ledger.originalFee ?? ledger.amount ?? 12000);
  const originalFee = Math.max(rawOrig, paid);
  const discountAmount = Math.max(0, Number(ledger.discountAmount ?? 0));
  const finalFee = Math.max(0, originalFee - discountAmount);
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

let feeLedgersCacheMemory: FeeLedgerItem[] = [];
const FEE_LEDGERS_STORAGE_KEY = "sunshine.fee_ledgers.cache.v1";

function getCachedFeeLedgersList(): FeeLedgerItem[] {
  if (feeLedgersCacheMemory.length > 0) return feeLedgersCacheMemory;
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(FEE_LEDGERS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          feeLedgersCacheMemory = parsed;
          return parsed;
        }
      }
    } catch {}
  }
  return [];
}

function setCachedFeeLedgersList(list: FeeLedgerItem[]) {
  if (!Array.isArray(list) || list.length === 0) return;
  feeLedgersCacheMemory = list;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(FEE_LEDGERS_STORAGE_KEY, JSON.stringify(list));
    } catch {}
  }
}

export async function fetchMergedFeeLedgers(): Promise<{ data: FeeLedgerItem[]; isFromSupabase: boolean }> {
  const cached = getCachedFeeLedgersList();

  const revalidate = async () => {
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
          return recalculateFeeLedger({
            ...existing,
            admissionNo: existing.admissionNo || s.admissionNo || s.id,
            studentName: s.name || existing.studentName,
            className: s.className || existing.className,
            section: s.section || existing.section || "A",
            rollNo: existing.rollNo || s.rollNo,
          });
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
          paid: s.feeStatus === "Paid" ? 12000 : 0,
          status: s.feeStatus === "Paid" ? "Paid" : "Pending",
        });
      });

      setCachedFeeLedgersList(combined);
      return { data: combined, isFromSupabase: true };
    } catch {
      return { data: cached, isFromSupabase: false };
    }
  };

  return await revalidate();
}

export async function fetchFees(): Promise<{ data: FeeLedgerItem[]; isFromSupabase: boolean }> {
  try {
    const { data, error } = await supabase
      .from("gv_fees_payments")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return { data: [], isFromSupabase: false };
    const rows = data || [];

    const studentLedgerMap = new Map<string, {
      studentId: string;
      studentName: string;
      className: string;
      originalFee: number;
      discountAmount: number;
      payments: PaymentTransaction[];
    }>();

    rows.forEach((d: any) => {
      const key = (d.student_id || d.student_name || "unknown").toLowerCase();
      if (!studentLedgerMap.has(key)) {
        studentLedgerMap.set(key, {
          studentId: d.student_id || key,
          studentName: d.student_name || "Student",
          className: d.class_name || "Nursery",
          originalFee: Number(d.amount_due || 12000),
          discountAmount: 0,
          payments: [],
        });
      }
      const ledger = studentLedgerMap.get(key)!;
      if (d.receipt_number || d.amount_paid) {
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

    const mapped: FeeLedgerItem[] = Array.from(studentLedgerMap.values()).map((item) => {
      const totalPaid = item.payments.reduce((sum, p) => sum + p.amount, 0);
      return recalculateFeeLedger({
        id: `FP-${item.studentId}`,
        studentId: item.studentId,
        studentName: item.studentName,
        className: item.className,
        originalFee: item.originalFee,
        discountAmount: item.discountAmount,
        paid: totalPaid,
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
      .order("payment_date", { ascending: false });

    if (error || !data) return { data: [], isFromSupabase: false };

    const receipts = data.map((d: any) => ({
      receiptNo: d.receipt_number || `REC-${d.id}`,
      studentName: d.student_name || "Student",
      admissionNo: d.student_id || "ADM",
      className: d.class_name || "Nursery",
      feeType: d.fee_type || "Term Fee",
      amountDue: Number(d.amount_due || 0),
      amountPaid: Number(d.amount_paid || 0),
      balance: Number(d.balance || 0),
      method: d.payment_method || "Cash",
      reference: d.transaction_ref || d.receipt_number || "REF",
      date: d.payment_date || d.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      remarks: d.recorded_by ? `Recorded by ${d.recorded_by}` : "Paid",
      status: d.status || "Paid",
      collectedBy: d.recorded_by || "Office Staff",
    }));

    return { data: receipts, isFromSupabase: true };
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
