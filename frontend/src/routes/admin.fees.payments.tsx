import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader, StatusBadge } from "@/components/admin/page-primitives";
import { FilterBar, DataTable, TableRow, TableCell } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { fetchFees, recalculateFeeLedger, type FeeLedgerItem } from "@/lib/supabaseService";

export const Route = createFileRoute("/admin/fees/payments")({
  component: PaymentsPage,
  head: () => ({ meta: [{ title: "Student Fee Ledger — Sunshine ERP" }] }),
});

function PaymentsPage() {
  const [feeLedgers, setFeeLedgers] = useState<FeeLedgerItem[]>([]);
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchFees().then(({ data }) => {
      if (data && data.length > 0) {
        setFeeLedgers(data);
      }
    });
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const st = filterValues["Status"];
    return feeLedgers.filter((ledger) => {
      const matchSearch =
        !q ||
        ledger.studentName.toLowerCase().includes(q) ||
        (ledger.admissionNo && ledger.admissionNo.toLowerCase().includes(q)) ||
        ledger.className.toLowerCase().includes(q);
      const matchStatus = !st || st === "all" || ledger.status === st;
      return matchSearch && matchStatus;
    });
  }, [feeLedgers, search, filterValues]);

  const handleExportCSV = () => {
    if (filtered.length === 0) return;
    const headers = ["Student Name", "Admission No", "Class", "Total Fee", "Total Paid", "Remaining Balance", "Installments Used", "Payment Status", "Last Payment"];
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
        f.admissionNo || "ADM-1001",
        f.className,
        finalFee,
        paid,
        remaining,
        instCount,
        status,
        f.lastPaymentDate || "—",
      ];
    });
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `student_fee_ledger_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-1 min-h-0 flex-col w-full max-w-none">
      <PageHeader
        title="Student Fee Ledger"
        description="Read-only view of student fee ledgers, total paid amounts, remaining balances, and installment counts."
      />
      <div className="shrink-0">
        <FilterBar
          searchPlaceholder="Search student name, admission no., class..."
          filters={[
            { label: "Status", options: ["Paid", "Partial", "Pending"] },
          ]}
          search={search}
          onSearchChange={setSearch}
          filterValues={filterValues}
          onFilterChange={(l, v) => setFilterValues((f) => ({ ...f, [l]: v }))}
          onExport={handleExportCSV}
        />
      </div>
      <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden">
        <DataTable
          columns={["Student Name", "Admission No", "Class", "Total Fee", "Total Paid", "Remaining Balance", "Installments Used", "Status", "Last Payment"]}
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
                <TableCell className="font-mono text-xs text-muted-foreground">{f.admissionNo || "ADM-1001"}</TableCell>
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
                <TableCell className="text-xs text-muted-foreground">{f.lastPaymentDate || "—"}</TableCell>
              </TableRow>
            );
          })}
        </DataTable>
      </div>
    </div>
  );
}
