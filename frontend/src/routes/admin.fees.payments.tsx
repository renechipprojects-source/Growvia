import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader, StatusBadge, StatCard } from "@/components/admin/page-primitives";
import { FilterBar, DataTable, TableRow, TableCell } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, CreditCard, Calendar, CheckCircle2 } from "lucide-react";
import { fetchMergedFeeLedgers, toCanonicalAdmissionNo, type FeeLedgerItem } from "@/lib/supabaseService";
import { useAutoRefresh } from "@/lib/autoRefreshContext";
import { PaymentDetailsModal } from "@/components/fees/PaymentDetailsModal";

export const Route = createFileRoute("/admin/fees/payments")({
  component: PaymentsPage,
  head: () => ({ meta: [{ title: "Student Fee Ledger — Sunshine Play School" }] }),
});

function PaymentsPage() {
  const [feeLedgers, setFeeLedgers] = useState<FeeLedgerItem[]>([]);
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [selectedLedger, setSelectedLedger] = useState<FeeLedgerItem | null>(null);

  const loadData = () => {
    fetchMergedFeeLedgers().then(({ data }) => {
      if (data && data.length > 0) {
        setFeeLedgers(data);
      }
    });
  };

  useAutoRefresh("fees", loadData);

  useEffect(() => {
    loadData();
  }, []);

  const todayStr = new Date().toISOString().split("T")[0];

  const todayPayments = useMemo(() => {
    let total = 0;
    feeLedgers.forEach((f) => {
      if (f.payments && f.payments.length > 0) {
        f.payments.forEach((p: any) => {
          if (p.date === todayStr || p.created_at?.startsWith(todayStr)) {
            total += Number(p.amount || 0);
          }
        });
      } else if (f.lastPaymentDate === todayStr) {
        total += Number(f.paid || 0);
      }
    });
    return total;
  }, [feeLedgers, todayStr]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const st = filterValues["Status"];
    const cls = filterValues["Class"];
    const sec = filterValues["Section"];
    return feeLedgers.filter((ledger) => {
      const matchSearch =
        !q ||
        ledger.studentName.toLowerCase().includes(q) ||
        (ledger.admissionNo && ledger.admissionNo.toLowerCase().includes(q)) ||
        ledger.className.toLowerCase().includes(q);
      const matchStatus = !st || st === "all" || ledger.status === st;
      const matchClass = !cls || cls === "all" || ledger.className?.toLowerCase() === cls.toLowerCase();
      const matchSection = !sec || sec === "all" || ledger.section?.toLowerCase() === sec.toLowerCase();
      return matchSearch && matchStatus && matchClass && matchSection;
    });
  }, [feeLedgers, search, filterValues]);

  const handleExportCSV = () => {
    if (filtered.length === 0) return;
    const headers = ["Student Name", "Admission No", "Class", "Total Fee", "Total Paid", "Remaining Balance", "Installments Used", "Payment Status"];
    const rows = filtered.map((f) => {
      const finalFee = f.finalFee || (f.originalFee || f.amount || 8500) - (f.discountAmount || 0);
      const paid = (f.payments && f.payments.length > 0)
        ? f.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0)
        : (f.paid || 0);
      const remaining = Math.max(0, finalFee - paid);
      const instCount = f.payments?.length || (paid > 0 ? 1 : 0);

      let status = "Unpaid";
      if (remaining === 0 && finalFee > 0) status = "Paid";
      else if (paid > 0) status = "Partially Paid";

      return [
        f.studentName,
        toCanonicalAdmissionNo(f.admissionNo, f.id),
        f.className,
        finalFee,
        paid,
        remaining,
        instCount,
        status,
      ];
    });
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `student_fee_ledger_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-1 min-h-0 flex-col w-full max-w-none gap-3">
      <PageHeader
        title="Student Fee Ledger & Today Payments"
        description="Live daily fee collection ledger, class/section filters, and installment breakdown."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Today's Total Collection" value={`₹${todayPayments.toLocaleString()}`} tone="success" icon={<CreditCard className="h-5 w-5" />} />
        <StatCard label="Total Students" value={feeLedgers.length} tone="info" icon={<CheckCircle2 className="h-5 w-5" />} />
        <StatCard label="Active Ledgers" value={filtered.length} icon={<Calendar className="h-5 w-5" />} />
        <StatCard label="Date" value={todayStr} tone="warning" icon={<Calendar className="h-5 w-5" />} />
      </div>

      <div className="shrink-0">
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

      <div className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden">
        <DataTable
          columns={["Student Name", "Admission No", "Class", "Total Fee", "Total Paid", "Remaining Balance", "Installments", "Status", "Action"]}
          total={filtered.length}
        >
          {filtered.map((f) => {
            const origFee = f.originalFee || f.amount || 8500;
            const discAmt = f.discountAmount || 0;
            const finalFee = f.finalFee || origFee - discAmt;
            const paid = (f.payments && f.payments.length > 0)
              ? f.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0)
              : (f.paid || 0);
            const remaining = Math.max(0, finalFee - paid);
            const instCount = f.payments?.length || (paid > 0 ? 1 : 0);

            let displayStatus = "Unpaid";
            if (remaining === 0 && finalFee > 0) displayStatus = "Paid";
            else if (paid > 0) displayStatus = "Partially Paid";

            return (
              <TableRow key={f.id} className="hover:bg-muted/30">
                <TableCell className="font-semibold text-slate-800">{f.studentName}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{toCanonicalAdmissionNo(f.admissionNo, f.id)}</TableCell>
                <TableCell>{f.className}</TableCell>
                <TableCell className="font-bold text-slate-900">₹{finalFee.toLocaleString()}</TableCell>
                <TableCell className="font-semibold text-emerald-700">₹{paid.toLocaleString()}</TableCell>
                <TableCell className="font-semibold text-rose-600">₹{remaining.toLocaleString()}</TableCell>
                <TableCell className="text-center font-semibold text-indigo-700">
                  <Badge variant="outline" className="text-xs px-2 py-0.5 rounded-full bg-slate-50">
                    {instCount} Txn{instCount === 1 ? "" : "s"}
                  </Badge>
                </TableCell>
                <TableCell><StatusBadge status={displayStatus} /></TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" className="rounded-xl h-8 px-2.5 text-xs" onClick={() => setSelectedLedger(f)}>
                    <Eye className="mr-1.5 h-3.5 w-3.5" /> View Details
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </DataTable>
      </div>

      <PaymentDetailsModal
        open={!!selectedLedger}
        onClose={() => setSelectedLedger(null)}
        ledger={selectedLedger}
      />
    </div>
  );
}
