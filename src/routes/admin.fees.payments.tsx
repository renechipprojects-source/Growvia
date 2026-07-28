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
    const headers = ["Student Name", "Adm No", "Class", "Original Fee", "Discount", "Final Fee", "Paid", "Remaining", "Installments", "Status", "Last Payment"];
    const rows = filtered.map((f) => [
      f.studentName,
      f.admissionNo || "ADM-1001",
      f.className,
      f.originalFee || f.amount || 8500,
      f.discountAmount || 0,
      f.finalFee || f.amount || 8500,
      f.paid || 0,
      f.remainingAmount || 0,
      `${f.paidInstallments || 0}/${f.totalInstallments || 3}`,
      f.status,
      f.lastPaymentDate || "—",
    ]);
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
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title="Student Fee Ledger"
        description="Single-row student fee ledgers, discounts, installment progress, and remaining balances."
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
          columns={["Student Name", "Adm No", "Class", "Total Fee", "Discount", "Final Fee", "Total Paid", "Remaining", "Installments", "Status", "Last Payment"]}
          total={filtered.length}
        >
          {filtered.map((f) => {
            const origFee = f.originalFee || f.amount || 8500;
            const discAmt = f.discountAmount || 0;
            const finalFee = f.finalFee || origFee - discAmt;
            const paid = f.paid || 0;
            const remaining = Math.max(0, finalFee - paid);
            const instTotal = f.totalInstallments || 3;
            const instPaid = f.status === "Paid" ? instTotal : f.paidInstallments || (f.payments?.length || (paid > 0 ? 1 : 0));
            const pct = finalFee ? Math.min(100, Math.round((paid / finalFee) * 100)) : 0;

            return (
              <TableRow key={f.id} className="hover:bg-muted/30">
                <TableCell className="font-semibold text-slate-800">{f.studentName}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{f.admissionNo || "ADM-1001"}</TableCell>
                <TableCell>{f.className}</TableCell>
                <TableCell className="font-medium text-slate-700">₹{origFee.toLocaleString()}</TableCell>
                <TableCell className="text-amber-700 font-medium">{discAmt > 0 ? `-₹${discAmt.toLocaleString()}` : "—"}</TableCell>
                <TableCell className="font-bold text-slate-900">₹{finalFee.toLocaleString()}</TableCell>
                <TableCell className="font-semibold text-emerald-700">₹{paid.toLocaleString()}</TableCell>
                <TableCell className="font-semibold text-rose-600">₹{remaining.toLocaleString()}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 min-w-[120px]">
                    <Badge variant="outline" className="text-[10px] shrink-0 font-medium">
                      {instPaid}/{instTotal} Inst
                    </Badge>
                    <Progress value={pct} className="h-1.5 flex-1" />
                  </div>
                </TableCell>
                <TableCell><StatusBadge status={f.status} /></TableCell>
                <TableCell className="text-xs text-muted-foreground">{f.lastPaymentDate || "—"}</TableCell>
              </TableRow>
            );
          })}
        </DataTable>
      </div>
    </div>
  );
}
