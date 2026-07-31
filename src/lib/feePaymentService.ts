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

// ─── FEES & PAYMENTS SERVICE (Module 3: fees_payments) ───────────────────────

export async function fetchFeesFromModule(): Promise<{ data: FeeRecord[]; isFromSupabase: boolean }> {
  try {
    const { data, error } = await supabase
      .from("fees_payments")
      .select("*")
      .eq("record_type", "fee_schedule");

    if (error || !data || data.length === 0) {
      // Fallback query to legacy fees table
      const { data: legacy } = await supabase.from("fees").select("*");
      if (legacy && legacy.length > 0) {
        const mapped: FeeRecord[] = legacy.map((d: any) => ({
          id: d.id,
          studentId: d.student_id,
          feeType: d.fee_type,
          academicYear: d.academic_year,
          amountDue: Number(d.amount_due),
          amountPaid: Number(d.amount_paid),
          balance: Number(d.balance),
          status: d.status,
        }));
        return { data: mapped, isFromSupabase: true };
      }
      return { data: [], isFromSupabase: false };
    }

    const mapped: FeeRecord[] = data.map((d: any) => ({
      id: d.id,
      studentId: d.student_id,
      feeType: d.fee_type,
      academicYear: d.academic_year || "2024-2025",
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
      .from("fees_payments")
      .select("*")
      .eq("record_type", "payment_receipt");

    if (error || !data || data.length === 0) {
      // Fallback query to legacy receipts table
      const { data: legacy } = await supabase.from("receipts").select("*");
      if (legacy && legacy.length > 0) {
        const mapped: ReceiptRecord[] = legacy.map((d: any) => ({
          id: d.id,
          studentId: d.student_id,
          studentName: d.student_name,
          className: d.class_name,
          feeType: d.fee_type,
          amountPaid: Number(d.amount_paid),
          paymentDate: d.payment_date,
          paymentMethod: d.payment_method || "Cash",
          receiptNumber: d.receipt_number,
          transactionRef: d.transaction_ref,
          status: d.status || "Verified",
          recordedBy: d.recorded_by || "Office Staff",
        }));
        return { data: mapped, isFromSupabase: true };
      }
      return { data: [], isFromSupabase: false };
    }

    const mapped: ReceiptRecord[] = data.map((d: any) => ({
      id: d.id,
      studentId: d.student_id,
      studentName: d.student_name || "Student",
      className: d.class_name || "Nursery",
      feeType: d.fee_type || "Annual Fee",
      amountPaid: Number(d.amount_paid || 0),
      paymentDate: d.payment_date || new Date().toISOString().split("T")[0],
      paymentMethod: (d.payment_method as any) || "Cash",
      receiptNumber: d.receipt_number || d.id,
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
    fee_type: receipt.feeType,
    amount_paid: receipt.amountPaid,
    payment_date: receipt.paymentDate || new Date().toISOString().split("T")[0],
    payment_method: receipt.paymentMethod || "Cash",
    receipt_number: receipt.receiptNumber || `REC-${Date.now()}`,
    transaction_ref: receipt.transactionRef || "",
    status: receipt.status || "Verified",
    recorded_by: receipt.recordedBy || "Office Staff",
  };

  try {
    const { data, error } = await supabase.from("fees_payments").insert([payload]).select();
    // Dual-write legacy receipts table for resilience
    Promise.resolve(supabase.from("receipts").insert([{
      id: payload.id,
      student_id: payload.student_id,
      student_name: payload.student_name,
      class_name: payload.class_name,
      fee_type: payload.fee_type,
      amount_paid: payload.amount_paid,
      payment_date: payload.payment_date,
      payment_method: payload.payment_method,
      receipt_number: payload.receipt_number,
      transaction_ref: payload.transaction_ref,
      status: payload.status,
      recorded_by: payload.recorded_by,
    }])).catch(() => {});
    return { data: data ? data[0] : payload, error };
  } catch (err) {
    return { data: payload, error: err };
  }
}
