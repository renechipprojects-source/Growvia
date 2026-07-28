import { supabase } from "./supabase";
import { STUDENTS, TEACHERS, ENQUIRIES, FEES, type Student, type Teacher, type Enquiry, type Fee, type Expense } from "./mockData";
import { generateParentCredential } from "./credentials";
export type { Student, Teacher, Enquiry, Fee, Expense };

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

import { pushAdminNotification } from "./admin-notifications";
import { NotificationService } from "./notifications";

export async function createCircular(circular: Omit<Circular, "id">) {
  const newId = `CIR-${Date.now().toString().slice(-4)}`;
  const payload = { ...circular, id: newId };
  const { data, error } = await supabase.from("circulars").insert([payload]).select();
  pushAdminNotification(`New Circular: ${circular.title}`, "circular");
  NotificationService.circularPublished(circular.title);
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
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    if (key === "SUNSHINE_STUDENTS") return STUDENTS as any;
    if (key === "SUNSHINE_TEACHERS") return TEACHERS as any;
    if (key === "SUNSHINE_ENQUIRIES") return ENQUIRIES as any;
    if (key === "SUNSHINE_FEES") return FEES as any;
    return [];
  } catch {
    if (key === "SUNSHINE_STUDENTS") return STUDENTS as any;
    if (key === "SUNSHINE_TEACHERS") return TEACHERS as any;
    if (key === "SUNSHINE_ENQUIRIES") return ENQUIRIES as any;
    if (key === "SUNSHINE_FEES") return FEES as any;
    return [];
  }
}

function saveLocalStore<T>(key: string, item: T) {
  if (typeof window === "undefined") return;
  try {
    const current = getLocalStore<T>(key);
    const itemAny = item as any;
    const filtered = itemAny?.id ? current.filter((c: any) => c.id !== itemAny.id) : current;
    localStorage.setItem(key, JSON.stringify([item, ...filtered]));
  } catch {}
}

// ─── STUDENTS ─────────────────────────────────────────────────────────────

export async function fetchStudents(): Promise<{ data: Student[]; isFromSupabase: boolean }> {
  const localList = getLocalStore<Student>("SUNSHINE_STUDENTS");
  try {
    const { data, error } = await supabase.from("students").select("*");
    if (error || !data || data.length === 0) return { data: localList.length > 0 ? localList : STUDENTS, isFromSupabase: true };
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

export async function createInitialFeeForStudent(student: Student) {
  try {
    const { data: existingFees } = await fetchFees();
    const duplicate = existingFees.find(
      (f) =>
        f.studentId === student.id ||
        f.id === `F-STU-${student.id}` ||
        (f.studentName === student.name && f.className.includes(student.className))
    );
    if (duplicate) {
      return duplicate;
    }

    const CLASS_FEE_MAP: Record<string, number> = {
      Playgroup: 8500,
      Nursery: 9500,
      LKG: 10500,
      UKG: 10500,
    };

    const feeAmount = CLASS_FEE_MAP[student.className] || 9500;
    const currentMonth = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
    const dueDateStr = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const initialFee: FeeLedgerItem = recalculateFeeLedger({
      id: `F-STU-${student.id}`,
      studentId: student.id,
      studentName: student.name,
      className: `${student.className} ${student.section || "A"}`.trim(),
      originalFee: feeAmount,
      discountAmount: 0,
      finalFee: feeAmount,
      amount: feeAmount,
      paid: student.feeStatus === "Paid" ? feeAmount : 0,
      dueDate: dueDateStr,
      status: student.feeStatus === "Paid" ? "Paid" : "Pending",
      month: currentMonth,
    });

    await saveFeeRecord(initialFee);
    return initialFee;
  } catch (err) {
    console.warn("Initial fee creation notice:", err);
    return null;
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
    generateParentCredential(formattedStudent.id, { student: formattedStudent });
  } catch {}

  // Auto-create initial fee record for newly admitted student
  try {
    await createInitialFeeForStudent(formattedStudent);
  } catch {}

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

export async function updateStudentSectionAndRoll(id: string, className: string, section: string, rollNo?: number) {
  const payload: any = { class_name: className, section };
  if (typeof rollNo === "number") payload.roll_no = rollNo;
  try {
    const { data, error } = await supabase.from("students").update(payload).eq("id", id).select();
    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

export async function allocateRollNumbersAlphabetically(targetClass?: string, targetSection?: string) {
  try {
    const { data: students } = await fetchStudents();
    let filtered = students;
    if (targetClass) filtered = filtered.filter((s) => s.className === targetClass);
    if (targetSection) filtered = filtered.filter((s) => s.section === targetSection);

    const groups: Record<string, Student[]> = {};
    filtered.forEach((s) => {
      const key = `${s.className}_${s.section}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    });

    let updatedCount = 0;

    for (const key of Object.keys(groups)) {
      const groupStudents = [...groups[key]].sort((a, b) => a.name.localeCompare(b.name));
      for (let index = 0; index < groupStudents.length; index++) {
        const s = groupStudents[index];
        const newRollNo = index + 1;
        if (s.rollNo !== newRollNo) {
          const updated = { ...s, rollNo: newRollNo };
          saveLocalStore<Student>("SUNSHINE_STUDENTS", updated);
          await supabase.from("students").update({ roll_no: newRollNo }).eq("id", s.id);
          updatedCount++;
        }
      }
    }
    return { count: updatedCount, error: null };
  } catch (err) {
    return { count: 0, error: err };
  }
}

// ─── TEACHERS ─────────────────────────────────────────────────────────────

export async function fetchTeachers(): Promise<{ data: Teacher[]; isFromSupabase: boolean }> {
  const localList = getLocalStore<Teacher>("SUNSHINE_TEACHERS");
  try {
    const { data, error } = await supabase.from("teachers").select("*");
    if (error || !data || data.length === 0) return { data: localList.length > 0 ? localList : TEACHERS, isFromSupabase: true };
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

// ─── FEES & STUDENT FEE LEDGER ──────────────────────────────────────────────

export interface PaymentTransaction {
  id: string; // payment_id
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
  amount: number; // backward compatibility
  paid: number;
  remainingAmount: number;
  totalInstallments: number;
  paidInstallments: number;
  status: "Paid" | "Partial" | "Pending";
  dueDate?: string;
  month?: string;
  lastPaymentDate?: string;
  payments: PaymentTransaction[];
  updatedAt?: string;
}

export function recalculateFeeLedger(ledger: Partial<FeeLedgerItem>): FeeLedgerItem {
  const originalFee = Number(ledger.originalFee ?? ledger.amount ?? 8500);
  const discountAmount = Math.max(0, Number(ledger.discountAmount ?? 0));
  const finalFee = Math.max(0, originalFee - discountAmount);

  const payments = Array.isArray(ledger.payments) ? ledger.payments : [];
  const paid = payments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
  const remainingAmount = Math.max(0, finalFee - paid);

  const totalInstallments = ledger.totalInstallments || 3;
  const paidInstallments = payments.length > 0 ? Math.min(totalInstallments, payments.length) : (paid >= finalFee && finalFee > 0 ? totalInstallments : 0);
  const status: "Paid" | "Partial" | "Pending" = remainingAmount === 0 && finalFee > 0 ? "Paid" : paid > 0 ? "Partial" : "Pending";
  const lastPaymentDate = payments.length > 0 ? payments[payments.length - 1].date : ledger.lastPaymentDate || "—";

  return {
    id: ledger.id || `F-STU-${ledger.studentId}`,
    studentId: ledger.studentId || "STD-001",
    studentName: ledger.studentName || "Student",
    admissionNo: ledger.admissionNo || `ADM-${ledger.studentId}`,
    className: ledger.className || "Playgroup",
    section: ledger.section || "A",
    academicYear: ledger.academicYear || "2026-2027",
    originalFee,
    discountAmount,
    finalFee,
    amount: finalFee,
    paid,
    remainingAmount,
    totalInstallments,
    paidInstallments,
    status,
    dueDate: ledger.dueDate || "2026-07-15",
    month: ledger.month || "Academic Year 2026-2027",
    lastPaymentDate,
    payments,
    updatedAt: new Date().toISOString(),
  };
}

export async function fetchFees(): Promise<{ data: FeeLedgerItem[]; isFromSupabase: boolean }> {
  const localList = getLocalStore<FeeLedgerItem>("SUNSHINE_FEES");
  try {
    const { data, error } = await supabase.from("fees").select("*");
    if (error || !data || data.length === 0) {
      const source = localList.length > 0 ? localList : (FEES as any[]);
      const deduplicatedMap = new Map<string, FeeLedgerItem>();

      source.forEach((item: any) => {
        const key = item.studentId || item.id;
        if (!deduplicatedMap.has(key)) {
          const rec = recalculateFeeLedger(item);
          deduplicatedMap.set(key, rec);
        }
      });

      return { data: Array.from(deduplicatedMap.values()), isFromSupabase: false };
    }

    const deduplicatedMap = new Map<string, FeeLedgerItem>();
    data.forEach((d: any) => {
      const key = d.student_id || d.id;
      if (!deduplicatedMap.has(key)) {
        const item: FeeLedgerItem = recalculateFeeLedger({
          id: d.id,
          studentId: d.student_id,
          studentName: d.student_name,
          admissionNo: d.admission_no || d.student_id,
          className: d.class_name,
          section: d.section || "A",
          academicYear: d.academic_year || "2026-2027",
          originalFee: Number(d.original_fee || d.amount || 8500),
          discountAmount: Number(d.discount_amount || 0),
          finalFee: Number(d.final_fee || d.amount || 8500),
          amount: Number(d.final_fee || d.amount || 8500),
          paid: Number(d.paid || 0),
          dueDate: d.due_date,
          status: d.status,
          month: d.month,
          totalInstallments: d.total_installments || 3,
          paidInstallments: d.paid_installments || 0,
          payments: Array.isArray(d.payments) ? d.payments : [],
        });
        deduplicatedMap.set(key, item);
      }
    });

    return { data: Array.from(deduplicatedMap.values()), isFromSupabase: true };
  } catch {
    return { data: localList.map(recalculateFeeLedger), isFromSupabase: false };
  }
}

export async function saveFeeRecord(fee: FeeLedgerItem) {
  const recalculated = recalculateFeeLedger(fee);
  saveLocalStore<FeeLedgerItem>("SUNSHINE_FEES", recalculated);
  try {
    await supabase.from("fees").upsert([{
      id: recalculated.id,
      student_id: recalculated.studentId,
      student_name: recalculated.studentName,
      admission_no: recalculated.admissionNo,
      class_name: recalculated.className,
      section: recalculated.section,
      academic_year: recalculated.academicYear,
      original_fee: recalculated.originalFee,
      discount_amount: recalculated.discountAmount,
      final_fee: recalculated.finalFee,
      amount: recalculated.finalFee,
      paid: recalculated.paid,
      remaining_amount: recalculated.remainingAmount,
      due_date: recalculated.dueDate,
      status: recalculated.status,
      month: recalculated.month,
      total_installments: recalculated.totalInstallments,
      paid_installments: recalculated.paidInstallments,
      payments: recalculated.payments,
      updated_at: recalculated.updatedAt,
    }]);
  } catch (err) {
    console.warn("Supabase fee save notice:", err);
  }
}

export async function saveReceipt(rcpt: any) {
  saveLocalStore<any>("SUNSHINE_RECEIPTS", rcpt);
  try {
    await supabase.from("receipts").insert([{
      receipt_no: rcpt.receiptNo,
      student_name: rcpt.studentName,
      admission_no: rcpt.admissionNo,
      class_name: rcpt.className,
      fee_type: rcpt.feeType,
      amount_due: rcpt.amountDue,
      amount_paid: rcpt.amountPaid,
      balance: rcpt.balance,
      method: rcpt.method,
      reference: rcpt.reference,
      date: rcpt.date,
      remarks: rcpt.remarks,
      status: rcpt.status,
      collected_by: rcpt.collectedBy,
    }]);
  } catch (err) {
    console.warn("Supabase receipt save notice:", err);
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

export async function updateStudent(id: string, updates: Partial<Student>) {
  try {
    const payload: Record<string, any> = {};
    if (updates.name) payload.name = updates.name;
    if (updates.className) payload.class_name = updates.className;
    if (updates.section) payload.section = updates.section;
    if (updates.parent) payload.parent_name = updates.parent;
    if (updates.phone) payload.phone = updates.phone;
    if (updates.feeStatus) payload.fee_status = updates.feeStatus;

    const { data, error } = await supabase.from("students").update(payload).eq("id", id).select();
    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

export async function deleteStudent(id: string) {
  try {
    const { error } = await supabase.from("students").delete().eq("id", id);
    return { error };
  } catch (err) {
    return { error: err };
  }
}

export async function deleteTeacher(id: string) {
  try {
    const { error } = await supabase.from("teachers").delete().eq("id", id);
    return { error };
  } catch (err) {
    return { error: err };
  }
}

export async function deleteCircular(id: string) {
  try {
    const { error } = await supabase.from("circulars").delete().eq("id", id);
    return { error };
  } catch (err) {
    return { error: err };
  }
}

export async function updateProfileStatus(loginId: string, status: string) {
  try {
    const { data, error } = await supabase.from("profiles").update({ status }).eq("login_id", loginId).select();
    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

export async function fetchEvents(): Promise<{ data: any[]; isFromSupabase: boolean }> {
  try {
    const { data, error } = await supabase.from("events").select("*").order("date", { ascending: true });
    if (error || !data || data.length === 0) return { data: [], isFromSupabase: false };
    return { data, isFromSupabase: true };
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
