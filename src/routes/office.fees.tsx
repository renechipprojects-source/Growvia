import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-blocks";
import { FEES as SEED_FEES, STUDENTS as SEED_STUDENTS, type Fee } from "@/lib/mockData";
import { fetchStudents, fetchFees, saveFeeRecord, saveReceipt } from "@/lib/supabaseService";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useEffect, useMemo, useState } from "react";
import { Receipt as ReceiptIcon, Printer, Search, Plus, CheckCircle, Clock } from "lucide-react";
import { NotificationService } from "@/lib/notifications";

export const Route = createFileRoute("/office/fees")({ component: FeeCollection });

const PAYMENT_METHODS = ["Cash", "UPI", "Bank Transfer", "Cheque"] as const;
const PAYMENT_STATUSES = ["Paid", "Partial", "Pending"] as const;
const FEE_TYPES = ["Tuition Fee", "Admission Fee", "Transport Fee", "Activity Fee", "Exam Fee"] as const;

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

const DEFAULT_FEE: Fee = {
  id: "F-DEFAULT",
  studentId: "STD-001",
  studentName: "Aarav Sharma",
  className: "Playgroup A",
  amount: 8500,
  paid: 0,
  dueDate: "2026-07-15",
  status: "Pending",
  month: "July 2026",
};

function FeeCollection() {
  const [feeList, setFeeList] = useState<Fee[]>(SEED_FEES);
  const [students, setStudents] = useState(SEED_STUDENTS);
  const [selectedFeeId, setSelectedFeeId] = useState<string>(SEED_FEES[0]?.id || "F-DEFAULT");
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");

  // Form states
  const [feeType, setFeeType] = useState<string>("Tuition Fee");
  const [amountPaid, setAmountPaid] = useState<string>("");
  const [method, setMethod] = useState<string>("Cash");
  const [reference, setReference] = useState("");
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [remarks, setRemarks] = useState("");
  const [status, setStatus] = useState<string>("Paid");
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  // Load students & fees on mount
  useEffect(() => {
    async function loadData() {
      const { data: stData } = await fetchStudents();
      if (stData && stData.length > 0) {
        setStudents(stData);
      }

      const { data: feData } = await fetchFees();
      if (feData && feData.length > 0) {
        setFeeList(feData);
        setSelectedFeeId(feData[0].id);
      } else if (stData && stData.length > 0) {
        // Build fee list dynamically for students if no explicit fee items exist
        const dynamicFees: Fee[] = stData.map((s, idx) => ({
          id: `F-STU-${s.id}`,
          studentId: s.id,
          studentName: s.name,
          className: `${s.className} ${s.section}`,
          amount: s.className === "Playgroup" ? 8500 : s.className === "Nursery" ? 9500 : 10500,
          paid: s.feeStatus === "Paid" ? (s.className === "Playgroup" ? 8500 : 9500) : s.feeStatus === "Partial" ? 4000 : 0,
          dueDate: "2026-07-15",
          status: s.feeStatus || "Pending",
          month: "July 2026",
        }));
        setFeeList(dynamicFees);
        setSelectedFeeId(dynamicFees[0].id);
      }
    }
    loadData();
  }, []);

  const currentFee = useMemo(() => {
    return feeList.find((f) => f.id === selectedFeeId) || feeList[0] || DEFAULT_FEE;
  }, [feeList, selectedFeeId]);

  const admissionNo = useMemo(() => {
    const s = students.find((st) => st.id === currentFee.studentId || st.name === currentFee.studentName);
    return s?.admissionNo ?? s?.id ?? "ADM-1001";
  }, [students, currentFee]);

  // Set default amount paid when selecting a new fee
  useEffect(() => {
    if (currentFee) {
      const due = (currentFee.amount ?? 8500) - (currentFee.paid ?? 0);
      setAmountPaid(String(due));
    }
  }, [currentFee?.id]);

  const amountDue = (currentFee.amount ?? 8500) - (currentFee.paid ?? 0);
  const balance = Math.max(0, amountDue - Number(amountPaid || 0));

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return feeList.filter((f) => {
      const matchesSearch = !t || f.studentName.toLowerCase().includes(t) || f.className.toLowerCase().includes(t);
      const matchesStatus = statusFilter === "All" || f.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [feeList, q, statusFilter]);

  const selectFee = (f: Fee) => {
    setSelectedFeeId(f.id);
    setAmountPaid(String(f.amount - f.paid));
    setStatus("Paid");
    setReference("");
    setRemarks("");
  };

  const handleRecord = () => {
    const paidAmt = Number(amountPaid || 0);
    const newPaid = (currentFee.paid ?? 0) + paidAmt;
    const newBal = Math.max(0, (currentFee.amount ?? 8500) - newPaid);
    const newStatus: "Paid" | "Partial" | "Pending" = newBal === 0 ? "Paid" : newPaid > 0 ? "Partial" : "Pending";

    const updatedFee: Fee = {
      ...currentFee,
      paid: newPaid,
      status: newStatus,
    };

    // Update state
    setFeeList((prev) => prev.map((f) => (f.id === currentFee.id ? updatedFee : f)));

    // Persist to LocalStorage and Supabase DB
    saveFeeRecord(updatedFee);

    const rcpt: Receipt = {
      receiptNo: `SUN/26-27/${Math.floor(4000 + Math.random() * 6000)}`,
      studentName: currentFee.studentName,
      admissionNo,
      className: currentFee.className,
      feeType,
      amountDue,
      amountPaid: paidAmt,
      balance: newBal,
      method,
      reference,
      date,
      remarks,
      status: newStatus,
      collectedBy: "Meena (Office)",
    };

    saveReceipt(rcpt);
    setReceipt(rcpt);

    // Live Notification System Sync
    NotificationService.feePayment(`₹${paidAmt.toLocaleString()}`, currentFee.studentName);

    toast.success(`Payment of ₹${paidAmt.toLocaleString()} recorded for ${currentFee.studentName}!`);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0">
        <PageHeader title="Fee Collection" subtitle="Record payments received at the school and generate a receipt." />
      </div>

      <div className="flex-1 min-h-0 grid lg:grid-cols-3 gap-4">
        {/* Outstanding List Panel */}
        <div className="min-h-0 rounded-3xl border border-white/60 bg-white/70 backdrop-blur-xl shadow-lg shadow-black/5 flex flex-col">
          <div className="shrink-0 px-5 pt-5 pb-3 flex items-center justify-between gap-2">
            <h3 className="font-semibold text-sm">Student Fee List</h3>
            <span className="text-xs text-muted-foreground">{filtered.length} of {feeList.length}</span>
          </div>

          <div className="shrink-0 px-5 pb-2 space-y-2">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search student or class…" className="pl-9 bg-white/70 text-xs" />
            </div>

            <div className="flex gap-1 overflow-x-auto pb-1">
              {["All", "Pending", "Partial", "Paid"].map((st) => (
                <Button
                  key={st}
                  size="sm"
                  variant={statusFilter === st ? "default" : "ghost"}
                  onClick={() => setStatusFilter(st)}
                  className="h-7 text-xs rounded-full px-2.5"
                >
                  {st}
                </Button>
              ))}
            </div>
          </div>

          <ul className="flex-1 min-h-0 overflow-y-auto px-3 pb-4 space-y-2">
            {filtered.map((f) => (
              <li
                key={f.id}
                onClick={() => selectFee(f)}
                className={`flex items-center justify-between rounded-2xl p-3 text-sm cursor-pointer border transition ${currentFee.id === f.id ? "bg-orange-50/90 border-orange-300 shadow-sm" : "bg-white/60 border-transparent hover:bg-white/90"}`}
              >
                <div className="min-w-0">
                  <div className="font-medium truncate text-slate-800">{f.studentName}</div>
                  <div className="text-xs text-muted-foreground">{f.className} • {f.month}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-semibold text-slate-800">₹{f.amount.toLocaleString()}</div>
                  <Badge className={`text-[10px] ${f.status === "Paid" ? "bg-emerald-100 text-emerald-700" : f.status === "Partial" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}`}>
                    {f.status}
                  </Badge>
                </div>
              </li>
            ))}
            {filtered.length === 0 && (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No fee records found.
              </div>
            )}
          </ul>
        </div>

        {/* Record Payment Form Panel */}
        <div className="min-h-0 lg:col-span-2 rounded-3xl border border-white/60 bg-white/70 backdrop-blur-xl shadow-lg shadow-black/5 flex flex-col">
          <div className="shrink-0 px-5 pt-5 pb-3 flex items-center justify-between border-b border-white/40">
            <div>
              <h3 className="font-semibold text-slate-800">Record Payment</h3>
              <p className="text-xs text-muted-foreground">Select a student from the list to enter received fees.</p>
            </div>
            <Badge className="bg-orange-100 text-orange-700 px-3 py-1 font-medium">{currentFee.studentName}</Badge>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div><Label className="text-xs font-medium text-slate-600">Student Name</Label><Input value={currentFee.studentName} readOnly className="mt-1 bg-white/90 font-medium" /></div>
              <div><Label className="text-xs font-medium text-slate-600">Admission Number</Label><Input value={admissionNo} readOnly className="mt-1 bg-white/90" /></div>
              <div><Label className="text-xs font-medium text-slate-600">Class & Section</Label><Input value={currentFee.className} readOnly className="mt-1 bg-white/90" /></div>
              <div>
                <Label className="text-xs font-medium text-slate-600">Fee Type</Label>
                <Select value={feeType} onValueChange={setFeeType}>
                  <SelectTrigger className="mt-1 bg-white/90"><SelectValue /></SelectTrigger>
                  <SelectContent>{FEE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs font-medium text-slate-600">Total Amount Due (₹)</Label><Input value={amountDue} readOnly className="mt-1 bg-amber-50/60 font-semibold text-amber-800" /></div>
              <div><Label className="text-xs font-medium text-slate-600">Amount Paying Now (₹)</Label><Input type="number" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} className="mt-1 bg-white/90 font-semibold text-emerald-700" /></div>
              <div><Label className="text-xs font-medium text-slate-600">Remaining Balance (₹)</Label><Input value={balance} readOnly className="mt-1 bg-white/90" /></div>
              <div><Label className="text-xs font-medium text-slate-600">Payment Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 bg-white/90" /></div>
              <div>
                <Label className="text-xs font-medium text-slate-600">Payment Method</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger className="mt-1 bg-white/90"><SelectValue /></SelectTrigger>
                  <SelectContent>{PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs font-medium text-slate-600">Reference / Txn No. (optional)</Label><Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="UPI ID / Cheque no." className="mt-1 bg-white/90" /></div>
              <div className="sm:col-span-2">
                <Label className="text-xs font-medium text-slate-600">Remarks / Notes (optional)</Label>
                <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="e.g. Paid in 2 installments..." className="mt-1 bg-white/90" rows={2} />
              </div>
            </div>
          </div>

          <div className="shrink-0 px-5 py-3 border-t border-white/60 bg-white/30 flex justify-end">
            <Button
              className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-full shadow-lg font-medium px-6"
              onClick={handleRecord}
            >
              <ReceiptIcon className="h-4 w-4 mr-2" /> Record Payment & Generate Receipt
            </Button>
          </div>
        </div>
      </div>

      {/* Printable Receipt Modal */}
      <Dialog open={!!receipt} onOpenChange={(o) => !o && setReceipt(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Payment Receipt Generated</DialogTitle></DialogHeader>
          {receipt && (
            <div id="print-receipt" className="text-sm space-y-2 rounded-2xl border border-slate-200 p-4 bg-white shadow-inner">
              <div className="text-center border-b pb-3">
                <div className="font-bold text-lg text-orange-600">Sunshine Play School</div>
                <div className="text-xs text-muted-foreground">Official Fee Receipt</div>
              </div>
              <Row k="Receipt Number" v={receipt.receiptNo} />
              <Row k="Student Name" v={receipt.studentName} />
              <Row k="Admission Number" v={receipt.admissionNo} />
              <Row k="Class" v={receipt.className} />
              <Row k="Fee Type" v={receipt.feeType} />
              <Row k="Amount Paid" v={`₹${receipt.amountPaid.toLocaleString()}`} />
              <Row k="Balance Remaining" v={`₹${receipt.balance.toLocaleString()}`} />
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
