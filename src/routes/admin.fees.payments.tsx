import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader, StatusBadge } from "@/components/admin/page-primitives";
import { FilterBar, DataTable, TableRow, TableCell } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";
import { payments as mockPayments } from "@/lib/admin-mock-data";
import { fetchFees } from "@/lib/supabaseService";

export const Route = createFileRoute("/admin/fees/payments")({
  component: PaymentsPage,
  head: () => ({ meta: [{ title: "Payments — Sunshine ERP" }] }),
});

function PaymentsPage() {
  const [paymentsList, setPaymentsList] = useState<any[]>(mockPayments);
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchFees().then(({ data, isFromSupabase }) => {
      if (isFromSupabase && data.length > 0) {
        const mapped = data.map((d: any) => ({
          id: d.id,
          studentName: d.studentName || d.student_name,
          invoice: `INV-${d.id}`,
          amount: Number(d.amount || 0),
          method: "UPI",
          date: d.due_date || new Date().toISOString().split("T")[0],
          status: d.status === "Paid" ? "Success" : d.status,
        }));
        setPaymentsList(mapped);
      }
    });
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const m = filterValues["Method"];
    const st = filterValues["Status"];
    return paymentsList.filter((p) => {
      if (q && !`${p.id} ${p.studentName} ${p.invoice}`.toLowerCase().includes(q)) return false;
      if (m && m !== "all" && p.method !== m) return false;
      if (st && st !== "all" && p.status !== st) return false;
      return true;
    });
  }, [paymentsList, search, filterValues]);

  const handleExportCSV = () => {
    if (filtered.length === 0) return;
    const headers = ["Payment ID", "Student Name", "Invoice", "Amount", "Method", "Date", "Status"];
    const rows = filtered.map(p => [p.id, p.studentName, p.invoice, p.amount, p.method, p.date, p.status]);
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
        title="Payments"
        description="View fee transactions across every student and payment method."
      />
      <div className="shrink-0">
        <FilterBar
          searchPlaceholder="Search invoice, student, ID..."
          filters={[
            { label: "Method", options: ["Cash", "UPI", "Card", "Bank Transfer"] },
            { label: "Status", options: ["Success", "Pending", "Failed"] },
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
          columns={["Payment ID", "Student", "Invoice", "Amount", "Method", "Date", "Status"]}
          total={filtered.length}
        >
          {filtered.map((p) => (
            <TableRow key={p.id} className="hover:bg-muted/30">
              <TableCell className="font-mono text-xs">{p.id}</TableCell>
              <TableCell className="font-medium">{p.studentName}</TableCell>
              <TableCell className="font-mono text-xs">{p.invoice}</TableCell>
              <TableCell className="font-semibold">₹{p.amount.toLocaleString()}</TableCell>
              <TableCell><Badge variant="outline">{p.method}</Badge></TableCell>
              <TableCell className="text-sm">{p.date}</TableCell>
              <TableCell><StatusBadge status={p.status} /></TableCell>
            </TableRow>
          ))}
        </DataTable>
      </div>
    </div>
  );
}
