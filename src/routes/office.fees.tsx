import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, StatCard, SectionCard } from "@/components/ui-blocks";
import { FEES as SEED_FEES, STUDENTS as SEED_STUDENTS } from "@/lib/mockData";
import { fetchStudents, fetchFees, saveFeeRecord, saveReceipt, type FeeLedgerItem, type PaymentTransaction } from "@/lib/supabaseService";
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
  DollarSign, Wallet, FileText, Eye, CreditCard, ChevronRight, UserCheck, ShieldCheck
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

  // Selection states
  const [activeLedger, setActiveLedger] = useState<FeeLedgerItem | null>(null);
  const [openDetailModal, setOpenDetailModal] = useState(false);
  const [openRecordModal, setOpenRecordModal] = useState(false);

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
          const status = paidAmt === totalFee ? "Paid" : paidAmt > 0 ? "Partial" : "Pending";
          const paidInst = status === "Paid" ? 3 : status === "Partial" ? 1 : 0;
          return {
            id: `F-STU-${s.id}`,
            studentId: s.id,
            studentName: s.name,
            admissionNo: s.admissionNo || `ADM-${1000 + idx}`,
            className: `${s.className} ${s.section || "A"}`,
            academicYear: "2026-2027",
            amount: totalFee,
            paid: paidAmt,
            dueDate: "2026-07-15",
            status,
            month: "Academic Year 2026-2027",
            totalInstallments: 3,
            paidInstallments: paidInst,
            payments: paidAmt > 0 ? [
              {
                id: `TXN-INIT-${s.id}`,
                receiptNo: `SUN/26-27/${2000 + idx}`,
                amount: paidAmt,
                date: "2026-06-10",
                method: "Cash",
                feeType: "Tuition Fee",
                installmentNo: 1,
                collectedBy: "Office Staff",
              }
            ] : [],
          };
        });
        setFeeList(dynamicFees);
      }
    }
    loadData();
  }, []);

  // Summary Metrics
  const summary = useMemo(() => {
    const totalExpected = feeList.reduce((acc, f) => acc + (f.amount || 0), 0);
    const totalCollected = feeList.reduce((acc, f) => acc + (f.paid || 0), 0);
    const totalPending = Math.max(0, totalExpected - totalCollected);
    const fullyPaidCount = feeList.filter((f) => f.status === "Paid").length;
    const pendingCount = feeList.filter((f) => f.status !== "Paid").length;
    const totalReceipts = feeList.reduce((acc, f) => acc + (f.payments?.length || (f.paid > 0 ? 1 : 0)), 0);

    return {
      totalExpected,
      totalCollected,
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
    const remaining = Math.max(0, (f.amount || 0) - (f.paid || 0));
    const instAmt = Math.min(remaining, Math.round(f.amount / plan));
    setAmountPaid(String(instAmt > 0 ? instAmt : remaining));
    setReference("");
    setRemarks("");
    setOpenRecordModal(true);
  };

  const openDetailsFor = (f: FeeLedgerItem) => {
    setActiveLedger(f);
    setOpenDetailModal(true);
  };

  const handleRecordPayment = () => {
    if (!activeLedger) return;
    const paidAmt = Number(amountPaid || 0);
    if (paidAmt <= 0) return toast.error("Please enter a valid payment amount.");

    const newTotalPaid = (activeLedger.paid || 0) + paidAmt;
    const newBal = Math.max(0, activeLedger.amount - newTotalPaid);
    const newStatus: "Paid" | "Partial" | "Pending" = newBal === 0 ? "Paid" : "Partial";

    const nextInstNo = (activeLedger.paidInstallments || 0) + 1;
    const rcptNo = `SUN/26-27/${Math.floor(4000 + Math.random() * 6000)}`;

    const newTxn: PaymentTransaction = {
      id: `TXN-${Date.now()}`,
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

    const updatedLedger: FeeLedgerItem = {
      ...activeLedger,
      paid: newTotalPaid,
      status: newStatus,
      totalInstallments: installmentPlan,
      paidInstallments: newStatus === "Paid" ? installmentPlan : nextInstNo,
      payments: [...(activeLedger.payments || []), newTxn],
    };

    setFeeList((prev) => prev.map((f) => (f.id === activeLedger.id ? updatedLedger : f)));
    saveFeeRecord(updatedLedger);

    const rcpt: Receipt = {
      receiptNo: rcptNo,
      studentName: activeLedger.studentName,
      admissionNo: activeLedger.admissionNo || activeLedger.studentId,
      className: activeLedger.className,
      feeType,
      amountDue: Math.max(0, activeLedger.amount - (activeLedger.paid || 0)),
      amountPaid: paidAmt,
      balance: newBal,
      method,
      reference,
      date,
      remarks,
      status: newStatus,
      collectedBy: "Office Staff",
    };

    saveReceipt(rcpt);
    setReceipt(rcpt);
    setOpenRecordModal(false);

    NotificationService.feePayment(`₹${paidAmt.toLocaleString()}`, activeLedger.studentName);
    toast.success(`Payment of ₹${paidAmt.toLocaleString()} recorded for ${activeLedger.studentName}!`);
  };

  return (
    <div className="flex flex-col h-full min-h-0 space-y-4">
      <div className="shrink-0">
        <PageHeader title="Student Fee Ledger & Collection" subtitle="Manage student fee balances, installment plans, and generated receipts." />
      </div>

      {/* Summary Cards */}
      <div className="shrink-0 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Total Fee Expected" value={`₹${(summary.totalExpected / 100000).toFixed(2)}L`} icon={DollarSign} gradient="from-purple-500 to-indigo-500" />
        <StatCard label="Total Fee Collected" value={`₹${(summary.totalCollected / 100000).toFixed(2)}L`} icon={Wallet} gradient="from-emerald-500 to-teal-500" />
        <StatCard label="Total Pending Amount" value={`₹${(summary.totalPending / 100000).toFixed(2)}L`} icon={Clock} gradient="from-rose-500 to-orange-500" />
        <StatCard label="Students Fully Paid" value={summary.fullyPaidCount} icon={CheckCircle} gradient="from-teal-500 to-emerald-500" />
        <StatCard label="Students Pending" value={summary.pendingCount} icon={Clock} gradient="from-amber-500 to-yellow-500" />
        <StatCard label="Receipts Generated" value={summary.totalReceipts} icon={FileText} gradient="from-sky-500 to-blue-500" />
      </div>

      {/* Main Ledger Section */}
      <div className="flex-1 min-h-0 rounded-3xl border border-white/60 bg-white/70 backdrop-blur-xl shadow-lg shadow-black/5 flex flex-col overflow-hidden">
        {/* Filter bar */}
        <div className="shrink-0 p-4 border-b border-white/60 flex flex-col md:flex-row items-center justify-between gap-3">
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

        {/* Ledger Table */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground sticky top-0 z-10 backdrop-blur">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Student</th>
                <th className="text-left px-4 py-3 font-medium">Adm No.</th>
                <th className="text-left px-4 py-3 font-medium">Class</th>
                <th className="text-left px-4 py-3 font-medium">Academic Year</th>
                <th className="text-left px-4 py-3 font-medium">Total Fee</th>
                <th className="text-left px-4 py-3 font-medium">Paid</th>
                <th className="text-left px-4 py-3 font-medium">Pending</th>
                <th className="text-left px-4 py-3 font-medium">Installment Progress</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-muted/30">
              {filtered.map((f) => {
                const pending = Math.max(0, f.amount - f.paid);
                const instTotal = f.totalInstallments || 3;
                const instPaid = f.status === "Paid" ? instTotal : f.paidInstallments || (f.paid > 0 ? 1 : 0);
                const pct = Math.min(100, Math.round((f.paid / f.amount) * 100));

                return (
                  <tr key={f.id} className="hover:bg-white/60 transition">
                    <td className="px-4 py-3 font-semibold text-slate-800">{f.studentName}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{f.admissionNo || "ADM-1001"}</td>
                    <td className="px-4 py-3">{f.className}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{f.academicYear || "2026-2027"}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">₹{f.amount.toLocaleString()}</td>
                    <td className="px-4 py-3 font-semibold text-emerald-700">₹{f.paid.toLocaleString()}</td>
                    <td className="px-4 py-3 font-semibold text-rose-600">₹{pending.toLocaleString()}</td>
                    <td className="px-4 py-3 min-w-[140px]">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] shrink-0 font-medium">
                          {instPaid}/{instTotal} Inst
                        </Badge>
                        <Progress value={pct} className="h-1.5 flex-1" />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={f.status === "Paid" ? "bg-emerald-100 text-emerald-700" : f.status === "Partial" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}>
                        {f.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={() => openDetailsFor(f)}>
                          <Eye className="h-4 w-4 mr-1 text-slate-600" /> Details
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => openRecordPaymentFor(f)}
                          className="bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-full text-xs font-medium"
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" /> Pay
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-muted-foreground text-sm">
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
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Student Fee Ledger Details</DialogTitle>
          </DialogHeader>

          {activeLedger && (
            <div className="space-y-4 text-sm mt-2">
              {/* Cover info */}
              <div className="rounded-2xl bg-gradient-to-r from-orange-50 to-amber-50 p-4 border border-orange-200/60 flex items-center justify-between">
                <div>
                  <div className="text-base font-bold text-slate-900">{activeLedger.studentName}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Admission No: <span className="font-mono">{activeLedger.admissionNo || "ADM-1001"}</span> · Class {activeLedger.className}
                  </div>
                  <div className="text-xs text-muted-foreground">Academic Year: {activeLedger.academicYear || "2026-2027"}</div>
                </div>
                <Badge className={activeLedger.status === "Paid" ? "bg-emerald-100 text-emerald-700" : activeLedger.status === "Partial" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}>
                  {activeLedger.status}
                </Badge>
              </div>

              {/* Financial Breakdown Tiles */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border bg-card p-3">
                  <div className="text-xs text-muted-foreground">Total Fee</div>
                  <div className="text-lg font-bold text-slate-900 mt-1">₹{activeLedger.amount.toLocaleString()}</div>
                </div>
                <div className="rounded-xl border bg-card p-3">
                  <div className="text-xs text-muted-foreground">Total Paid</div>
                  <div className="text-lg font-bold text-emerald-600 mt-1">₹{activeLedger.paid.toLocaleString()}</div>
                </div>
                <div className="rounded-xl border bg-card p-3">
                  <div className="text-xs text-muted-foreground">Remaining Balance</div>
                  <div className="text-lg font-bold text-rose-600 mt-1">₹{Math.max(0, activeLedger.amount - activeLedger.paid).toLocaleString()}</div>
                </div>
              </div>

              {/* Installment Plan Progress */}
              <SectionCard title="Installment Plan Progress">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Installment Progress ({activeLedger.status === "Paid" ? activeLedger.totalInstallments || 3 : activeLedger.paidInstallments || (activeLedger.paid > 0 ? 1 : 0)} / {activeLedger.totalInstallments || 3} Completed)</span>
                    <span>{Math.min(100, Math.round((activeLedger.paid / activeLedger.amount) * 100))}% Paid</span>
                  </div>
                  <Progress value={Math.min(100, Math.round((activeLedger.paid / activeLedger.amount) * 100))} className="h-2" />
                </div>
              </SectionCard>

              {/* Payment Transactions & Receipts History */}
              <SectionCard title="Payment & Receipt History">
                {(!activeLedger.payments || activeLedger.payments.length === 0) ? (
                  <div className="text-xs text-muted-foreground py-4 text-center">No payment transactions recorded yet.</div>
                ) : (
                  <ul className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {activeLedger.payments.map((p, idx) => (
                      <li key={p.id || idx} className="rounded-xl border p-3 flex items-center justify-between text-xs bg-white">
                        <div>
                          <div className="font-semibold text-slate-900">Receipt #{p.receiptNo}</div>
                          <div className="text-muted-foreground">{p.date} · Method: {p.method} · Inst #{p.installmentNo || idx + 1}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-emerald-700">₹{p.amount.toLocaleString()}</div>
                          <Button size="sm" variant="ghost" className="h-6 text-[11px] px-2 text-sky-600" onClick={() => window.print()}>
                            <Printer className="h-3 w-3 mr-1" /> Print
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setOpenDetailModal(false)}>Close</Button>
            {activeLedger && activeLedger.status !== "Paid" && (
              <Button
                onClick={() => {
                  setOpenDetailModal(false);
                  openRecordPaymentFor(activeLedger);
                }}
                className="bg-gradient-to-r from-orange-500 to-amber-500 text-white"
              >
                Record Next Installment Payment
              </Button>
            )}
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
                <div className="text-rose-700 font-medium mt-1">Pending Balance: ₹{Math.max(0, activeLedger.amount - activeLedger.paid).toLocaleString()}</div>
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

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 py-0.5 border-b border-slate-100 last:border-0 text-xs">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium text-right text-slate-800">{v}</span>
    </div>
  );
}
