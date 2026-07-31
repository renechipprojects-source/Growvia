import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/ui-blocks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useParent } from "@/lib/parentContext";
import { ChildSwitcher } from "@/components/ChildSwitcher";
import { useT } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { fetchFees, type FeeLedgerItem } from "@/lib/supabaseService";
import { Printer, CheckCircle, Clock, FileText, Tag } from "lucide-react";

export const Route = createFileRoute("/parent/fees")({ component: ParentFees });

function ParentFees() {
  const { t } = useT();
  const { activeChild } = useParent();
  const [feeRecord, setFeeRecord] = useState<FeeLedgerItem | null>(null);
  const [liveReceipts, setLiveReceipts] = useState<any[]>([]);

  useEffect(() => {
    fetchFees().then(({ data }) => {
      const match = data.find(
        (f) =>
          f.studentId === activeChild.id ||
          f.studentName === activeChild.name ||
          (f.className && f.className.includes(activeChild.className))
      );
      if (match) setFeeRecord(match);
    });

    try {
      const raw = localStorage.getItem("SUNSHINE_RECEIPTS");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const matchRcpts = parsed.filter(
            (r: any) =>
              r.studentName === activeChild.name ||
              r.admissionNo === activeChild.admissionNo
          );
          setLiveReceipts(matchRcpts);
        }
      }
    } catch {}
  }, [activeChild]);

  const origFee = feeRecord?.originalFee ?? feeRecord?.amount ?? 8500;
  const discAmt = feeRecord?.discountAmount ?? 0;
  const finalFee = feeRecord?.finalFee ?? (origFee - discAmt);
  const totalPaid = (feeRecord?.payments && feeRecord.payments.length > 0)
    ? feeRecord.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0)
    : (feeRecord?.paid ?? 0);
  const remainingAmount = Math.max(0, finalFee - totalPaid);
  const instCount = feeRecord?.payments?.length || (totalPaid > 0 ? 1 : 0);

  let status = "Unpaid";
  if (remainingAmount === 0 && finalFee > 0) status = "Paid";
  else if (totalPaid > 0) status = "Partially Paid";

  const historyItems = (feeRecord?.payments && feeRecord.payments.length > 0)
    ? feeRecord.payments
    : liveReceipts.length > 0
    ? liveReceipts.map((r, i) => ({
        id: r.receiptNo || i,
        receiptNo: r.receiptNo || `SUN/26-27/${300 + i}`,
        amount: r.amountPaid || r.amount || 8500,
        method: r.method || "Cash",
        date: r.date || "2026-07-28",
        collectedBy: r.collectedBy || "Office Staff",
        installmentNo: i + 1,
      }))
    : [];

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-y-auto w-full max-w-none pr-1 space-y-4">
      <div>
        <PageHeader title={t("fees.title")} subtitle={t("fees.subtitle")} action={<ChildSwitcher />} />
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Main Fee Ledger Card */}
        <div className="rounded-3xl bg-gradient-to-br from-pink-500 via-fuchsia-500 to-purple-500 text-white p-6 shadow-xl lg:col-span-1 space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-widest opacity-80">Remaining Balance</div>
              <Badge className={status === "Paid" ? "bg-emerald-400 text-emerald-950 font-bold" : status === "Partially Paid" ? "bg-amber-300 text-amber-950 font-bold" : "bg-rose-400 text-rose-950 font-bold"}>
                {status}
              </Badge>
            </div>
            <div className="mt-1 text-4xl font-bold">₹{remainingAmount.toLocaleString()}</div>
            <div className="mt-3 text-xs opacity-90 space-y-1.5 bg-black/10 p-3 rounded-2xl">
              <div className="flex justify-between"><span>Total Fee:</span> <b>₹{finalFee.toLocaleString()}</b></div>
              <div className="flex justify-between text-emerald-200"><span>Total Paid:</span> <b>₹{totalPaid.toLocaleString()}</b></div>
              <div className="flex justify-between text-indigo-200"><span>Installments Used:</span> <b>{instCount} Txn{instCount === 1 ? "" : "s"}</b></div>
            </div>
          </div>

          <div className="text-xs opacity-90 flex items-center gap-1.5 border-t border-white/20 pt-3">
            <Clock className="h-3.5 w-3.5 shrink-0" /> Fee collection receipts and records are managed by the Office.
          </div>
        </div>

        {/* History Breakdown */}
        <SectionCard title="Payment Receipts & Installment History" className="lg:col-span-2">
          {historyItems.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">No fee payment receipts generated yet.</div>
          ) : (
            <ul className="space-y-2">
              {historyItems.map((h: any, idx: number) => (
                <li key={h.id || idx} className="flex items-center justify-between rounded-2xl bg-white/60 p-3.5 shadow-sm border border-white/60">
                  <div>
                    <div className="font-semibold text-slate-900">Receipt #{h.receiptNo}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Date: <b>{h.date}</b> · Method: <b>{h.method}</b> · Inst #{h.installmentNo || idx + 1}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-bold text-emerald-700 text-base">₹{h.amount.toLocaleString()}</div>
                      <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Paid</Badge>
                    </div>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => window.print()}>
                      <Printer className="h-4 w-4 text-slate-600" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
