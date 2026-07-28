import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader, StatusBadge } from "@/components/admin/page-primitives";
import { FilterBar, DataTable, TableRow, TableCell } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { payments as mockPayments } from "@/lib/admin-mock-data";
import { fetchFees, type FeeLedgerItem } from "@/lib/supabaseService";

export const Route = createFileRoute("/admin/fees/payments")({
  component: PaymentsPage,
  head: () => ({ meta: [{ title: "Payments — Sunshine ERP" }] }),
});

function PaymentsPage() {
  const [paymentsList, setPaymentsList] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchFees().then(({ data }) => {
      if (data && data.length > 0) {
        const flattened: any[] = [];
        data.forEach((ledger: FeeLedgerItem) => {
          if (ledger.payments && ledger.payments.length > 0) {
            ledger.payments.forEach((p) => {
              flattened.push({
                id: p.id,
                receiptNo: p.receiptNo,
                studentName: ledger.studentName,
                admissionNo: ledger.admissionNo || "ADM-1001",
                className: ledger.className,
                amount: p.amount,
                method: p.method,
                date: p.date,
                status: "Success",
                installmentNo: p.installmentNo || 1,
                totalInstallments: ledger.totalInstallments || 3,
              });
            });
          } else {
            flattened.push({
              id: ledger.id,
              receiptNo: `SUN/26-27/${Math.floor(2000 + Math.random() * 8000)}`,
              studentName: ledger.studentName,
              admissionNo: ledger.admissionNo || "ADM-1001",
              className: ledger.className,
              amount: ledger.paid || 0,
              method: "Cash",
              date: ledger.dueDate || "2026-07-15",
              status: ledger.status === "Paid" ? "Success" : ledger.status === "Partial" ? "Partial" : "Pending",
              installmentNo: ledger.paidInstallments || 1,
              totalInstallments: ledger.totalInstallments || 3,
            });
          }
        });
        setPaymentsList(flattened);
      } else {
        setPaymentsList(mockPayments);
      }
    });
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const m = filterValues["Method"];
    const st = filterValues["Status"];
    return paymentsList.filter((p) => {
      if (q && !`${p.id} ${p.studentName} ${p.receiptNo || p.invoice}`.toLowerCase().includes(q)) return false;
      if (m && m !== "all" && p.method !== m) return false;
      if (st && st !== "all" && p.status !== st) return false;
      return true;
    });
  }, [paymentsList, search, filterValues]);

  const handleExportCSV = () => {
    if (filtered.length === 0) return;
    const headers = ["Receipt No", "Student Name", "Class", "Amount", "Method", "Date", "Status"];
    const rows = filtered.map(p => [p.receiptNo || p.id, p.studentName, p.className, p.amount, p.method, p.date, p.status]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `payments_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title="Payments & Fee Transactions"
        description="View payment receipts, installment transactions across every student and method."
      />
      <div className="shrink-0">
        <FilterBar
          searchPlaceholder="Search receipt no., student name, admission no..."
          filters={[
            { label: "Method", options: ["Cash", "UPI", "Bank Transfer", "Cheque"] },
            { label: "Status", options: ["Success", "Partial", "Pending"] },
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
          columns={["Receipt #", "Student", "Class", "Amount Paid", "Method", "Date", "Installment", "Status"]}
          total={filtered.length}
        >
          {filtered.map((p) => (
            <TableRow key={p.id} className="hover:bg-muted/30">
              <TableCell className="font-mono text-xs font-semibold text-slate-800">{p.receiptNo || p.id}</TableCell>
              <TableCell className="font-medium">{p.studentName}</TableCell>
              <TableCell>{p.className}</TableCell>
              <TableCell className="font-semibold text-emerald-700">₹{p.amount.toLocaleString()}</TableCell>
              <TableCell><Badge variant="outline">{p.method}</Badge></TableCell>
              <TableCell className="text-sm">{p.date}</TableCell>
              <TableCell>
                <Badge variant="secondary" className="text-[10px]">
                  Inst {p.installmentNo}/{p.totalInstallments}
                </Badge>
              </TableCell>
              <TableCell><StatusBadge status={p.status} /></TableCell>
            </TableRow>
          ))}
        </DataTable>
      </div>
    </div>
  );
}
