import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, StatCard, SectionCard } from "@/components/ui-blocks";
import { fetchStudents, fetchFees, saveFeeRecord, saveReceipt, recalculateFeeLedger, type FeeLedgerItem, type PaymentTransaction } from "@/lib/supabaseService";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Receipt as ReceiptIcon, Printer, Search, Plus, CheckCircle, Clock,
  DollarSign, Wallet, FileText, Eye, Edit3, Tag, Sparkles
} from "lucide-react";
import { NotificationService } from "@/lib/notifications";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useAutoRefresh } from "@/lib/autoRefreshContext";
import { useAcademicYear } from "@/lib/academicYearContext";

export const Route = createFileRoute("/office/fees")({ component: FeeCollection });

const PAYMENT_METHODS = ["Cash", "UPI", "Bank Transfer", "Cheque"] as const;
const FEE_TYPES = ["Tuition Fee", "Admission Fee", "Transport Fee", "Activity Fee", "Exam Fee"] as const;
const INSTALLMENT_OPTIONS = [1, 2, 3, 4] as const;

type Receipt = {
  receiptNo: string;
  studentName: string;
  admissionNo: string;
  className: string;
  feeType: string;
  amountDue: number;
  amountPaid: number;
  balance: number;
  method: string;
  reference: string;
  date: string;
  remarks: string;
  status: string;
  collectedBy: string;
};

function FeeSummaryCard({ label, value, accentColor }: { label: string; value: string | number; accentColor: string }) {
  return (
    <div className={cn("p-4 rounded-2xl border border-slate-200/80 bg-white/90 shadow-xs flex flex-col justify-between h-full min-h-[96px] transition-all hover:shadow-md border-l-4", accentColor)}>
      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
      <div className="mt-2 text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-none">
        {value}
      </div>
    </div>
  );
}

function FeeCollection() {
  const { activeYear } = useAcademicYear();
  const [feeList, setFeeList] = useState<FeeLedgerItem[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [academicYearFilter, setAcademicYearFilter] = useState<string>("2026-2027");
  const [classFilter, setClassFilter] = useState<string>("All");
  const [sectionFilter, setSectionFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");

  // Selection & Modal states
  const [activeLedger, setActiveLedger] = useState<FeeLedgerItem | null>(null);
  const [openDetailModal, setOpenDetailModal] = useState(false);
  const [openRecordModal, setOpenRecordModal] = useState(false);
  const [openEditFeeModal, setOpenEditFeeModal] = useState(false);

  // Edit Fee Form states
  const [editOriginalFee, setEditOriginalFee] = useState<string>("");
  const [editDiscountAmount, setEditDiscountAmount] = useState<string>("");
  const [editRemarks, setEditRemarks] = useState<string>("");

  // Record Payment Form states
  const [feeType, setFeeType] = useState<string>("Tuition Fee");
  const [installmentPlan, setInstallmentPlan] = useState<number>(3);
  const [amountPaid, setAmountPaid] = useState<string>("");
  const [method, setMethod] = useState<"Cash" | "UPI" | "Bank Transfer" | "Cheque">("Cash");
  const [reference, setReference] = useState("");
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [remarks, setRemarks] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  // Load students & fees concurrently in parallel
  const loadData = useCallback(async () => {
    setLoading(true);
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

      // Include any additional fee records that didn't match a student row
      (feData || []).forEach((f) => {
        const key = (f.studentId || f.admissionNo || f.studentName).toLowerCase();
        if (!combined.some((c) => (c.studentId || c.admissionNo || c.studentName).toLowerCase() === key)) {
          combined.push(f);
        }
      });

      setStudents(stData || []);
      setFeeList(combined);
    } catch {
      setStudents([]);
      setFeeList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const { setFormEditing } = useAutoRefresh("fees", loadData);

  // Execute immediate data fetch on initial mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setFormEditing(openRecordModal || openEditFeeModal);
  }, [openRecordModal, openEditFeeModal, setFormEditing]);

  // Summary Metrics
  const summary = useMemo(() => {
    const totalExpected = feeList.reduce((acc, f) => acc + (f.finalFee || f.amount || 0), 0);
    const totalCollected = feeList.reduce((acc, f) => acc + (f.paid || 0), 0);
    const totalDiscounts = feeList.reduce((acc, f) => acc + (f.discountAmount || 0), 0);
    const totalPending = Math.max(0, totalExpected - totalCollected);
    const fullyPaidCount = feeList.filter((f) => f.status === "Paid").length;
    const pendingCount = feeList.filter((f) => f.status !== "Paid").length;
    const totalReceipts = feeList.reduce((acc, f) => acc + (f.payments?.length || (f.paid > 0 ? 1 : 0)), 0);

    return {
      totalExpected,
      totalCollected,
      totalDiscounts,
      totalPending,
      fullyPaidCount,
      pendingCount,
      totalReceipts,
    };
  }, [feeList]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return feeList.filter((f) => {
      const matchSearch =
        !t ||
        f.studentName.toLowerCase().includes(t) ||
        (f.admissionNo && f.admissionNo.toLowerCase().includes(t)) ||
        f.className.toLowerCase().includes(t);
      const matchStatus = statusFilter === "All" || f.status === statusFilter;
      const matchClass = classFilter === "All" || f.className.toLowerCase().includes(classFilter.toLowerCase());
      const matchSection = sectionFilter === "All" || (f.section && f.section.toUpperCase() === sectionFilter.toUpperCase());
      return matchSearch && matchStatus && matchClass && matchSection;
    });
  }, [feeList, q, statusFilter, classFilter, sectionFilter]);

  const openRecordPaymentFor = (f: FeeLedgerItem) => {
    setActiveLedger(f);
    const plan = f.totalInstallments || 3;
    setInstallmentPlan(plan);
    const remaining = Math.max(0, (f.finalFee || f.amount || 0) - (f.paid || 0));
    const instAmt = Math.min(remaining, Math.round((f.finalFee || f.amount || 0) / plan));
    setAmountPaid(String(instAmt > 0 ? instAmt : remaining));
    setReference("");
    setRemarks("");
    setOpenRecordModal(true);
  };

  const openDetailsFor = (f: FeeLedgerItem) => {
    setActiveLedger(f);
    setOpenDetailModal(true);
  };

  const openEditFeeFor = (f: FeeLedgerItem) => {
    setActiveLedger(f);
    setEditOriginalFee(String(f.originalFee || f.amount || 8500));
    setEditDiscountAmount(String(f.discountAmount || 0));
    setEditRemarks("");
    setOpenEditFeeModal(true);
  };

  const handleSaveFeeStructure = () => {
    if (!activeLedger) return;
    const origFee = Number(editOriginalFee || 0);
    const discAmt = Number(editDiscountAmount || 0);

    if (origFee < 0 || discAmt < 0) {
      return toast.error("Fee amounts cannot be negative.");
    }
    if (discAmt > origFee) {
      return toast.error("Discount cannot exceed original total fee.");
    }

    const updated = recalculateFeeLedger({
      ...activeLedger,
      originalFee: origFee,
      discountAmount: discAmt,
    });

    setFeeList((prev) => prev.map((f) => (f.id === activeLedger.id ? updated : f)));
    saveFeeRecord(updated);
    setActiveLedger(updated);
    setOpenEditFeeModal(false);

    toast.success(`Fee structure updated for ${updated.studentName}! Final Fee: ₹${updated.finalFee.toLocaleString()}`);
  };

  const handleRecordPayment = () => {
    if (!activeLedger) return;
    const paidAmt = Number(amountPaid || 0);
    if (paidAmt <= 0) return toast.error("Please enter a valid payment amount.");

    const remainingBal = Math.max(0, (activeLedger.finalFee || activeLedger.amount) - (activeLedger.paid || 0));
    if (paidAmt > remainingBal) {
      return toast.error(`Payment amount (₹${paidAmt.toLocaleString()}) cannot exceed remaining balance (₹${remainingBal.toLocaleString()}).`);
    }

    const nextInstNo = (activeLedger.payments?.length || 0) + 1;
    const rcptNo = `SUN/26-27/${Math.floor(4000 + Math.random() * 6000)}`;

    const newTxn: PaymentTransaction = {
      id: `TXN-${Date.now()}`,
      feeLedgerId: activeLedger.id,
      studentId: activeLedger.studentId,
      receiptNo: rcptNo,
      amount: paidAmt,
      date,
      method,
      reference,
      feeType,
      installmentNo: nextInstNo,
      remarks,
      collectedBy: "Office Staff",
    };

    const updatedLedger = recalculateFeeLedger({
      ...activeLedger,
      totalInstallments: installmentPlan,
      payments: [...(activeLedger.payments || []), newTxn],
    });

    setFeeList((prev) => prev.map((f) => (f.id === activeLedger.id ? updatedLedger : f)));
    saveFeeRecord(updatedLedger);

    const rcpt: Receipt = {
      receiptNo: rcptNo,
      studentName: activeLedger.studentName,
      admissionNo: activeLedger.admissionNo || activeLedger.studentId,
      className: activeLedger.className,
      feeType,
      amountDue: remainingBal,
      amountPaid: paidAmt,
      balance: updatedLedger.remainingAmount,
      method,
      reference,
      date,
      remarks,
      status: updatedLedger.status,
      collectedBy: "Office Staff",
    };

    saveReceipt(rcpt);
    setReceipt(rcpt);
    setOpenRecordModal(false);

    NotificationService.feePayment(`₹${paidAmt.toLocaleString()}`, activeLedger.studentName);
    toast.success(`Payment of ₹${paidAmt.toLocaleString()} recorded for ${activeLedger.studentName}!`);
  };

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-y-auto w-full max-w-none gap-4 p-4 lg:p-6 bg-slate-50/50">
      <div>
        <PageHeader title="Fee Collection & Ledger Management" subtitle="Manage student fee structures, record payments, issue receipts, and track collection analytics." />
      </div>

      {/* Clean Icon-Free Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <FeeSummaryCard label="Total Fee Expected" value={`₹${(summary.totalExpected / 100000).toFixed(2)}L`} accentColor="border-l-purple-500" />
        <FeeSummaryCard label="Total Fee Collected" value={`₹${(summary.totalCollected / 100000).toFixed(2)}L`} accentColor="border-l-emerald-500" />
        <FeeSummaryCard label="Total Discounts" value={`₹${(summary.totalDiscounts / 1000).toFixed(1)}k`} accentColor="border-l-amber-500" />
        <FeeSummaryCard label="Pending Balance" value={`₹${(summary.totalPending / 100000).toFixed(2)}L`} accentColor="border-l-rose-500" />
        <FeeSummaryCard label="Students Fully Paid" value={summary.fullyPaidCount} accentColor="border-l-teal-500" />
        <FeeSummaryCard label="Receipts Generated" value={summary.totalReceipts} accentColor="border-l-sky-500" />
      </div>

      {/* Professional Filter Bar */}
      <div className="p-3.5 rounded-2xl border border-slate-200/80 bg-white shadow-xs flex flex-col lg:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by student name or admission number…"
            className="pl-9 bg-slate-50/50 border-slate-200 text-sm rounded-xl focus:bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Academic Year Filter */}
          <Select value={academicYearFilter} onValueChange={setAcademicYearFilter}>
            <SelectTrigger className="w-[130px] h-9 text-xs bg-white border-slate-200 rounded-xl font-medium">
              <SelectValue placeholder="Session: 2026-27" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2026-2027">2026-2027</SelectItem>
              <SelectItem value="2025-2026">2025-2026</SelectItem>
              <SelectItem value="2024-2025">2024-2025</SelectItem>
            </SelectContent>
          </Select>

          {/* Class Filter */}
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="w-[125px] h-9 text-xs bg-white border-slate-200 rounded-xl font-medium">
              <SelectValue placeholder="Class: All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Classes</SelectItem>
              <SelectItem value="Playgroup">Playgroup</SelectItem>
              <SelectItem value="Nursery">Nursery</SelectItem>
              <SelectItem value="LKG">LKG</SelectItem>
              <SelectItem value="UKG">UKG</SelectItem>
              <SelectItem value="Grade 1">Grade 1</SelectItem>
              <SelectItem value="Grade 2">Grade 2</SelectItem>
            </SelectContent>
          </Select>

          {/* Section Filter */}
          <Select value={sectionFilter} onValueChange={setSectionFilter}>
            <SelectTrigger className="w-[100px] h-9 text-xs bg-white border-slate-200 rounded-xl font-medium">
              <SelectValue placeholder="Sec: All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Sec</SelectItem>
              <SelectItem value="A">Sec A</SelectItem>
              <SelectItem value="B">Sec B</SelectItem>
              <SelectItem value="C">Sec C</SelectItem>
            </SelectContent>
          </Select>

          {/* Payment Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[120px] h-9 text-xs bg-white border-slate-200 rounded-xl font-medium">
              <SelectValue placeholder="Status: All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Statuses</SelectItem>
              <SelectItem value="Paid">Paid</SelectItem>
              <SelectItem value="Partial">Partial</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Student Fee Table (Full Container Width) */}
      <div className="flex-1 min-h-0 rounded-2xl border border-slate-200/80 bg-white shadow-sm flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 overflow-y-auto">
          <table className="w-full text-sm border-collapse min-w-full">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase text-slate-600 sticky top-0 z-10">
              <tr>
                <th className="text-left px-4 py-3.5 font-bold w-[140px]">Admission No</th>
                <th className="text-left px-3 py-3.5 font-bold w-[85px]">Roll No</th>
                <th className="text-left px-4 py-3.5 font-bold w-[220px]">Student Name</th>
                <th className="text-left px-3 py-3.5 font-bold w-[100px]">Class</th>
                <th className="text-left px-3 py-3.5 font-bold w-[80px]">Section</th>
                <th className="text-right px-4 py-3.5 font-bold w-[130px]">Fee Amount</th>
                <th className="text-right px-4 py-3.5 font-bold w-[130px]">Paid Amount</th>
                <th className="text-right px-4 py-3.5 font-bold w-[130px]">Pending Amount</th>
                <th className="text-center px-4 py-3.5 font-bold w-[140px]">Payment Status</th>
                <th className="text-right px-4 py-3.5 font-bold w-[200px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                // Loading Skeleton Rows
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-4 py-4"><div className="h-4 w-20 bg-slate-200 rounded" /></td>
                    <td className="px-3 py-4"><div className="h-4 w-10 bg-slate-200 rounded" /></td>
                    <td className="px-4 py-4"><div className="h-4 w-32 bg-slate-200 rounded" /></td>
                    <td className="px-3 py-4"><div className="h-4 w-16 bg-slate-200 rounded" /></td>
                    <td className="px-3 py-4"><div className="h-4 w-8 bg-slate-200 rounded" /></td>
                    <td className="px-4 py-4"><div className="h-4 w-20 bg-slate-200 rounded ml-auto" /></td>
                    <td className="px-4 py-4"><div className="h-4 w-20 bg-slate-200 rounded ml-auto" /></td>
                    <td className="px-4 py-4"><div className="h-4 w-20 bg-slate-200 rounded ml-auto" /></td>
                    <td className="px-4 py-4"><div className="h-5 w-16 bg-slate-200 rounded-full mx-auto" /></td>
                    <td className="px-4 py-4"><div className="h-8 w-28 bg-slate-200 rounded-xl ml-auto" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-500 font-medium">
                    No matching fee records found.
                  </td>
                </tr>
              ) : (
                filtered.map((f, idx) => {
                  const origFee = f.originalFee || f.amount || 8500;
                  const discAmt = f.discountAmount || 0;
                  const finalFee = f.finalFee || origFee - discAmt;
                  const paid = (f.payments && f.payments.length > 0)
                    ? f.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0)
                    : (f.paid || 0);
                  const remaining = Math.max(0, finalFee - paid);

                  let displayStatus = "Pending";
                  let statusStyle = "bg-rose-50 text-rose-700 border-rose-200";
                  if (remaining === 0 && finalFee > 0) {
                    displayStatus = "Paid";
                    statusStyle = "bg-emerald-50 text-emerald-700 border-emerald-200";
                  } else if (paid > 0) {
                    displayStatus = "Partial";
                    statusStyle = "bg-amber-50 text-amber-700 border-amber-200";
                  }

                  return (
                    <tr key={f.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3.5 font-mono text-xs font-bold text-slate-600">{f.admissionNo || "ADM-1001"}</td>
                      <td className="px-3 py-3.5 text-xs text-slate-500 font-medium">#{f.rollNo || (idx + 1)}</td>
                      <td className="px-4 py-3.5 font-semibold text-slate-900">{f.studentName}</td>
                      <td className="px-3 py-3.5 text-xs font-medium text-slate-700">{f.className}</td>
                      <td className="px-3 py-3.5 text-xs font-medium text-slate-700">{f.section || "A"}</td>
                      <td className="px-4 py-3.5 text-right font-bold text-slate-900">₹{finalFee.toLocaleString()}</td>
                      <td className="px-4 py-3.5 text-right font-semibold text-emerald-600">₹{paid.toLocaleString()}</td>
                      <td className="px-4 py-3.5 text-right font-semibold text-rose-600">₹{remaining.toLocaleString()}</td>
                      <td className="px-4 py-3.5 text-center">
                        <Badge className={cn("text-xs font-semibold px-2.5 py-0.5 border rounded-full shadow-2xs", statusStyle)}>
                          {displayStatus}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button size="sm" variant="ghost" className="h-8 px-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg" onClick={() => openEditFeeFor(f)}>
                            <Edit3 className="h-3.5 w-3.5 mr-1 text-amber-600" /> Edit
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 px-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg" onClick={() => openDetailsFor(f)}>
                            <Eye className="h-3.5 w-3.5 mr-1 text-slate-600" /> View
                          </Button>
                          {remaining > 0 ? (
                            <Button
                              size="sm"
                              onClick={() => openRecordPaymentFor(f)}
                              className="h-8 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs px-3 shadow-xs"
                            >
                              <Plus className="h-3.5 w-3.5 mr-1" /> Collect Fee
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const lastPayment = f.payments && f.payments.length > 0 ? f.payments[f.payments.length - 1] : null;
                                setReceipt({
                                  receiptNo: lastPayment?.receiptNo || `SUN/26-27/${Math.floor(4000 + Math.random() * 6000)}`,
                                  studentName: f.studentName,
                                  admissionNo: f.admissionNo || f.studentId,
                                  className: f.className,
                                  feeType: lastPayment?.feeType || "Tuition Fee",
                                  amountDue: 0,
                                  amountPaid: paid,
                                  balance: 0,
                                  method: lastPayment?.method || "Cash",
                                  reference: lastPayment?.reference || "",
                                  date: lastPayment?.date || new Date().toISOString().slice(0, 10),
                                  remarks: lastPayment?.remarks || "Fully Paid",
                                  status: "Paid",
                                  collectedBy: lastPayment?.collectedBy || "Office Staff",
                                });
                              }}
                              className="h-8 text-xs font-medium px-3 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                            >
                              <Printer className="h-3.5 w-3.5 mr-1" /> Print Receipt
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* VIEW DETAILS MODAL */}
      <Dialog open={openDetailModal} onOpenChange={setOpenDetailModal}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Student Fee Ledger & Payment History</DialogTitle>
          </DialogHeader>

          {activeLedger && (() => {
            const finalFee = activeLedger.finalFee || (activeLedger.originalFee || 8500) - (activeLedger.discountAmount || 0);
            const paymentsList = activeLedger.payments || [];
            const paid = paymentsList.reduce((acc, p) => acc + Number(p.amount || 0), activeLedger.paid && paymentsList.length === 0 ? activeLedger.paid : 0);
            const remaining = Math.max(0, finalFee - paid);
            const instCount = paymentsList.length || (paid > 0 ? 1 : 0);

            let displayStatus = "Unpaid";
            let statusStyle = "bg-rose-100 text-rose-700";
            if (remaining === 0 && finalFee > 0) {
              displayStatus = "Paid";
              statusStyle = "bg-emerald-100 text-emerald-700";
            } else if (paid > 0) {
              displayStatus = "Partially Paid";
              statusStyle = "bg-amber-100 text-amber-700";
            }

            // Sorted newest payment first
            const sortedPayments = [...paymentsList].reverse();

            return (
              <div className="space-y-4 text-sm mt-2">
                {/* Cover Info Header */}
                <div className="rounded-2xl bg-gradient-to-r from-orange-50 to-amber-50 p-4 border border-orange-200/60 flex items-center justify-between">
                  <div>
                    <div className="text-base font-bold text-slate-900">{activeLedger.studentName}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Admission No: <span className="font-mono font-semibold text-slate-800">{activeLedger.admissionNo || "ADM-1001"}</span> · Class: <span className="font-medium text-slate-800">{activeLedger.className}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">Academic Year: {activeLedger.academicYear || activeYear}</div>
                  </div>
                  <div className="text-right">
                    <Badge className={cn("px-3 py-1 text-xs font-bold", statusStyle)}>
                      {displayStatus}
                    </Badge>
                  </div>
                </div>

                {/* Calculated Summary Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <MetricTile label="Total Fee" value={`₹${finalFee.toLocaleString()}`} color="text-slate-900 font-bold" />
                  <MetricTile label="Total Paid" value={`₹${paid.toLocaleString()}`} color="text-emerald-700 font-bold" />
                  <MetricTile label="Remaining Balance" value={`₹${remaining.toLocaleString()}`} color="text-rose-600 font-bold" />
                  <MetricTile label="Installments Used" value={`${instCount}`} color="text-indigo-700 font-bold" />
                </div>

                {/* Complete Payment History Table */}
                <SectionCard title="Complete Payment History">
                  {sortedPayments.length > 0 ? (
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-100 text-slate-700 font-semibold uppercase text-[11px]">
                          <tr>
                            <th className="px-3 py-2">Inst. No</th>
                            <th className="px-3 py-2">Date</th>
                            <th className="px-3 py-2">Amount</th>
                            <th className="px-3 py-2">Payment Method</th>
                            <th className="px-3 py-2">Receipt No.</th>
                            <th className="px-3 py-2">Collected By</th>
                            <th className="px-3 py-2">Notes</th>
                            <th className="px-3 py-2 text-right">Receipt</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {sortedPayments.map((p, idx) => {
                            const instNo = p.installmentNo || (sortedPayments.length - idx);
                            return (
                              <tr key={p.id || idx} className="hover:bg-slate-50 transition">
                                <td className="px-3 py-2 font-bold text-slate-900">#{instNo}</td>
                                <td className="px-3 py-2 text-slate-700">{p.date}</td>
                                <td className="px-3 py-2 font-bold text-emerald-700">₹{Number(p.amount || 0).toLocaleString()}</td>
                                <td className="px-3 py-2">
                                  <Badge variant="outline" className="text-[10px] font-medium bg-white">
                                    {p.method}
                                  </Badge>
                                </td>
                                <td className="px-3 py-2 font-mono text-slate-800">{p.receiptNo}</td>
                                <td className="px-3 py-2 text-slate-700">{p.collectedBy || "Office Staff"}</td>
                                <td className="px-3 py-2 text-slate-500 italic max-w-[120px] truncate">{p.remarks || "—"}</td>
                                <td className="px-3 py-2 text-right">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 text-[11px] px-2 text-sky-600 hover:text-sky-700"
                                    onClick={() => {
                                      setReceipt({
                                        receiptNo: p.receiptNo,
                                        studentName: activeLedger.studentName,
                                        admissionNo: activeLedger.admissionNo || activeLedger.studentId,
                                        className: activeLedger.className,
                                        feeType: p.feeType || "Tuition Fee",
                                        amountDue: 0,
                                        amountPaid: p.amount,
                                        balance: remaining,
                                        method: p.method,
                                        reference: p.reference || "",
                                        date: p.date,
                                        remarks: p.remarks || "",
                                        status: displayStatus,
                                        collectedBy: p.collectedBy || "Office Staff",
                                      });
                                    }}
                                  >
                                    <Printer className="h-3 w-3 mr-1" /> Print
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-muted-foreground text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      No payment transactions recorded yet for this student.
                    </div>
                  )}
                </SectionCard>
              </div>
            );
          })()}

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setOpenDetailModal(false)}>Close</Button>
            {activeLedger && (
              <Button
                onClick={() => {
                  setOpenDetailModal(false);
                  openRecordPaymentFor(activeLedger);
                }}
                className="bg-gradient-to-r from-orange-500 to-amber-500 text-white"
              >
                <Plus className="h-4 w-4 mr-1.5" /> Collect Fee
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT FEE STRUCTURE MODAL */}
      <Dialog open={openEditFeeModal} onOpenChange={setOpenEditFeeModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Student Fee Structure & Discount</DialogTitle>
          </DialogHeader>

          {activeLedger && (
            <div className="space-y-4 text-xs">
              <div className="rounded-xl bg-amber-50 p-3 border border-amber-200">
                <div className="font-bold text-slate-900">{activeLedger.studentName}</div>
                <div className="text-muted-foreground">Class: {activeLedger.className} · Adm No: {activeLedger.admissionNo || "ADM-1001"}</div>
              </div>

              <div>
                <Label className="text-xs font-semibold">Original Total Fee (₹)</Label>
                <Input
                  type="number"
                  value={editOriginalFee}
                  onChange={(e) => setEditOriginalFee(e.target.value)}
                  placeholder="8500"
                  className="mt-1 font-semibold text-slate-800"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Discount / Fee Reduction Amount (₹)</Label>
                <Input
                  type="number"
                  value={editDiscountAmount}
                  onChange={(e) => setEditDiscountAmount(e.target.value)}
                  placeholder="0"
                  className="mt-1 font-semibold text-amber-700"
                />
                <p className="text-[11px] text-muted-foreground mt-1">Scholarship, sibling concession, management discount, etc.</p>
              </div>

              {/* Recalculated Preview */}
              <div className="rounded-xl bg-slate-100 p-3 space-y-1">
                <div className="flex justify-between font-semibold">
                  <span>Recalculated Final Fee:</span>
                  <span className="text-slate-900 font-bold">₹{Math.max(0, Number(editOriginalFee || 0) - Number(editDiscountAmount || 0)).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Already Paid:</span>
                  <span className="text-emerald-700 font-semibold">₹{(activeLedger.paid || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>New Remaining Balance:</span>
                  <span className="text-rose-600 font-semibold">₹{Math.max(0, (Number(editOriginalFee || 0) - Number(editDiscountAmount || 0)) - (activeLedger.paid || 0)).toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setOpenEditFeeModal(false)}>Cancel</Button>
            <Button onClick={handleSaveFeeStructure} className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
              Save Fee Structure & Recalculate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* RECORD PAYMENT MODAL */}
      <Dialog open={openRecordModal} onOpenChange={setOpenRecordModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Installment Payment</DialogTitle>
          </DialogHeader>

          {activeLedger && (
            <div className="space-y-3 text-xs">
              <div className="rounded-xl bg-orange-50 p-3 border border-orange-200">
                <div className="font-semibold text-slate-900">{activeLedger.studentName}</div>
                <div className="text-muted-foreground mt-0.5">Class: {activeLedger.className} · Adm No: {activeLedger.admissionNo || "ADM-1001"}</div>
                <div className="text-rose-700 font-medium mt-1">Pending Balance: ₹{Math.max(0, (activeLedger.finalFee || activeLedger.amount) - (activeLedger.paid || 0)).toLocaleString()}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Installment Plan</Label>
                  <Select value={String(installmentPlan)} onValueChange={(v) => setInstallmentPlan(Number(v))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{INSTALLMENT_OPTIONS.map((opt) => <SelectItem key={opt} value={String(opt)}>{opt} Installments</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Fee Type</Label>
                  <Select value={feeType} onValueChange={setFeeType}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{FEE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Amount Paying Now (₹)</Label>
                  <Input type="number" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} className="mt-1 font-semibold text-emerald-700" />
                </div>
                <div>
                  <Label className="text-xs">Payment Date</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Payment Method</Label>
                  <Select value={method} onValueChange={(v: any) => setMethod(v)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Ref / Txn No. (optional)</Label>
                  <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="UPI ID / Cheque" className="mt-1" />
                </div>
              </div>

              <div>
                <Label className="text-xs">Remarks / Notes</Label>
                <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="e.g. Installment 2 paid" rows={2} className="mt-1" />
              </div>
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setOpenRecordModal(false)}>Cancel</Button>
            <Button onClick={handleRecordPayment} className="bg-gradient-to-r from-orange-500 to-amber-500 text-white">
              <ReceiptIcon className="h-4 w-4 mr-1.5" /> Save & Generate Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PRINT RECEIPT MODAL */}
      <Dialog open={!!receipt} onOpenChange={(o) => !o && setReceipt(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Fee Payment Receipt Generated</DialogTitle></DialogHeader>
          {receipt && (
            <div id="print-receipt" className="text-xs space-y-2 rounded-2xl border border-slate-200 p-4 bg-white shadow-inner">
              <div className="text-center border-b pb-3">
                <div className="font-bold text-base text-orange-600">Sunshine Play School</div>
                <div className="text-xs text-muted-foreground">Official Fee Payment Receipt</div>
              </div>
              <Row k="Receipt Number" v={receipt.receiptNo} />
              <Row k="Student Name" v={receipt.studentName} />
              <Row k="Admission Number" v={receipt.admissionNo} />
              <Row k="Class" v={receipt.className} />
              <Row k="Fee Type" v={receipt.feeType} />
              <Row k="Amount Paid" v={`₹${receipt.amountPaid.toLocaleString()}`} />
              <Row k="Remaining Balance" v={`₹${receipt.balance.toLocaleString()}`} />
              <Row k="Payment Method" v={receipt.method} />
              {receipt.reference && <Row k="Reference" v={receipt.reference} />}
              <Row k="Payment Date" v={receipt.date} />
              <Row k="Status" v={receipt.status} />
              <Row k="Collected By" v={receipt.collectedBy} />
            </div>
          )}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setReceipt(null)}>Close</Button>
            <Button onClick={() => window.print()} className="bg-gradient-to-r from-orange-500 to-amber-500 text-white">
              <Printer className="h-4 w-4 mr-2" /> Print Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MetricTile({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-xl border bg-card p-2.5">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className={cn("text-sm font-semibold mt-0.5", color)}>{value}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 py-0.5 border-b border-slate-100 last:border-0 text-xs">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium text-right text-slate-800">{v}</span>
    </div>
  );
}
