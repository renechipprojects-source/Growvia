import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { PageHeader, StatCard, SectionCard } from "@/components/ui-blocks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fetchFees, type FeeLedgerItem } from "@/lib/supabaseService";
import { Search, Eye, Wallet, CheckCircle, Clock, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/principal/fees")({
  head: () => ({
    meta: [
      { title: "Fees Overview | Principal Portal" },
      { name: "description", content: "Read-only overview of student fee collection and ledger status." },
    ],
  }),
  component: PrincipalFeesOverview,
});

function PrincipalFeesOverview() {
  const [feeRecords, setFeeRecords] = useState<FeeLedgerItem[]>([]);
  const [query, setQuery] = useState("");
  const [activeLedger, setActiveLedger] = useState<FeeLedgerItem | null>(null);
  const [openModal, setOpenModal] = useState(false);

  useEffect(() => {
    fetchFees().then(({ data }) => {
      if (data && data.length > 0) setFeeRecords(data);
    });
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return feeRecords;
    return feeRecords.filter(
      (f) =>
        f.studentName.toLowerCase().includes(q) ||
        (f.className && f.className.toLowerCase().includes(q)) ||
        (f.admissionNo && f.admissionNo.toLowerCase().includes(q))
    );
  }, [feeRecords, query]);

  const totalExpected = feeRecords.reduce((sum, f) => sum + (f.finalFee || f.originalFee || f.amount || 8500), 0);
  const totalPaid = feeRecords.reduce((sum, f) => sum + (f.paid || 0), 0);
  const totalPending = Math.max(0, totalExpected - totalPaid);
  const collectionPct = totalExpected > 0 ? Math.round((totalPaid / totalExpected) * 100) : 0;

  return (
    <div className="flex flex-1 min-h-0 flex-col w-full max-w-none space-y-4">
      <PageHeader
        title="Fees Overview"
        subtitle="Read-only view of school-wide fee collection, pending balances, and installment progress."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total Expected Fees" value={`₹${totalExpected.toLocaleString()}`} icon={Wallet} gradient="from-purple-500 to-indigo-500" />
        <StatCard label="Total Collected" value={`₹${totalPaid.toLocaleString()}`} icon={CheckCircle} gradient="from-emerald-500 to-teal-500" />
        <StatCard label="Pending Balance" value={`₹${totalPending.toLocaleString()}`} icon={AlertTriangle} gradient="from-amber-500 to-orange-500" />
        <StatCard label="Collection Rate" value={`${collectionPct}%`} icon={Clock} gradient="from-sky-500 to-blue-500" />
      </div>

      <div className="card-elevated p-4 md:p-5 flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="relative max-w-xs mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search student or class..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto rounded-xl border bg-card">
          <table className="w-full text-xs min-w-[800px]">
            <thead className="bg-muted/60 uppercase text-muted-foreground sticky top-0 backdrop-blur z-10">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Student Name</th>
                <th className="text-left px-4 py-3 font-semibold">Class</th>
                <th className="text-left px-4 py-3 font-semibold">Total Fee</th>
                <th className="text-left px-4 py-3 font-semibold">Paid Amount</th>
                <th className="text-left px-4 py-3 font-semibold">Pending Amount</th>
                <th className="text-left px-4 py-3 font-semibold">Installments</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-right px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-muted/30">
              {filtered.map((f) => {
                const finalFee = f.finalFee || (f.originalFee || f.amount || 8500) - (f.discountAmount || 0);
                const paid = f.paid || 0;
                const pending = Math.max(0, finalFee - paid);
                const totalInst = f.totalInstallments || 3;
                const paidInst = f.status === "Paid" ? totalInst : f.paidInstallments || (f.payments?.length || (paid > 0 ? 1 : 0));
                const pct = finalFee ? Math.min(100, Math.round((paid / finalFee) * 100)) : 0;

                return (
                  <tr key={f.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-800">{f.studentName}</td>
                    <td className="px-4 py-3">{f.className}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">₹{finalFee.toLocaleString()}</td>
                    <td className="px-4 py-3 font-semibold text-emerald-700">₹{paid.toLocaleString()}</td>
                    <td className="px-4 py-3 font-semibold text-rose-600">₹{pending.toLocaleString()}</td>
                    <td className="px-4 py-3 min-w-[130px]">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] shrink-0 font-medium">
                          {paidInst}/{totalInst} Inst
                        </Badge>
                        <Progress value={pct} className="h-1.5 flex-1" />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={f.status === "Paid" ? "bg-emerald-100 text-emerald-700" : f.status === "Partial" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}>
                        {f.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs px-2"
                        onClick={() => {
                          setActiveLedger(f);
                          setOpenModal(true);
                        }}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" /> View Details
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground text-xs">
                    No fee records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {activeLedger && (
        <Dialog open={openModal} onOpenChange={setOpenModal}>
          <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Fee Breakdown & History — {activeLedger.studentName}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 text-xs mt-2">
              <div className="rounded-xl bg-slate-50 border p-3 flex justify-between items-center">
                <div>
                  <div className="font-bold text-sm">{activeLedger.studentName}</div>
                  <div className="text-muted-foreground">Class: {activeLedger.className} · Adm No: {activeLedger.admissionNo || "ADM-1001"}</div>
                </div>
                <Badge className={activeLedger.status === "Paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>
                  {activeLedger.status}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg border p-2 bg-card">
                  <div className="text-muted-foreground text-[10px]">Total Fee</div>
                  <div className="font-bold text-sm text-slate-900">₹{(activeLedger.finalFee || activeLedger.amount || 8500).toLocaleString()}</div>
                </div>
                <div className="rounded-lg border p-2 bg-card">
                  <div className="text-muted-foreground text-[10px]">Total Paid</div>
                  <div className="font-bold text-sm text-emerald-700">₹{(activeLedger.paid || 0).toLocaleString()}</div>
                </div>
                <div className="rounded-lg border p-2 bg-card">
                  <div className="text-muted-foreground text-[10px]">Pending</div>
                  <div className="font-bold text-sm text-rose-600">₹{Math.max(0, (activeLedger.finalFee || activeLedger.amount || 8500) - (activeLedger.paid || 0)).toLocaleString()}</div>
                </div>
              </div>

              <div className="font-semibold text-slate-700 pt-1">Installment History</div>
              <div className="space-y-2">
                {(activeLedger.payments && activeLedger.payments.length > 0
                  ? activeLedger.payments
                  : [{ receiptNo: "SUN/26-27/301", amount: activeLedger.paid || 8500, method: "Cash", date: "2026-07-20", installmentNo: 1 }]
                ).map((p: any, i: number) => (
                  <div key={i} className="rounded-lg border p-2.5 flex justify-between items-center bg-emerald-50/50 border-emerald-200">
                    <div>
                      <div className="font-bold text-slate-800">Installment {p.installmentNo || i + 1}</div>
                      <div className="text-muted-foreground text-[11px]">Receipt: <span className="font-mono">{p.receiptNo}</span> · Mode: <b>{p.method}</b></div>
                      <div className="text-muted-foreground text-[11px]">Date: <b>{p.date}</b></div>
                    </div>
                    <div className="text-sm font-bold text-slate-900">₹{p.amount.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
