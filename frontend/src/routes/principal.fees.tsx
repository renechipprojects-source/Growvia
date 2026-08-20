import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { PageHeader, StatCard, SectionCard } from "@/components/ui-blocks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchMergedFeeLedgers, type FeeLedgerItem } from "@/lib/supabaseService";
import { Search, Eye, Wallet, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { FilterBar } from "@/components/admin/data-table";

export const Route = createFileRoute("/principal/fees")({
  head: () => ({
    meta: [
      { title: "Fees Overview | Principal Portal" },
      { name: "description", content: "School-wide fee collection, ledgers, and installment status." },
    ],
  }),
  component: PrincipalFeesOverview,
});

function PrincipalFeesOverview() {
  const [feeRecords, setFeeRecords] = useState<FeeLedgerItem[]>([]);
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [activeLedger, setActiveLedger] = useState<FeeLedgerItem | null>(null);
  const [openModal, setOpenModal] = useState(false);

  const loadData = () => {
    fetchMergedFeeLedgers().then(({ data }) => {
      if (data && data.length > 0) setFeeRecords(data);
    });
  };

  useAutoRefresh("fees", loadData);

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const st = filterValues["Status"];
    const cls = filterValues["Class"];
    const sec = filterValues["Section"];

    return feeRecords.filter((ledger) => {
      const matchSearch =
        !q ||
        ledger.studentName.toLowerCase().includes(q) ||
        toCanonicalAdmissionNo(ledger.admissionNo, ledger.id).toLowerCase().includes(q) ||
        (ledger.className && ledger.className.toLowerCase().includes(q));
      const matchStatus = !st || st === "all" || ledger.status === st;
      const matchClass = !cls || cls === "all" || ledger.className?.toLowerCase() === cls.toLowerCase();
      const matchSection = !sec || sec === "all" || ledger.section?.toLowerCase() === sec.toLowerCase();
      return matchSearch && matchStatus && matchClass && matchSection;
    });
  }, [feeRecords, search, filterValues]);

  const handleExportCSV = () => {
    if (filtered.length === 0) return;
    const headers = ["Student Name", "Admission No", "Class", "Total Fee", "Total Paid", "Remaining Balance", "Payment Status"];
    const rows = filtered.map((f) => {
      const finalFee = f.finalFee || (f.originalFee || f.amount || 8500) - (f.discountAmount || 0);
      const paid = (f.payments && f.payments.length > 0)
        ? f.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0)
        : (f.paid || 0);
      const remaining = Math.max(0, finalFee - paid);
      let status = "Unpaid";
      if (remaining === 0 && finalFee > 0) status = "Paid";
      else if (paid > 0) status = "Partially Paid";
      return [f.studentName, toCanonicalAdmissionNo(f.admissionNo, f.id), f.className, finalFee, paid, remaining, status];
    });
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `student_fees_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalExpected = feeRecords.reduce((sum, f) => sum + (f.finalFee || f.originalFee || f.amount || 8500), 0);
  const totalPaid = feeRecords.reduce((sum, f) => sum + (f.paid || 0), 0);
  const totalPending = Math.max(0, totalExpected - totalPaid);
  const collectionPct = totalExpected > 0 ? Math.round((totalPaid / totalExpected) * 100) : 0;

  return (
    <div className="flex flex-1 min-h-0 flex-col w-full max-w-none space-y-4">
      <PageHeader
        title="Fees Overview"
        subtitle="School-wide fee collection, pending balances, installment progress, and filters."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total Expected Fees" value={`₹${totalExpected.toLocaleString()}`} icon={Wallet} gradient="from-purple-500 to-indigo-500" />
        <StatCard label="Total Collected" value={`₹${totalPaid.toLocaleString()}`} icon={CheckCircle} gradient="from-emerald-500 to-teal-500" />
        <StatCard label="Pending Balance" value={`₹${totalPending.toLocaleString()}`} icon={AlertTriangle} gradient="from-amber-500 to-orange-500" />
        <StatCard label="Collection Rate" value={`${collectionPct}%`} icon={Clock} gradient="from-sky-500 to-blue-500" />
      </div>

      <div className="card-elevated p-4 md:p-5 flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="shrink-0 mb-3">
          <FilterBar
            searchPlaceholder="Search student name, admission no., class..."
            filters={[
              { label: "Class", options: ["Playgroup", "Nursery", "LKG", "UKG", "Grade 1", "Grade 2"] },
              { label: "Section", options: ["A", "B", "C"] },
              { label: "Status", options: ["Paid", "Partial", "Pending"] },
            ]}
            search={search}
            onSearchChange={setSearch}
            filterValues={filterValues}
            onFilterChange={(l, v) => setFilterValues((f) => ({ ...f, [l]: v }))}
            onExport={handleExportCSV}
          />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto max-h-[calc(100vh-260px)] rounded-xl border bg-card">
          <table className="w-full text-xs min-w-[900px]">
            <thead className="bg-slate-100/95 uppercase text-muted-foreground sticky top-0 backdrop-blur-md z-20">
              <tr>
                <th className="sticky top-0 z-20 bg-slate-100/95 backdrop-blur-md text-left px-4 py-3 font-semibold">Student Name</th>
                <th className="sticky top-0 z-20 bg-slate-100/95 backdrop-blur-md text-left px-4 py-3 font-semibold">Admission No</th>
                <th className="sticky top-0 z-20 bg-slate-100/95 backdrop-blur-md text-left px-4 py-3 font-semibold">Class</th>
                <th className="sticky top-0 z-20 bg-slate-100/95 backdrop-blur-md text-left px-4 py-3 font-semibold">Total Fee</th>
                <th className="sticky top-0 z-20 bg-slate-100/95 backdrop-blur-md text-left px-4 py-3 font-semibold">Total Paid</th>
                <th className="sticky top-0 z-20 bg-slate-100/95 backdrop-blur-md text-left px-4 py-3 font-semibold">Remaining Balance</th>
                <th className="sticky top-0 z-20 bg-slate-100/95 backdrop-blur-md text-center px-4 py-3 font-semibold">Installments Used</th>
                <th className="sticky top-0 z-20 bg-slate-100/95 backdrop-blur-md text-left px-4 py-3 font-semibold">Status</th>
                <th className="sticky top-0 z-20 bg-slate-100/95 backdrop-blur-md text-right px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-muted/30">
              {filtered.map((f) => {
                const finalFee = f.finalFee || (f.originalFee || f.amount || 8500) - (f.discountAmount || 0);
                const paid = (f.payments && f.payments.length > 0)
                  ? f.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0)
                  : (f.paid || 0);
                const remaining = Math.max(0, finalFee - paid);
                const instCount = f.payments?.length || (paid > 0 ? 1 : 0);

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
                  <tr key={f.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-800">{f.studentName}</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">{toCanonicalAdmissionNo(f.admissionNo, f.id)}</td>
                    <td className="px-4 py-3">{f.className}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">₹{finalFee.toLocaleString()}</td>
                    <td className="px-4 py-3 font-semibold text-emerald-700">₹{paid.toLocaleString()}</td>
                    <td className="px-4 py-3 font-semibold text-rose-600">₹{remaining.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant="outline" className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-50">
                        {instCount} Txn{instCount === 1 ? "" : "s"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={cn("text-[11px] font-semibold border", statusStyle)}>
                        {displayStatus}
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
                  <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground text-xs">
                    No fee records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <PaymentDetailsModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        ledger={activeLedger}
      />
    </div>
  );
}
