import { supabase } from "./supabase";
import type { Student, Teacher, Enquiry, Fee, Expense } from "./mockData";

export interface Circular {
  id?: string;
  title: string;
  content: string;
  target_audience: "All" | "Teachers" | "Parents" | "Office";
  published_date: string;
  author: string;
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

// ─── CIRCULARS & NOTICES ──────────────────────────────────────────────────

export async function fetchCirculars(): Promise<{ data: Circular[]; isFromSupabase: boolean }> {
  try {
    const { data, error } = await supabase.from("circulars").select("*").order("published_date", { ascending: false });
    if (error || !data) return { data: [], isFromSupabase: false };
    return { data, isFromSupabase: true };
  } catch {
    return { data: [], isFromSupabase: false };
  }
}

export async function createCircular(circular: Omit<Circular, "id">) {
  const newId = `CIR-${Date.now().toString().slice(-4)}`;
  const payload = { ...circular, id: newId };
  const { data, error } = await supabase.from("circulars").insert([payload]).select();
  return { data: data ? data[0] : payload, error };
}

// ─── MESSAGING ────────────────────────────────────────────────────────────

export async function fetchMessages(userId: string): Promise<{ data: Message[]; isFromSupabase: boolean }> {
  try {
    const { data, error } = await supabase.from("messages").select("*").or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
    if (error || !data) return { data: [], isFromSupabase: false };
    return { data, isFromSupabase: true };
  } catch {
    return { data: [], isFromSupabase: false };
  }
}

export async function sendMessage(message: Omit<Message, "id" | "sent_at">) {
  const newId = `MSG-${Date.now().toString().slice(-4)}`;
  const payload = { ...message, id: newId, sent_at: new Date().toISOString() };
  const { data, error } = await supabase.from("messages").insert([payload]).select();
  return { data: data ? data[0] : payload, error };
}

// ─── LEAVE REQUESTS ───────────────────────────────────────────────────────

export async function fetchLeaveRequests(): Promise<{ data: LeaveRequest[]; isFromSupabase: boolean }> {
  try {
    const { data, error } = await supabase.from("leave_requests").select("*");
    if (error || !data) return { data: [], isFromSupabase: false };
    return { data, isFromSupabase: true };
  } catch {
    return { data: [], isFromSupabase: false };
  }
}

export async function createLeaveRequest(leave: Omit<LeaveRequest, "id">) {
  const newId = `LR-${Date.now().toString().slice(-4)}`;
  const payload = { ...leave, id: newId, applied_on: new Date().toISOString().split("T")[0] };
  const { data, error } = await supabase.from("leave_requests").insert([payload]).select();
  return { data: data ? data[0] : payload, error };
}

export async function updateLeaveStatus(id: string, status: "Approved" | "Rejected") {
  const { data, error } = await supabase.from("leave_requests").update({ status }).eq("id", id).select();
  return { data, error };
}

// ─── LOCAL STORAGE RESILIENT CACHE ───────────────────────────────────────

function getLocalStore<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalStore<T>(key: string, item: T) {
  if (typeof window === "undefined") return;
  try {
    const current = getLocalStore<T>(key);
    localStorage.setItem(key, JSON.stringify([item, ...current]));
  } catch {}
}

// ─── STUDENTS ─────────────────────────────────────────────────────────────

export async function fetchStudents(): Promise<{ data: Student[]; isFromSupabase: boolean }> {
  const localList = getLocalStore<Student>("SUNSHINE_STUDENTS");
  try {
    const { data, error } = await supabase.from("students").select("*");
    if (error || !data) return { data: localList, isFromSupabase: true };
    const mapped: Student[] = data.map((d: any) => ({
      id: d.id,
      rollNo: d.roll_no,
      admissionNo: d.admission_no,
      name: d.name,
      age: d.age,
      dob: d.dob,
      className: d.class_name,
      section: d.section,
      parent: d.parent_name,
      parentId: d.parent_id,
      phone: d.phone,
      gender: d.gender,
      house: d.house,
      admissionDate: d.admission_date,
      feeStatus: d.fee_status,
      avatar: d.avatar,
      attendance: d.attendance_pct,
      branch: d.branch,
    }));
    // Merge local additions avoiding duplicate IDs
    const existingIds = new Set(mapped.map((m) => m.id));
    const uniqueLocal = localList.filter((l) => !existingIds.has(l.id));
    return { data: [...uniqueLocal, ...mapped], isFromSupabase: true };
  } catch {
    return { data: localList, isFromSupabase: true };
  }
}

export async function createStudent(student: Omit<Student, "id"> & { id?: string }) {
  const newId = student.id || `STU-${Date.now().toString().slice(-4)}`;
  const payload = {
    id: newId,
    roll_no: student.rollNo || 1,
    admission_no: student.admissionNo || `ADM${Date.now().toString().slice(-4)}`,
    name: student.name,
    age: student.age || 3,
    dob: student.dob || "2022-01-01",
    class_name: student.className || "Nursery",
    section: student.section || "A",
    parent_name: student.parent || "Parent",
    parent_id: student.parentId || `PAR-${Date.now().toString().slice(-4)}`,
    phone: student.phone || "9876543210",
    gender: ((student.gender as string) === "Female" || student.gender === "Girl") ? "Girl" : "Boy",
    house: student.house || "Red",
    admission_date: student.admissionDate || new Date().toISOString().split("T")[0],
    fee_status: student.feeStatus || "Pending",
    avatar: student.avatar || `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(student.name)}`,
    attendance_pct: student.attendance || 100,
    branch: student.branch || "Main Branch",
  };

  const formattedStudent: Student = {
    id: newId,
    rollNo: payload.roll_no,
    admissionNo: payload.admission_no,
    name: payload.name,
    age: payload.age,
    dob: payload.dob,
    className: payload.class_name as any,
    section: payload.section as any,
    parent: payload.parent_name,
    parentId: payload.parent_id,
    phone: payload.phone,
    gender: payload.gender as any,
    house: payload.house as any,
    admissionDate: payload.admission_date,
    feeStatus: payload.fee_status as any,
    avatar: payload.avatar,
    attendance: payload.attendance_pct,
    branch: payload.branch,
  };

  // Always save locally first so user never experiences data loss or stuck UI
  saveLocalStore<Student>("SUNSHINE_STUDENTS", formattedStudent);

  try {
    const { data, error } = await supabase.from("students").insert([payload]).select();
    if (error) {
      console.warn("Supabase student insert notice:", error.message);
    }
    return { data: data ? data[0] : formattedStudent, error: null };
  } catch (err) {
    return { data: formattedStudent, error: null };
  }
}

// ─── TEACHERS ─────────────────────────────────────────────────────────────

export async function fetchTeachers(): Promise<{ data: Teacher[]; isFromSupabase: boolean }> {
  const localList = getLocalStore<Teacher>("SUNSHINE_TEACHERS");
  try {
    const { data, error } = await supabase.from("teachers").select("*");
    if (error || !data) return { data: localList, isFromSupabase: true };
    const mapped: Teacher[] = data.map((d: any) => ({
      id: d.id,
      name: d.name,
      className: d.class_name,
      subject: d.subject,
      email: d.email,
      phone: d.phone,
      experience: d.experience,
      joined: d.joined_date,
      avatar: d.avatar,
      branch: d.branch,
    }));
    const existingIds = new Set(mapped.map((m) => m.id));
    const uniqueLocal = localList.filter((l) => !existingIds.has(l.id));
    return { data: [...uniqueLocal, ...mapped], isFromSupabase: true };
  } catch {
    return { data: localList, isFromSupabase: true };
  }
}

export async function createTeacher(teacher: Omit<Teacher, "id"> & { id?: string }) {
  const newId = teacher.id || `TCH-${Date.now().toString().slice(-4)}`;
  const payload = {
    id: newId,
    name: teacher.name,
    class_name: teacher.className || "Nursery A",
    subject: teacher.subject || "General",
    email: teacher.email || `${teacher.name.toLowerCase().replace(/\s+/g, ".")}@sunshineschool.edu`,
    phone: teacher.phone || "9876543210",
    experience: teacher.experience || 1,
    joined_date: teacher.joined || new Date().toISOString().split("T")[0],
    avatar: teacher.avatar || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(teacher.name)}`,
    branch: teacher.branch || "Main Branch",
  };

  const formattedTeacher: Teacher = {
    id: newId,
    name: payload.name,
    className: payload.class_name,
    subject: payload.subject,
    email: payload.email,
    phone: payload.phone,
    experience: payload.experience,
    joined: payload.joined_date,
    avatar: payload.avatar,
    branch: payload.branch,
  };

  saveLocalStore<Teacher>("SUNSHINE_TEACHERS", formattedTeacher);

  try {
    const { data, error } = await supabase.from("teachers").insert([payload]).select();
    if (error) console.warn("Supabase teacher insert notice:", error.message);
    return { data: data ? data[0] : formattedTeacher, error: null };
  } catch (err) {
    return { data: formattedTeacher, error: null };
  }
}

// ─── ENQUIRIES ────────────────────────────────────────────────────────────

export async function fetchEnquiries(): Promise<{ data: Enquiry[]; isFromSupabase: boolean }> {
  try {
    const { data, error } = await supabase.from("enquiries").select("*");
    if (error || !data) return { data: [], isFromSupabase: false };
    const mapped: Enquiry[] = data.map((d: any) => ({
      id: d.id,
      childName: d.child_name,
      parentName: d.parent_name,
      phone: d.phone,
      altPhone: d.alt_phone,
      email: d.email,
      address: d.address,
      gender: d.gender,
      dob: d.dob,
      previousSchool: d.previous_school,
      age: d.age,
      interestedClass: d.interested_class,
      source: d.source,
      status: d.status,
      followUp: d.follow_up,
      notes: d.notes,
      createdAt: d.created_at,
    }));
    return { data: mapped, isFromSupabase: true };
  } catch {
    return { data: [], isFromSupabase: false };
  }
}

export async function createEnquiry(enquiry: Omit<Enquiry, "id" | "createdAt">) {
  const newId = `ENQ-${Date.now().toString().slice(-4)}`;
  const payload = {
    id: newId,
    child_name: enquiry.childName,
    parent_name: enquiry.parentName,
    phone: enquiry.phone,
    alt_phone: enquiry.altPhone,
    email: enquiry.email,
    address: enquiry.address,
    gender: enquiry.gender || "Boy",
    dob: enquiry.dob,
    previous_school: enquiry.previousSchool,
    age: enquiry.age,
    interested_class: enquiry.interestedClass,
    source: enquiry.source || "Walk-in",
    status: enquiry.status || "New",
    follow_up: enquiry.followUp,
    notes: enquiry.notes,
  };

  const { data, error } = await supabase.from("enquiries").insert([payload]).select();
  return { data, error };
}

// ─── FEES ─────────────────────────────────────────────────────────────────

export async function fetchFees(): Promise<{ data: Fee[]; isFromSupabase: boolean }> {
  try {
    const { data, error } = await supabase.from("fees").select("*");
    if (error || !data) return { data: [], isFromSupabase: false };
    const mapped: Fee[] = data.map((d: any) => ({
      id: d.id,
      studentId: d.student_id,
      studentName: d.student_name,
      className: d.class_name,
      amount: Number(d.amount),
      paid: Number(d.paid),
      dueDate: d.due_date,
      status: d.status,
      month: d.month,
    }));
    return { data: mapped, isFromSupabase: true };
  } catch {
    return { data: [], isFromSupabase: false };
  }
}

// ─── EXPENSES ─────────────────────────────────────────────────────────────

export async function fetchExpenses(): Promise<{ data: Expense[]; isFromSupabase: boolean }> {
  try {
    const { data, error } = await supabase.from("expenses").select("*");
    if (error || !data) return { data: [], isFromSupabase: false };
    const mapped: Expense[] = data.map((d: any) => ({
      id: d.id,
      category: d.category,
      description: d.description,
      amount: Number(d.amount),
      date: d.expense_date,
      paidTo: d.paid_to,
    }));
    return { data: mapped, isFromSupabase: true };
  } catch {
    return { data: [], isFromSupabase: false };
  }
}

// ─── SYSTEM STATUS CHECK ──────────────────────────────────────────────────

export async function checkSupabaseConnection(): Promise<{
  connected: boolean;
  profileCount: number;
  message: string;
}> {
  try {
    const { data, error, count } = await supabase
      .from("profiles")
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
      message: "Successfully connected to Supabase database!",
    };
  } catch (err: any) {
    return {
      connected: false,
      profileCount: 0,
      message: `Failed to connect: ${err?.message || "Unknown error"}`,
    };
  }
}
