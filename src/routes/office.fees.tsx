import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-blocks";
import { FEES, STUDENTS } from "@/lib/mockData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import { Receipt as ReceiptIcon, Printer, Search } from "lucide-react";
import { NotificationService } from "@/lib/notifications";

export const Route = createFileRoute("/office/fees")({ component: FeeCollection });

const PAYMENT_METHODS = ["Cash", "UPI", "Bank Transfer", "Cheque"] as const;
const PAYMENT_STATUSES = ["Paid", "Partially Paid", "Pending"] as const;
const FEE_TYPES = ["Tuition Fee", "Admission Fee", "Transport", "Activity Fee", "Exam Fee"] as const;

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

const DEFAULT_FEE = {
  id: "F-DEFAULT",
  studentId: "STD-001",
  studentName: "Aarav Sharma",
  className: "Playgroup A",
  amount: 8500,
  paid: 0,
  dueDate: "2026-07-15",
  status: "Pending" as const,
  month: "July 2026",
};

function FeeCollection() {
  const [selected, setSelected] = useState(FEES[0] ?? DEFAULT_FEE);
  const [q, setQ] = useState("");
  const currentFee = selected ?? DEFAULT_FEE;
  const admissionNo = useMemo(() => {
    const s = STUDENTS.find((s) => s.id === currentFee.studentId);
    return s?.admissionNo ?? s?.id ?? currentFee.studentId;
  }, [currentFee]);

  const [feeType, setFeeType] = useState<string>("Tuition Fee");
  const [amountPaid, setAmountPaid] = useState<string>(String((currentFee.amount ?? 8500) - (currentFee.paid ?? 0)));
  const [method, setMethod] = useState<string>("Cash");
  const [reference, setReference] = useState("");
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [remarks, setRemarks] = useState("");
  const [status, setStatus] = useState<string>("Paid");
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  const amountDue = (currentFee.amount ?? 8500) - (currentFee.paid ?? 0);
  const balance = Math.max(0, amountDue - Number(amountPaid || 0));

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return FEES;
    return FEES.filter(
      (f) => f.studentName.toLowerCase().includes(t) || f.className.toLowerCase().includes(t),
    );
  }, [q]);

  const selectFee = (f: typeof FEES[number]) => {
    setSelected(f);
    setAmountPaid(String(f.amount - f.paid));
    setStatus("Paid");
    setReference("");
    setRemarks("");
  };

  const handleRecord = () => {
    const paidAmt = Number(amountPaid || 0);
    const newPaid = (currentFee.paid ?? 0) + paidAmt;
    const newBal = Math.max(0, (currentFee.amount ?? 8500) - newPaid);
    const newStatus = newBal === 0 ? "Paid" : newPaid > 0 ? "Partial" : "Pending";

    // Update in memory
    currentFee.paid = newPaid;
    currentFee.status = newStatus as any;

    const rcpt: Receipt = {
      receiptNo: `SUN/26-27/${Math.floor(400 + Math.random() * 600)}`,
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
    setReceipt(rcpt);

    // Live Notification System Sync
    NotificationService.feePayment(`₹${paidAmt.toLocaleString()}`, currentFee.studentName);

    toast.success(`Payment recorded for ${currentFee.studentName} (Status: ${newStatus})`);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0">
        <PageHeader title="Fee Collection" subtitle="Record payments received at the school and generate a receipt." />
      </div>

      <div className="flex-1 min-h-0 grid lg:grid-cols-3 gap-4">
        {/* Outstanding — list scrolls internally */}
        <div className="min-h-0 rounded-3xl border border-white/60 bg-white/70 backdrop-blur-xl shadow-lg shadow-black/5 flex flex-col">
          <div className="shrink-0 px-5 pt-5 pb-3 flex items-center justify-between gap-2">
            <h3 className="font-semibold">Outstanding</h3>
            <span className="text-xs text-muted-foreground">{filtered.length} of {FEES.length}</span>
          </div>
          <div className="shrink-0 px-5 pb-2 relative">
            <Search className="h-4 w-4 absolute left-8 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search student…" className="pl-9 bg-white/70" />
          </div>
          <ul className="flex-1 min-h-0 overflow-y-auto px-3 pb-4 space-y-2">
            {filtered.map((f) => (
              <li
                key={f.id}
                onClick={() => selectFee(f)}
                className={`flex items-center justify-between rounded-2xl p-3 text-sm cursor-pointer border ${currentFee.id === f.id ? "bg-orange-50 border-orange-200" : "bg-white/60 border-transparent"}`}
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">{f.studentName}</div>
                  <div className="text-xs text-muted-foreground">{f.className} • {f.month}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-semibold">₹{f.amount.toLocaleString()}</div>
                  <Badge className={f.status === "Paid" ? "bg-emerald-100 text-emerald-700" : f.status === "Partial" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}>{f.status}</Badge>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Record Payment — form area scrolls if needed, action bar fixed */}
        <div className="min-h-0 lg:col-span-2 rounded-3xl border border-white/60 bg-white/70 backdrop-blur-xl shadow-lg shadow-black/5 flex flex-col">
          <div className="shrink-0 px-5 pt-5 pb-3 flex items-center justify-between">
            <h3 className="font-semibold">Record Payment</h3>
            <Badge className="bg-slate-100 text-slate-700">{currentFee.studentName}</Badge>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-4">
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div><Label>Student Name</Label><Input value={currentFee.studentName} readOnly className="mt-1.5 bg-white/70" /></div>
              <div><Label>Admission Number</Label><Input value={admissionNo} readOnly className="mt-1.5 bg-white/70" /></div>
              <div><Label>Class</Label><Input value={currentFee.className} readOnly className="mt-1.5 bg-white/70" /></div>
              <div>
                <Label>Fee Type</Label>
                <Select value={feeType} onValueChange={setFeeType}>
                  <SelectTrigger className="mt-1.5 bg-white/70"><SelectValue /></SelectTrigger>
                  <SelectContent>{FEE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Amount Due</Label><Input value={amountDue} readOnly className="mt-1.5 bg-white/70" /></div>
              <div><Label>Amount Paid</Label><Input type="number" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} className="mt-1.5 bg-white/70" /></div>
              <div><Label>Balance Amount</Label><Input value={balance} readOnly className="mt-1.5 bg-white/70" /></div>
              <div><Label>Payment Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1.5 bg-white/70" /></div>
              <div>
                <Label>Payment Method</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger className="mt-1.5 bg-white/70"><SelectValue /></SelectTrigger>
                  <SelectContent>{PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Reference Number (optional)</Label><Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Txn / Cheque no." className="mt-1.5 bg-white/70" /></div>
              <div>
                <Label>Payment Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="mt-1.5 bg-white/70"><SelectValue /></SelectTrigger>
                  <SelectContent>{PAYMENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2"><Label>Remarks</Label><Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} className="mt-1.5 bg-white/70" /></div>
            </div>
          </div>
          <div className="shrink-0 px-5 py-3 border-t border-white/60 flex justify-end">
            <Button
              className="bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-full shadow-lg"
              onClick={handleRecord}
            >
              <ReceiptIcon className="h-4 w-4 mr-2" /> Record Payment & Generate Receipt
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={!!receipt} onOpenChange={(o) => !o && setReceipt(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Payment Receipt</DialogTitle></DialogHeader>
          {receipt && (
            <div id="print-receipt" className="text-sm space-y-2 rounded-xl border p-4 bg-white">
              <div className="text-center border-b pb-2">
                <div className="font-bold text-base">Sunshine Play School</div>
                <div className="text-xs text-muted-foreground">Fee Receipt</div>
              </div>
              <Row k="Receipt Number" v={receipt.receiptNo} />
              <Row k="Student Name" v={receipt.studentName} />
              <Row k="Admission Number" v={receipt.admissionNo} />
              <Row k="Class" v={receipt.className} />
              <Row k="Fee Type" v={receipt.feeType} />
              <Row k="Amount Paid" v={`₹${receipt.amountPaid.toLocaleString()}`} />
              <Row k="Balance" v={`₹${receipt.balance.toLocaleString()}`} />
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
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium text-right">{v}</span>
    </div>
  );
}
