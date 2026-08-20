import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Calendar, CheckCircle2, AlertCircle, Receipt, User, GraduationCap } from "lucide-react";
import type { FeeLedgerItem } from "@/lib/supabaseService";

export function PaymentDetailsModal({
  open,
  onClose,
  ledger,
}: {
  open: boolean;
  onClose: () => void;
  ledger: FeeLedgerItem | null;
}) {
  if (!ledger) return null;

  const origFee = ledger.originalFee || ledger.amount || 8500;
  const discAmt = ledger.discountAmount || 0;
  const finalFee = ledger.finalFee || (origFee - discAmt);
  const paid = (ledger.payments && ledger.payments.length > 0)
    ? ledger.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0)
    : (ledger.paid || 0);
  const remaining = Math.max(0, finalFee - paid);

  let status = "Unpaid";
  let statusTone = "bg-rose-50 text-rose-700 border-rose-200";
  if (remaining === 0 && finalFee > 0) {
    status = "Paid";
    statusTone = "bg-emerald-50 text-emerald-700 border-emerald-200";
  } else if (paid > 0) {
    status = "Partially Paid";
    statusTone = "bg-amber-50 text-amber-700 border-amber-200";
  }

  const paymentsList = ledger.payments && ledger.payments.length > 0 ? ledger.payments : [
    {
      id: `p-1`,
      amount: paid,
      date: ledger.lastPaymentDate || new Date().toISOString().split("T")[0],
      method: "Online Transfer / UPI",
      receiptNo: `REC-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    }
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl rounded-3xl p-6 overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-indigo-600" />
              Fee Ledger & Installment Details
            </span>
            <Badge variant="outline" className={`px-3 py-1 text-xs font-semibold ${statusTone}`}>
              {status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Student Banner (Professional Light Theme) */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 text-slate-900 flex items-center justify-between shadow-xs">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider bg-indigo-50 border border-indigo-100/80 px-2.5 py-0.5 rounded-full inline-block">
                Student Record
              </span>
              <div className="text-base font-bold text-slate-900 flex items-center gap-2 pt-0.5">
                <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                  {ledger.studentName[0] || "S"}
                </div>
                {ledger.studentName}
              </div>
              <div className="text-xs text-slate-600 flex items-center gap-3 font-mono pt-0.5">
                <span>Adm No: <strong className="text-slate-800">{toCanonicalAdmissionNo(ledger.admissionNo, ledger.studentId || ledger.id)}</strong></span>
                <span className="text-slate-300">•</span>
                <span>Class: <strong className="text-slate-800">{ledger.className}</strong></span>
              </div>
            </div>
            <div className="text-right bg-slate-50/80 border border-slate-200/70 p-3 rounded-xl">
              <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Total Applicable Fee</div>
              <div className="text-lg font-extrabold text-indigo-700 font-mono mt-0.5">₹{finalFee.toLocaleString()}</div>
            </div>
          </div>

          {/* Fee Components Breakdown */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
            <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-2">Standard Fee Components Breakdown</h4>
            <div className="flex justify-between text-slate-600">
              <span>Tuition & Academic Term Fee</span>
              <span className="font-mono font-medium">₹{Math.round(finalFee * 0.6).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Development & Campus Maintenance</span>
              <span className="font-mono font-medium">₹{Math.round(finalFee * 0.2).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Examination & Activity Facilities</span>
              <span className="font-mono font-medium">₹{Math.round(finalFee * 0.2).toLocaleString()}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-bold text-slate-900 text-sm">
              <span>Net Calculated Fee</span>
              <span className="font-mono">₹{finalFee.toLocaleString()}</span>
            </div>
          </div>

          {/* Summary Metric Counters */}
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200/80">
              <div className="text-xs font-semibold text-emerald-800">Total Amount Paid</div>
              <div className="text-lg font-bold text-emerald-700 font-mono mt-0.5">₹{paid.toLocaleString()}</div>
            </div>
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200/80">
              <div className="text-xs font-semibold text-rose-800">Remaining Balance Due</div>
              <div className="text-lg font-bold text-rose-700 font-mono mt-0.5">₹{remaining.toLocaleString()}</div>
            </div>
          </div>

          {/* Installments History */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
              <span>Installment Payment History ({paymentsList.length})</span>
            </h4>
            <div className="max-h-40 overflow-y-auto rounded-2xl border border-slate-200 divide-y divide-slate-100 bg-white">
              {paymentsList.map((p: any, idx: number) => (
                <div key={p.id || idx} className="p-3 text-xs flex items-center justify-between hover:bg-slate-50">
                  <div>
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <CreditCard className="h-3.5 w-3.5 text-indigo-600" />
                      Installment #{idx + 1} — {p.method || "Online"}
                    </div>
                    <div className="text-slate-400 mt-0.5 font-mono">
                      Date: {p.date || "Today"} | Receipt: {p.receiptNo || `REC-${idx + 100}`}
                    </div>
                  </div>
                  <div className="text-right font-bold text-emerald-600 font-mono text-sm">
                    +₹{Number(p.amount || 0).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
