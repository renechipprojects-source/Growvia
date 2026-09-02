import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, StatCard, SectionCard } from "@/components/ui-blocks";
import { fetchStudents, fetchFees, fetchMergedFeeLedgers, saveFeeRecord, saveReceipt, recalculateFeeLedger, toCanonicalAdmissionNo, type FeeLedgerItem, type PaymentTransaction } from "@/lib/supabaseService";
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
  DollarSign, Wallet, FileText, Eye, Edit3, Tag, Sparkles, Bus, GraduationCap
} from "lucide-react";
import { NotificationService } from "@/lib/notifications";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useAutoRefresh } from "@/lib/autoRefreshContext";
import { useAcademicYear } from "@/lib/academicYearContext";
import { getStoredAllocations, getStoredRoutes } from "@/modules/transport/transportStore";

import { PaymentDetailsModal } from "@/components/fees/PaymentDetailsModal";

export const Route = createFileRoute("/office/fees")({ component: FeeCollection });

const PAYMENT_METHODS = ["Cash", "UPI", "Bank Transfer", "Cheque"] as const;
const FEE_TYPES = ["Tuition Fee", "Admission Fee", "Transport Fee", "Activity Fee", "Exam Fee"] as const;
const INSTALLMENT_OPTIONS = [1, 2, 3, 4] as const;

type Receipt = {
  id?: string;
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

  // Load merged live fee ledgers
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await fetchMergedFeeLedgers();
      setFeeList(data || []);
    } catch {
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

  const sectionOptions = useMemo(() => {
    const set = new Set<string>();
    feeList.forEach((f) => {
      if (f.section && typeof f.section === "string" && f.section.trim()) {
        set.add(f.section.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
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
      const matchSection = sectionFilter === "All" || (f.section && f.section.trim().toLowerCase() === sectionFilter.trim().toLowerCase());
      return matchSearch && matchStatus && matchClass && matchSection;
    });
  }, [feeList, q, statusFilter, classFilter, sectionFilter]);

  const handleFeeTypeChange = (selectedType: string) => {
    setFeeType(selectedType);
    if (!activeLedger) return;

    if (selectedType === "Transport Fee" || selectedType === "Bus Fee") {
      const allocations = getStoredAllocations();
      const studentAlloc = allocations.find(
        (a) =>
          a.studentId === activeLedger.studentId ||
          a.studentName?.toLowerCase() === activeLedger.studentName?.toLowerCase()
      );
      if (studentAlloc && studentAlloc.monthlyFee) {
        setAmountPaid(String(Number(studentAlloc.monthlyFee)));
      } else {
        setAmountPaid("1500");
      }
    } else if (selectedType === "Tuition Fee") {
      const remaining = Math.max(0, (activeLedger.finalFee || activeLedger.amount || 0) - (activeLedger.paid || 0));
      setAmountPaid(String(remaining || activeLedger.finalFee || 12000));
    }
  };

  const openRecordPaymentFor = (f: FeeLedgerItem) => {
    setActiveLedger(f);
    setFeeType("Tuition Fee");
    const remaining = Math.max(0, (f.finalFee || f.amount || 0) - (f.paid || 0));
    setAmountPaid(String(remaining));
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

  const handleSaveFeeStructure = async () => {
    if (!activeLedger) return;
    const origFee = Number(editOriginalFee || 0);
    const discAmt = Number(editDiscountAmount || 0);

    if (isNaN(origFee) || origFee < 0 || isNaN(discAmt) || discAmt < 0) {
      return toast.error("Fee amounts cannot be negative.");
    }
    if (discAmt > origFee) {
      return toast.error("Discount cannot exceed original total fee.");
    }

    const res = await saveFeeRecord({
      ...activeLedger,
      originalFee: origFee,
      discountAmount: discAmt,
    });

    if (!res.success) {
      return toast.error(res.error || "Failed to persist fee update.");
    }

    const updated = res.data!;
    setFeeList((prev) => prev.map((f) => (f.id === activeLedger.id ? updated : f)));
    setActiveLedger(updated);
    setOpenEditFeeModal(false);

    toast.success(`Fee structure updated for ${updated.studentName}! Final Fee: ₹${updated.finalFee.toLocaleString()}`);
  };

  const [submittingPayment, setSubmittingPayment] = useState(false);

  const handleRecordPayment = async () => {
    if (!activeLedger || submittingPayment) return;
    const paidAmt = Number(amountPaid || 0);
    if (paidAmt <= 0) return toast.error("Please enter a valid payment amount.");

    const remainingBal = Math.max(0, (activeLedger.finalFee || activeLedger.amount) - (activeLedger.paid || 0));
    if (paidAmt > remainingBal && remainingBal > 0) {
      return toast.error(`Payment amount (₹${paidAmt.toLocaleString()}) cannot exceed remaining balance (₹${remainingBal.toLocaleString()}).`);
    }

    setSubmittingPayment(true);

    const nextInstNo = (activeLedger.payments?.length || 0) + 1;
    const rcptNo = `SUN/26-27/${Math.floor(4000 + Math.random() * 6000)}`;

    const newTxn: PaymentTransaction = {
      id: `TXN-${Date.now()}`,
      feeLedgerId: activeLedger.id,
      studentId: activeLedger.studentId || activeLedger.admissionNo || activeLedger.id,
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
      payments: [...(activeLedger.payments || []), newTxn],
    });

    const rcpt: Receipt & { studentId?: string } = {
      id: newTxn.id,
      receiptNo: rcptNo,
      studentName: activeLedger.studentName,
      admissionNo: activeLedger.admissionNo || activeLedger.studentId,
      studentId: activeLedger.studentId,
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

    // Authoritative database persistence before declaring success
    const saveRes = await saveReceipt(rcpt);
    await saveFeeRecord(updatedLedger);

    setSubmittingPayment(false);

    if (saveRes.error) {
      return toast.error(`Failed to record payment in database: ${saveRes.error}`);
    }

    setFeeList((prev) => prev.map((f) => (f.id === activeLedger.id ? updatedLedger : f)));
    setReceipt(rcpt);
    setOpenRecordModal(false);

    NotificationService.feePayment(`₹${paidAmt.toLocaleString()}`, activeLedger.studentName);
    toast.success(`Payment of ₹${paidAmt.toLocaleString()} recorded for ${activeLedger.studentName}!`);
  };

  return (
    <div className="space-y-4 w-full max-w-none">
      <div>
        <PageHeader title="Fee Collection & Ledger Management" subtitle="Manage student fee structures, record payments, issue receipts, and track collection analytics." />
      </div>

      {/* Clean Icon-Free Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 shrink-0">
        <FeeSummaryCard label="Total Fee Expected" value={`₹${(summary.totalExpected / 100000).toFixed(2)}L`} accentColor="border-l-purple-500" />
        <FeeSummaryCard label="Total Fee Collected" value={`₹${(summary.totalCollected / 100000).toFixed(2)}L`} accentColor="border-l-emerald-500" />
        <FeeSummaryCard label="Total Discounts" value={`₹${(summary.totalDiscounts / 1000).toFixed(1)}k`} accentColor="border-l-amber-500" />
        <FeeSummaryCard label="Pending Balance" value={`₹${(summary.totalPending / 100000).toFixed(2)}L`} accentColor="border-l-rose-500" />
        <FeeSummaryCard label="Students Fully Paid" value={summary.fullyPaidCount} accentColor="border-l-teal-500" />
        <FeeSummaryCard label="Receipts Generated" value={summary.totalReceipts} accentColor="border-l-sky-500" />
      </div>

      {/* Professional Filter Bar */}
      <div className="p-3.5 rounded-2xl border border-slate-200/80 bg-white shadow-xs flex flex-col lg:flex-row items-center justify-between gap-3 shrink-0">
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
            <SelectTrigger className="w-[110px] h-9 text-xs bg-white border-slate-200 rounded-xl font-medium">
              <SelectValue placeholder="Sec: All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Sec</SelectItem>
              {sectionOptions.map((s) => (
                <SelectItem key={s} value={s}>
                  Sec {s}
                </SelectItem>
              ))}
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

      {/* Main Student Fee Table */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-full table-auto">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase text-slate-600 sticky top-0 z-10">
              <tr>
                <th className="text-left px-4 py-3.5 font-bold w-[11%]">Admission No</th>
                <th className="text-left px-3 py-3.5 font-bold w-[5%]">Roll</th>
                <th className="text-left px-4 py-3.5 font-bold w-[18%]">Student Name</th>
                <th className="text-left px-3 py-3.5 font-bold w-[7%]">Class</th>
                <th className="text-left px-3 py-3.5 font-bold w-[5%]">Sec</th>
                <th className="text-right px-4 py-3.5 font-bold w-[10%]">Fee Amount</th>
                <th className="text-right px-4 py-3.5 font-bold w-[10%]">Paid Amount</th>
                <th className="text-right px-4 py-3.5 font-bold w-[10%]">Pending Amount</th>
                <th className="text-center px-3 py-3.5 font-bold w-[10%]">Installments</th>
                <th className="text-center px-4 py-3.5 font-bold w-[9%]">Status</th>
                <th className="text-right px-4 py-3.5 font-bold w-[15%]">Actions</th>
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
                    <td className="px-3 py-4"><div className="h-4 w-16 bg-slate-200 rounded mx-auto" /></td>
                    <td className="px-4 py-4"><div className="h-5 w-16 bg-slate-200 rounded-full mx-auto" /></td>
                    <td className="px-4 py-4"><div className="h-8 w-28 bg-slate-200 rounded-xl ml-auto" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-12 text-slate-500 font-medium">
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
                  const instCount = f.payments && f.payments.length > 0 ? f.payments.length : paid > 0 ? 1 : 0;

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
                      <td className="px-4 py-3.5 font-mono text-xs font-bold text-slate-600">{toCanonicalAdmissionNo(f.admissionNo, f.id)}</td>
                      <td className="px-3 py-3.5 text-xs text-slate-500 font-medium">#{f.rollNo || (idx + 1)}</td>
                      <td className="px-4 py-3.5 font-semibold text-slate-900">{f.studentName}</td>
                      <td className="px-3 py-3.5 text-xs font-medium text-slate-700">{f.className}</td>
                      <td className="px-3 py-3.5 text-xs font-medium text-slate-700">{f.section || "A"}</td>
                      <td className="px-4 py-3.5 text-right font-bold text-slate-900">₹{finalFee.toLocaleString()}</td>
                      <td className="px-4 py-3.5 text-right font-semibold text-emerald-600">₹{paid.toLocaleString()}</td>
                      <td className="px-4 py-3.5 text-right font-semibold text-rose-600">₹{remaining.toLocaleString()}</td>
                      <td className="px-3 py-3.5 text-center">
                        <Badge variant="outline" className="text-xs font-semibold bg-indigo-50/60 text-indigo-700 border-indigo-200">
                          {instCount > 0 ? `${instCount} Installment${instCount > 1 ? "s" : ""}` : "0 Paid"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <Badge className={cn("text-xs font-semibold px-2.5 py-0.5 border rounded-full shadow-2xs", statusStyle)}>
                          {displayStatus}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button size="sm" variant="ghost" className="h-8 px-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg" onClick={() => openDetailsFor(f)}>
                            <Eye className="h-3.5 w-3.5 mr-1 text-slate-600" /> View Details
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
      <PaymentDetailsModal
        open={openDetailModal}
        onClose={() => setOpenDetailModal(false)}
        ledger={activeLedger}
        onCollectPayment={(l) => openRecordPaymentFor(l)}
      />

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
                <div className="text-muted-foreground">Class: {activeLedger.className} · Adm No: {toCanonicalAdmissionNo(activeLedger.admissionNo, activeLedger.id)}</div>
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
            <DialogTitle>Collect & Record Fee Payment</DialogTitle>
          </DialogHeader>

          {activeLedger && (
            <div className="space-y-3 text-xs">
              <div className="rounded-xl bg-orange-50 p-3 border border-orange-200">
                <div className="font-semibold text-slate-900">{activeLedger.studentName}</div>
                <div className="text-muted-foreground mt-0.5">Class: {activeLedger.className} · Adm No: {toCanonicalAdmissionNo(activeLedger.admissionNo, activeLedger.id)}</div>
                <div className="text-rose-700 font-medium mt-1">Pending Balance: ₹{Math.max(0, (activeLedger.finalFee || activeLedger.amount) - (activeLedger.paid || 0)).toLocaleString()}</div>
              </div>

              <div>
                <Label className="text-xs font-semibold">Fee Type / Category</Label>
                <Select value={feeType} onValueChange={handleFeeTypeChange}>
                  <SelectTrigger className="mt-1 bg-white font-medium"><SelectValue /></SelectTrigger>
                  <SelectContent>{FEE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              {/* LIVE FEE COMPONENT CARD */}
              {(feeType === "Transport Fee" || feeType === "Bus Fee") && (
                <div className="rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50/90 to-blue-50/90 p-3 space-y-1.5 shadow-2xs">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-indigo-900 flex items-center gap-1.5">
                      <Bus className="w-4 h-4 text-indigo-600" /> Bus Transport Fee (Live)
                    </span>
                    <Badge className="bg-indigo-100 text-indigo-700 text-[10px] font-bold">Distance Based</Badge>
                  </div>
                  {(() => {
                    const studentAlloc = getStoredAllocations().find(
                      (a) =>
                        a.studentId === activeLedger.studentId ||
                        a.studentName?.toLowerCase() === activeLedger.studentName?.toLowerCase()
                    );
                    if (studentAlloc) {
                      return (
                        <div className="text-[11px] text-slate-700 space-y-0.5 pt-1">
                          <div><span className="font-semibold text-slate-900">Assigned Route:</span> {studentAlloc.routeName}</div>
                          <div><span className="font-semibold text-slate-900">Pickup Stop:</span> {studentAlloc.pickupStop}</div>
                          <div><span className="font-semibold text-slate-900">Configured Distance Fee:</span> <span className="font-bold text-indigo-700">₹{Number(studentAlloc.monthlyFee || 1500).toLocaleString()} / month</span></div>
                        </div>
                      );
                    }
                    return (
                      <div className="text-[11px] text-slate-600 pt-1 italic">
                        No custom route assigned on Transport Page. Using standard distance fee (₹1,500).
                      </div>
                    );
                  })()}
                </div>
              )}

              {feeType === "Tuition Fee" && (
                <div className="rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50/90 to-teal-50/90 p-3 space-y-1.5 shadow-2xs">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4 text-emerald-600" /> Academic Tuition Fee
                    </span>
                    <Badge className="bg-emerald-100 text-emerald-700 text-[10px] font-bold">Core Academic</Badge>
                  </div>
                  <div className="text-[11px] text-slate-700 space-y-0.5 pt-1">
                    <div><span className="font-semibold text-slate-900">Class & Section:</span> {activeLedger.className} - {activeLedger.section || "A"}</div>
                    <div><span className="font-semibold text-slate-900">Total Tuition Fee:</span> <span className="font-bold text-emerald-700">₹{(activeLedger.finalFee || activeLedger.amount || 12000).toLocaleString()}</span></div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Amount Paying Now (₹)</Label>
                  <Input type="number" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} className="mt-1 font-semibold text-emerald-700 bg-white" />
                </div>
                <div>
                  <Label className="text-xs">Payment Date</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 bg-white" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Payment Method</Label>
                  <Select value={method} onValueChange={(v: any) => setMethod(v)}>
                    <SelectTrigger className="mt-1 bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>{PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Ref / Txn No. (optional)</Label>
                  <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="UPI ID / Cheque" className="mt-1 bg-white" />
                </div>
              </div>

              <div>
                <Label className="text-xs">Remarks / Notes</Label>
                <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="e.g. Fee payment" rows={2} className="mt-1 bg-white" />
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
