import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-blocks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Printer, Search, FileText, CheckCircle2, Building2, User, Calendar, CreditCard, Sparkles } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { fetchReceipts } from "@/lib/supabaseService";
import { useDeveloperSettings } from "@/lib/developerSettingsStore";
import { useAutoRefresh } from "@/lib/autoRefreshContext";

export const Route = createFileRoute("/office/receipts")({
  component: ReceiptsPage,
});

export interface ReceiptRecord {
  id: string;
  receiptNo: string;
  studentId: string;
  studentName: string;
  className: string;
  feeType: string;
  amountPaid: number;
  amountDue: number;
  balance: number;
  date: string;
  mode: string;
  transactionRef: string;
  collectedBy: string;
  status: string;
}

function ReceiptsPage() {
  const [list, setList] = useState<ReceiptRecord[]>([]);
  const [q, setQ] = useState("");
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptRecord | null>(null);
  const [openModal, setOpenModal] = useState(false);
  const { settings } = useDeveloperSettings();

  const loadReceipts = async () => {
    try {
      const { data } = await fetchReceipts();
      const mapped: ReceiptRecord[] = (data || []).map((d: any) => ({
        id: d.id,
        receiptNo: d.receiptNo || d.receipt_number || `REC-${String(d.id).slice(-6).toUpperCase()}`,
        studentId: d.studentId || d.student_id || "STU1001",
        studentName: d.studentName || d.student_name || "Student",
        className: d.className || d.class_name || "Nursery A",
        feeType: d.feeType || d.fee_type || "Term Fee",
        amountPaid: Number(d.amountPaid || d.amount_paid || d.amount || 0),
        amountDue: Number(d.amountDue || d.amount_due || 0),
        balance: Number(d.balance || 0),
        date: d.date || d.payment_date || d.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
        mode: d.method || d.payment_method || "Cash",
        transactionRef: d.reference || d.transaction_ref || d.receiptNo || d.id,
        collectedBy: d.collectedBy || d.recorded_by || "Office Staff",
        status: d.status || "Paid",
      }));

      setList(mapped);
    } catch (err) {
      console.warn("Error loading receipts from Supabase:", err);
    }
  };

  useAutoRefresh("fees", loadReceipts);

  useEffect(() => {
    loadReceipts();
  }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return list;
    return list.filter(
      (r) =>
        r.studentName.toLowerCase().includes(query) ||
        r.receiptNo.toLowerCase().includes(query) ||
        r.className.toLowerCase().includes(query) ||
        r.mode.toLowerCase().includes(query)
    );
  }, [list, q]);

  const handlePrint = (r: ReceiptRecord) => {
    setSelectedReceipt(r);
    setOpenModal(true);
  };

  const triggerPrintWindow = () => {
    window.print();
  };

  const schoolName = settings.school?.schoolName || settings.branding?.schoolName || "Sunshine Play School";

  return (
    <div className="space-y-6 w-full max-w-none">
      <PageHeader
        title="Fee Payment Receipts Hub"
        subtitle="Live database audit of all issued receipts, payment modes, fee ledgers, and printable official receipts."
      />

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl border border-white/60 bg-white/70 backdrop-blur-xl shadow-sm flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search receipts by student name, receipt #, class or mode…"
            className="pl-9 bg-white/80 rounded-xl"
          />
        </div>
        <div className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-2 rounded-xl">
          Total Receipts: <span className="text-amber-600 font-bold">{filtered.length}</span>
        </div>
      </div>

      {/* Receipts Table */}
      <div className="rounded-3xl border border-white/60 bg-white/80 backdrop-blur-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="sticky top-0 z-20 bg-slate-100/95 backdrop-blur-md text-xs uppercase text-slate-600 border-b border-slate-200">
              <tr>
                <th className="sticky top-0 z-20 bg-slate-100/95 backdrop-blur-md px-5 py-3.5 font-bold">Receipt No</th>
                <th className="sticky top-0 z-20 bg-slate-100/95 backdrop-blur-md px-5 py-3.5 font-bold">Student Name</th>
                <th className="sticky top-0 z-20 bg-slate-100/95 backdrop-blur-md px-5 py-3.5 font-bold">Class</th>
                <th className="sticky top-0 z-20 bg-slate-100/95 backdrop-blur-md px-5 py-3.5 font-bold">Fee Type</th>
                <th className="sticky top-0 z-20 bg-slate-100/95 backdrop-blur-md px-5 py-3.5 font-bold">Amount Paid</th>
                <th className="sticky top-0 z-20 bg-slate-100/95 backdrop-blur-md px-5 py-3.5 font-bold">Mode</th>
                <th className="sticky top-0 z-20 bg-slate-100/95 backdrop-blur-md px-5 py-3.5 font-bold">Date</th>
                <th className="sticky top-0 z-20 bg-slate-100/95 backdrop-blur-md px-5 py-3.5 font-bold">Collected By</th>
                <th className="sticky top-0 z-20 bg-slate-100/95 backdrop-blur-md px-5 py-3.5 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-500 font-medium">
                    No payment receipts found matching your search.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-amber-50/40 transition">
                    <td className="px-5 py-4 font-mono font-bold text-amber-700">{r.receiptNo}</td>
                    <td className="px-5 py-4 font-semibold text-slate-900">{r.studentName}</td>
                    <td className="px-5 py-4 text-slate-600">{r.className}</td>
                    <td className="px-5 py-4 text-slate-600">{r.feeType}</td>
                    <td className="px-5 py-4 font-bold text-emerald-600">₹{r.amountPaid.toLocaleString()}</td>
                    <td className="px-5 py-4">
                      <Badge variant="outline" className="bg-white border-slate-300 font-medium text-xs">
                        {r.mode}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-slate-500 text-xs">{r.date}</td>
                    <td className="px-5 py-4 text-slate-500 text-xs">{r.collectedBy}</td>
                    <td className="px-5 py-4 text-right">
                      <Button
                        size="sm"
                        onClick={() => handlePrint(r)}
                        className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl shadow-xs"
                      >
                        <Printer className="mr-1.5 h-3.5 w-3.5" /> Print Receipt
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Printable Receipt Modal */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="sm:max-w-xl p-0 overflow-hidden rounded-3xl border-slate-200">
          {selectedReceipt && (
            <div className="p-8 bg-white text-slate-800 space-y-6" id="printable-receipt">
              {/* Header */}
              <div className="flex items-start justify-between border-b pb-4 border-slate-200">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">{schoolName}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{settings.branding?.address || settings.school?.address}</p>
                  <p className="text-xs text-slate-500">{settings.branding?.phone || settings.school?.phone}</p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full">
                    OFFICIAL RECEIPT
                  </span>
                  <p className="text-sm font-mono font-bold text-slate-900 mt-2">#{selectedReceipt.receiptNo}</p>
                  <p className="text-xs text-slate-500">Date: {selectedReceipt.date}</p>
                </div>
              </div>

              {/* Student & Payment Summary */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <p className="text-slate-400 font-medium">STUDENT NAME</p>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">{selectedReceipt.studentName}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">CLASS & SECTION</p>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">{selectedReceipt.className}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">FEE CATEGORY</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{selectedReceipt.feeType}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">PAYMENT METHOD</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{selectedReceipt.mode}</p>
                </div>
              </div>

              {/* Fee Breakup Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-semibold">
                    <tr>
                      <th className="text-left p-3">Description</th>
                      <th className="text-right p-3">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="p-3 text-slate-700 font-medium">{selectedReceipt.feeType} Payment</td>
                      <td className="p-3 text-right font-bold text-slate-900">₹{selectedReceipt.amountPaid.toLocaleString()}</td>
                    </tr>
                    <tr className="bg-amber-50/50 font-bold">
                      <td className="p-3 text-amber-900">Total Amount Paid</td>
                      <td className="p-3 text-right text-amber-900 text-sm">₹{selectedReceipt.amountPaid.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Footer / Signatures */}
              <div className="pt-6 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <div>
                  <p className="font-medium text-slate-700">Issued by: {selectedReceipt.collectedBy}</p>
                  <p className="text-[10px] text-slate-400">Computer generated receipt. Valid without signature.</p>
                </div>
                <div className="text-center pt-8 border-t border-slate-300 w-32">
                  <p className="font-semibold text-slate-700 text-[11px]">Authorized Seal</p>
                </div>
              </div>

              <DialogFooter className="pt-4 border-t border-slate-100 flex justify-between items-center">
                <Button variant="outline" onClick={() => setOpenModal(false)} className="rounded-xl">
                  Close
                </Button>
                <Button onClick={triggerPrintWindow} className="bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl">
                  <Printer className="mr-2 h-4 w-4" /> Print PDF
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
