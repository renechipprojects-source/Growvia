import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, StatCard, SectionCard } from "@/components/ui-blocks";
import { FEES as SEED_FEES, STUDENTS as SEED_STUDENTS } from "@/lib/mockData";
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
import { useEffect, useMemo, useState } from "react";
import {
  Receipt as ReceiptIcon, Printer, Search, Plus, CheckCircle, Clock,
  DollarSign, Wallet, FileText, Eye, Edit3, Tag, Sparkles
} from "lucide-react";
import { NotificationService } from "@/lib/notifications";

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

function FeeCollection() {
  const [feeList, setFeeList] = useState<FeeLedgerItem[]>([]);
  const [students, setStudents] = useState<any[]>(SEED_STUDENTS);
  const [q, setQ] = useState("");
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

  // Load students & fees on mount
  useEffect(() => {
    async function loadData() {
      const { data: stData } = await fetchStudents();
      const currentStudents = stData && stData.length > 0 ? stData : SEED_STUDENTS;
      setStudents(currentStudents);

      const { data: feData } = await fetchFees();
      if (feData && feData.length > 0) {
        setFeeList(feData);
      } else {
        const dynamicFees: FeeLedgerItem[] = currentStudents.map((s, idx) => {
          const totalFee = s.className === "Playgroup" ? 8500 : s.className === "Nursery" ? 9500 : 10500;
          const paidAmt = s.feeStatus === "Paid" ? totalFee : s.feeStatus === "Partial" ? Math.round(totalFee / 2) : 0;
          return recalculateFeeLedger({
            id: `F-STU-${s.id}`,
            studentId: s.id,
            studentName: s.name,
            admissionNo: s.admissionNo || `ADM-${1000 + idx}`,
            className: `${s.className} ${s.section || "A"}`,
            academicYear: "2026-2027",
            originalFee: totalFee,
            discountAmount: 0,
            finalFee: totalFee,
            amount: totalFee,
            paid: paidAmt,
            remainingAmount: Math.max(0, totalFee - paidAmt),
            dueDate: "2026-07-15",
            status: paidAmt === totalFee ? "Paid" : paidAmt > 0 ? "Partial" : "Pending",
            month: "Academic Year 2026-2027",
            totalInstallments: 3,
            paidInstallments: paidAmt === totalFee ? 3 : paidAmt > 0 ? 1 : 0,
            payments: paidAmt > 0 ? [
              {
                id: `TXN-INIT-${s.id}`,
                studentId: s.id,
                receiptNo: `SUN/26-27/${2000 + idx}`,
                amount: paidAmt,
                date: "2026-06-10",
                method: "Cash",
                feeType: "Tuition Fee",
                installmentNo: 1,
                collectedBy: "Office Staff",
              }
            ] : [],
          });
        });
        setFeeList(dynamicFees);
      }
    }
    loadData();
  }, []);

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
      return matchSearch && matchStatus;
    });
  }, [feeList, q, statusFilter]);

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
    <div className="flex flex-1 min-h-0 flex-col overflow-y-auto w-full max-w-none gap-3 pr-1">
      <div>
        <PageHeader title="Student Fee Ledger Module" subtitle="Single-row student ledgers, editable fee structures, discounts, installment histories, and receipts." />
      </div>

      <div className="sticky top-0 z-20 space-y-3 bg-background/95 backdrop-blur-md pt-2 pb-2">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="Total Fee Expected" value={`₹${(summary.totalExpected / 100000).toFixed(2)}L`} icon={DollarSign} gradient="from-purple-500 to-indigo-500" />
          <StatCard label="Total Fee Collected" value={`₹${(summary.totalCollected / 100000).toFixed(2)}L`} icon={Wallet} gradient="from-emerald-500 to-teal-500" />
          <StatCard label="Total Discounts" value={`₹${(summary.totalDiscounts / 1000).toFixed(1)}k`} icon={Tag} gradient="from-amber-500 to-orange-500" />
          <StatCard label="Pending Balance" value={`₹${(summary.totalPending / 100000).toFixed(2)}L`} icon={Clock} gradient="from-rose-500 to-orange-500" />
          <StatCard label="Students Fully Paid" value={summary.fullyPaidCount} icon={CheckCircle} gradient="from-teal-500 to-emerald-500" />
          <StatCard label="Receipts Generated" value={summary.totalReceipts} icon={FileText} gradient="from-sky-500 to-blue-500" />
        </div>

        {/* Filter bar */}
        <div className="p-3 rounded-2xl border border-white/60 bg-white/70 backdrop-blur-xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by student name, admission no. or class…"
              className="pl-9 bg-white/80"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
            {["All", "Paid", "Partial", "Pending"].map((st) => (
              <Button
                key={st}
                size="sm"
                variant={statusFilter === st ? "default" : "outline"}
                onClick={() => setStatusFilter(st)}
                className="rounded-full text-xs"
              >
                {st}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Student Fee Ledger Table Section */}
      <div className="flex-1 min-h-0 rounded-3xl border border-white/60 bg-white/70 backdrop-blur-xl shadow-lg shadow-black/5 flex flex-col overflow-hidden">

        {/* Summary Table */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <table className="w-full text-sm min-w-[1000px]">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground sticky top-0 z-10 backdrop-blur">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Student Name</th>
                <th className="text-left px-4 py-3 font-medium">Admission No</th>
                <th className="text-left px-4 py-3 font-medium">Class</th>
                <th className="text-left px-4 py-3 font-medium">Total Fee</th>
                <th className="text-left px-4 py-3 font-medium">Total Paid</th>
                <th className="text-left px-4 py-3 font-medium">Remaining Balance</th>
                <th className="text-center px-4 py-3 font-medium">Installments Used</th>
                <th className="text-left px-4 py-3 font-medium">Payment Status</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-muted/30">
              {filtered.map((f) => {
                const origFee = f.originalFee || f.amount || 8500;
                const discAmt = f.discountAmount || 0;
                const finalFee = f.finalFee || origFee - discAmt;
                const paid = (f.payments && f.payments.length > 0)
                  ? f.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0)
                  : (f.paid || 0);
                const remaining = Math.max(0, finalFee - paid);
                const installmentsUsed = f.payments?.length || (paid > 0 ? 1 : 0);

                let displayStatus = "Unpaid";
                let statusStyle = "bg-rose-100 text-rose-700 border-rose-200";
                if (remaining === 0 && finalFee > 0) {
                  displayStatus = "Paid";
                  statusStyle = "bg-emerald-100 text-emerald-700 border-emerald-200";
                } else if (paid > 0) {
                  displayStatus = "Partially Paid";
                  statusStyle = "bg-amber-100 text-amber-700 border-amber-200";
                }

                return (
                  <tr key={f.id} className="hover:bg-white/60 transition">
                    <td className="px-4 py-3 font-semibold text-slate-800">{f.studentName}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{f.admissionNo || "ADM-1001"}</td>
                    <td className="px-4 py-3">{f.className}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">₹{finalFee.toLocaleString()}</td>
                    <td className="px-4 py-3 font-semibold text-emerald-700">₹{paid.toLocaleString()}</td>
                    <td className="px-4 py-3 font-semibold text-rose-600">₹{remaining.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant="outline" className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-50">
                        {installmentsUsed} {installmentsUsed === 1 ? "Txn" : "Txns"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={cn("text-xs font-semibold border", statusStyle)}>
                        {displayStatus}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={() => openEditFeeFor(f)}>
                          <Edit3 className="h-3.5 w-3.5 mr-1 text-amber-600" /> Edit
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={() => openDetailsFor(f)}>
                          <Eye className="h-3.5 w-3.5 mr-1 text-slate-600" /> View Details
                        </Button>
                        {remaining > 0 ? (
                          <Button
                            size="sm"
                            onClick={() => openRecordPaymentFor(f)}
                            className="h-8 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-full text-xs font-medium px-3"
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
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground text-sm">
                    No student fee ledger records found matching query.
                  </td>
                </tr>
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
                    <div className="text-xs text-muted-foreground">Academic Year: {activeLedger.academicYear || "2026-2027"}</div>
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
