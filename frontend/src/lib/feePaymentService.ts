import { supabase } from "./supabase";

export interface FeeRecord {
  id: string;
  studentId: string;
  feeType: string;
  academicYear: string;
  amountDue: number;
  amountPaid: number;
  balance: number;
  status: "Paid" | "Partial" | "Pending";
}

export interface ReceiptRecord {
  id: string;
  studentId: string;
  studentName: string;
  className: string;
  feeType: string;
  amountPaid: number;
  paymentDate: string;
  paymentMethod: "Cash" | "UPI" | "Bank Transfer";
  receiptNumber: string;
  transactionRef?: string;
  status: "Verified" | "Pending Approval";
  recordedBy: string;
}

// ─── FEES & PAYMENTS SERVICE (Module 3: GV_fees_payments) ───────────────────────

import { getDeveloperSettings } from "./developerSettingsStore";

export async function fetchFees(studentId?: string): Promise<{ data: FeeRecord[]; isFromSupabase: boolean }> {
  try {
    const devSettings = getDeveloperSettings();
    const activeYear = devSettings.school?.academicYear || "2026-2027";

    let query = supabase.from("gv_fees_payments").select("*").eq("record_type", "fee_schedule");
    if (studentId) {
      query = query.eq("student_id", studentId);
    }
    const { data, error } = await query;
    if (error) return { data: [], isFromSupabase: false };
    const rows = data || [];

    const mapped: FeeRecord[] = rows.map((d: any) => ({
      id: d.id,
      studentId: d.student_id,
      feeType: d.fee_type,
      academicYear: d.academic_year || activeYear,
      amountDue: Number(d.amount_due || 0),
      amountPaid: Number(d.amount_paid || 0),
      balance: Number(d.balance || 0),
      status: d.status as any,
    }));

    return { data: mapped, isFromSupabase: true };
  } catch {
    return { data: [], isFromSupabase: false };
  }
}

export async function fetchReceiptsFromModule(): Promise<{ data: ReceiptRecord[]; isFromSupabase: boolean }> {
  try {
    const { data, error } = await supabase
      .from("gv_fees_payments")
      .select("*")
      .eq("record_type", "payment_receipt");

    if (error) return { data: [], isFromSupabase: false };
    const rows = data || [];

    const mapped: ReceiptRecord[] = rows.map((d: any) => ({
      id: d.id,
      studentId: d.student_id || "STU-NONE",
      studentName: d.student_name || "Student",
      className: d.class_name || "Nursery",
      feeType: d.fee_type || "Term Fee",
      amountPaid: Number(d.amount_paid || 0),
      paymentDate: d.payment_date || d.created_at?.slice(0, 10),
      paymentMethod: (d.payment_method as any) || "Cash",
      receiptNumber: d.receipt_number || `RCPT-${d.id}`,
      transactionRef: d.transaction_ref,
      status: (d.status as any) || "Verified",
      recordedBy: d.recorded_by || "Office Staff",
    }));

    return { data: mapped, isFromSupabase: true };
  } catch {
    return { data: [], isFromSupabase: false };
  }
}

export async function recordPaymentToModule(receipt: Partial<ReceiptRecord>) {
  const payload = {
    id: receipt.id || `RCP-${Date.now()}`,
    record_type: "payment_receipt",
    student_id: receipt.studentId,
    student_name: receipt.studentName,
    class_name: receipt.className,
    fee_type: receipt.feeType || "Fee Payment",
    amount_paid: receipt.amountPaid,
    payment_date: receipt.paymentDate || new Date().toISOString().split("T")[0],
    payment_method: receipt.paymentMethod || "Cash",
    receipt_number: receipt.receiptNumber || `REC-${Date.now()}`,
    transaction_ref: receipt.transactionRef || "",
    status: receipt.status || "Verified",
    recorded_by: receipt.recordedBy || "Office Staff",
  };

  try {
    const { data, error } = await supabase.from("gv_fees_payments").insert([payload]).select();
    return { data: data ? data[0] : payload, error };
  } catch (err) {
    return { data: payload, error: err };
  }
}
