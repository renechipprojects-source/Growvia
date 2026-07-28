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
import { Printer, CheckCircle, Clock, FileText } from "lucide-react";

const HISTORY = [
  { id: 1, month: "June 2026", amount: 8500, status: "Paid", date: "2026-06-05", receipt: "SUN/26-27/210" },
  { id: 2, month: "May 2026", amount: 8500, status: "Paid", date: "2026-05-08", receipt: "SUN/26-27/158" },
  { id: 3, month: "Apr 2026", amount: 8500, status: "Paid", date: "2026-04-10", receipt: "SUN/26-27/110" },
];

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

  const totalFee = feeRecord?.amount ?? 8500;
  const totalPaid = feeRecord?.paid ?? 0;
  const dueAmount = Math.max(0, totalFee - totalPaid);
  const totalInst = feeRecord?.totalInstallments || 3;
  const paidInst = feeRecord?.status === "Paid" ? totalInst : feeRecord?.paidInstallments || (totalPaid > 0 ? 1 : 0);
  const pct = Math.min(100, Math.round((totalPaid / totalFee) * 100));

  const historyItems = liveReceipts.length > 0
    ? liveReceipts.map((r, i) => ({
        id: r.receiptNo || i,
        month: r.date ? new Date(r.date).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "Recent",
        amount: r.amountPaid || r.amount || 8500,
        status: r.status || "Paid",
        date: r.date || "2026-07-28",
        receipt: r.receiptNo || `SUN/26-27/${300 + i}`,
      }))
    : HISTORY;

  return (
    <div>
      <PageHeader title={t("fees.title")} subtitle={t("fees.subtitle")} action={<ChildSwitcher />} />
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="rounded-3xl bg-gradient-to-br from-pink-500 via-fuchsia-500 to-purple-500 text-white p-6 shadow-xl lg:col-span-1 space-y-4">
          <div>
            <div className="text-xs uppercase tracking-widest opacity-80">{t("fees.due")}</div>
            <div className="mt-1 text-4xl font-bold">₹{dueAmount.toLocaleString()}</div>
            <div className="mt-1 text-xs opacity-90">
              Total Fee: ₹{totalFee.toLocaleString()} · Paid: ₹{totalPaid.toLocaleString()}
            </div>
          </div>

          <div className="pt-2 border-t border-white/20 space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <span>Installments</span>
              <span>{paidInst} / {totalInst} Paid</span>
            </div>
            <Progress value={pct} className="h-2 bg-white/30" />
          </div>

          <div className="text-xs opacity-90">{t("fees.payOffice")}</div>
        </div>

        <SectionCard title={t("fees.history")} className="lg:col-span-2">
          <ul className="space-y-2">
            {historyItems.map((h) => (
              <li key={h.id} className="flex items-center justify-between rounded-2xl bg-white/60 p-3 shadow-sm border border-white/60">
                <div>
                  <div className="font-medium text-slate-800">{h.month} · {h.receipt}</div>
                  <div className="text-xs text-muted-foreground">{h.date} · Official Receipt</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-semibold text-emerald-700">₹{h.amount.toLocaleString()}</div>
                    <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">{t(`status.${h.status.toLowerCase()}`, h.status)}</Badge>
                  </div>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => window.print()}>
                    <Printer className="h-4 w-4 text-slate-600" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}
